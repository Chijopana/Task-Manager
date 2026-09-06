# Seguridad

## Credenciales filtradas: rotadas el 6 de septiembre de 2026

Un archivo `.env` con credenciales reales estuvo versionado y **sigue siendo
recuperable en el historial** de los repositorios de abajo. Borrarlo del árbol de
trabajo no lo borra del historial, así que lo único que cierra el agujero de
verdad es rotar lo filtrado. Eso ya está hecho:

| Qué                                     | Estado                                                        |
| ---------------------------------------- | ------------------------------------------------------------- |
| Contraseña del usuario de MongoDB Atlas  | Rotada el 2026-09-06                                          |
| `JWT_SECRET`                             | Regenerado por Render al crear el servicio (`generateValue`)  |
| `.env` en el árbol de trabajo            | Fuera del repositorio y cubierto por `.gitignore`             |

Regenerar el `JWT_SECRET` invalida todas las sesiones firmadas con el anterior,
que es justo lo que se busca.

Dónde quedó el archivo, para que conste:

| Repositorio                                          | Commits afectados      | Qué contenía                 |
| ---------------------------------------------------- | ---------------------- | ------------------------------ |
| este monorepo (`server/.env`)                        | `55e4f8c`, `b781b2c`   | `MONGO_URI` local, `JWT_SECRET`|
| `Chijopana/task-manager-backend` (`.env`)            | `bdc91aa`, `f7b605a`   | `MONGO_URI` de Atlas, `JWT_SECRET` |
| `Chijopana/task-manager-front` (`.env`)              | `c815d5c`              | `VITE_API_URL` (bajo riesgo)   |

El único que llegó a exponer la cadena de conexión de Atlas fue
`task-manager-backend`; en este monorepo el `.env` versionado apuntaba a
`mongodb://localhost`. Las credenciales de ambos están ya invalidadas.

### Lo que sigue pendiente

1. **Restringir la lista de IPs en Atlas.** Está en `0.0.0.0/0` porque Render no
   da IPs de salida fijas en plan gratuito. Es una concesión conocida, no un
   descuido: con la contraseña rotada, el riesgo es aceptable para este
   proyecto, pero conviene estrecharlo si alguna vez pasa a un plan de pago.
2. **Archivar `task-manager-backend` y `task-manager-front`.** Ya no se
   despliegan desde ellos; el monorepo `Task-Manager` es la única fuente.
3. **Opcional: limpiar el historial.** No es urgente, porque lo filtrado ya no
   sirve, y los clones existentes conservarían el archivo de todos modos:

   ```bash
   git filter-repo --path server/.env --path .env --invert-paths
   git push --force --all
   ```

---

## Decisiones tomadas y por qué

### El token vive en `localStorage`, no en una cookie `httpOnly`

Una cookie `httpOnly` protegería el token de un XSS, y es lo que suele
recomendarse. Aquí no se usa por una razón concreta: el cliente está en
`vercel.app` y la API en `onrender.com`, dominios registrables distintos. Una
cookie entre ellos necesita `SameSite=None; Secure`, y los navegadores que
bloquean cookies de terceros —Safari con ITP, y Chrome según configuración— la
descartarían, dejando la aplicación sin sesión.

Lo que sí se hace para acotar el riesgo:

- **Tokens cortos**: `JWT_EXPIRES_IN=2h` en lugar de 24 h.
- **Revocación real**: cada usuario tiene un `tokenVersion`. `POST
  /api/users/logout-all` lo incrementa y todos los tokens firmados antes dejan
  de pasar la verificación. Sin esto un JWT robado vale hasta que caduque.
- **CSP estricta** en el cliente (`vercel.json`): `script-src 'self'`, sin
  scripts en línea. Es la defensa que hace improbable el XSS de partida.

Unificar cliente y API bajo un mismo dominio permitiría pasar a cookies
`httpOnly` sin este inconveniente.

> `connect-src` está en `'self' https:` para no romper el despliegue si cambia
> la URL de la API. Conviene estrecharlo al origen concreto del backend.

### Enumeración de cuentas

`POST /api/users/login` devuelve el mismo `401` y el mismo texto exista el
usuario o no. Además **compara siempre contra un hash**, incluso cuando no hay
usuario: sin eso, el camino «no existe» respondía en 3 ms frente a los ~250 ms
del camino normal, y esa diferencia bastaba para recorrer una lista de nombres.
La longitud mínima tampoco se valida al entrar, para no revelar la política.

### Límites

| Qué                          | Límite                        |
| ---------------------------- | ----------------------------- |
| Registro y login             | 20 por IP cada 15 min         |
| Resto de `/api`              | 300 por IP cada 15 min        |
| Tareas por cuenta            | 500                           |
| Cuerpo de la petición        | 10 KB                         |
| Coste de bcrypt              | 12 rondas                     |

El limitador se configura al construir la app (`createApp({ rateLimit })`), no
leyendo `NODE_ENV`: así una variable mal puesta en producción no puede apagarlo
sin que nadie se entere.

### Qué no cubre este proyecto

- El limitador guarda el estado en memoria: con varias instancias cada una
  lleva su cuenta. Para escalar haría falta Redis.
- No hay verificación de correo ni recuperación de contraseña.
- No hay auditoría de accesos.

## Reportar un problema

Abre una incidencia en el repositorio o escribe a través de
[joseblondel.dev](https://www.joseblondel.dev).
