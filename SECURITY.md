# Seguridad

## ⚠️ Pendiente y urgente: rotar las credenciales filtradas

Un archivo `.env` con credenciales reales se subió a Git y **sigue siendo
recuperable en el historial de tres repositorios**. Eliminarlo del árbol de
trabajo, como ya se hizo, no lo borra del historial ni revoca nada.

| Repositorio                                          | Commits afectados      | Qué contiene                   |
| ---------------------------------------------------- | ---------------------- | ------------------------------ |
| este monorepo (`server/.env`)                        | `55e4f8c`, `b781b2c`   | `MONGO_URI`, `JWT_SECRET`      |
| `Chijopana/task-manager-backend` (`.env`)            | `bdc91aa`, `f7b605a`   | `MONGO_URI`, `JWT_SECRET`      |
| `Chijopana/task-manager-front` (`.env`)              | `c815d5c`              | `VITE_API_URL` (bajo riesgo)   |

Cualquiera con acceso de lectura recupera el contenido con un comando:

```bash
git show 55e4f8c:server/.env
```

Si alguno de esos repositorios es público, hay que dar las credenciales por
comprometidas: existen bots que recorren GitHub buscando cadenas de conexión de
MongoDB Atlas de forma continua, y el tiempo entre publicación y primer intento
de acceso se mide en minutos.

### Qué hacer, en este orden

1. **Rotar el usuario de MongoDB Atlas.** Cambiar su contraseña, o —mejor—
   borrar ese usuario de base de datos y crear otro con un nombre distinto.
2. **Revisar la lista de IPs permitidas en Atlas.** Si está en `0.0.0.0/0`, la
   cadena filtrada es acceso directo a los datos desde cualquier sitio.
   Restringirla a las IPs de salida de Render.
3. **Generar un `JWT_SECRET` nuevo** y ponerlo en Render:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   Invalida todas las sesiones abiertas, que es justo lo que se busca. Con
   `render.yaml` se puede dejar que Render lo genere él (`generateValue: true`).
4. **Solo después**, si se quiere limpiar el historial:

   ```bash
   git filter-repo --path server/.env --path .env --invert-paths
   git push --force --all
   ```

   Es opcional y secundario. Los clones que ya existan seguirán conteniendo el
   archivo, así que la rotación es lo único que de verdad cierra el agujero.

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
