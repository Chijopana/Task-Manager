# Task Manager

Gestor de tareas full-stack en TypeScript. Cada usuario ve, crea y edita
únicamente sus propias tareas, con fechas de vencimiento, prioridades y
etiquetas.

**Demo:** https://task-manager-front-five.vercel.app

> ⚠️ La API está en un plan gratuito y el servicio se duerme. La primera
> petición puede tardar hasta 30 segundos; la aplicación lo dice en pantalla en
> lugar de dejar una rueda girando.

> 🔐 Hubo credenciales en el historial de Git. Están rotadas desde el 6 de
> septiembre de 2026; el detalle está en [SECURITY.md](SECURITY.md).

---

## Stack

| Capa       | Tecnología                                                             |
| ---------- | ---------------------------------------------------------------------- |
| Cliente    | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, axios        |
| Servidor   | Node.js, Express 5, TypeScript, MongoDB con Mongoose, JWT, bcrypt       |
| Compartido | Esquemas Zod y tipos usados por ambos lados                            |
| Tests      | Vitest + Supertest + MongoDB en memoria, Testing Library en el cliente |

## Qué demuestra el proyecto

- **Un contrato, no dos.** Los límites de validación viven una sola vez, en
  `shared/`. El formulario, el controlador y el esquema de Mongoose leen la misma
  constante, así que no pueden discrepar.
- **Autorización por recurso.** Cada consulta filtra por el usuario del token:
  una tarea ajena no se encuentra, en lugar de encontrarse y comprobarse después.
- **Sesiones revocables.** Un JWT vale hasta que caduca; un contador de versión
  por usuario permite cerrar sesión en todos los dispositivos de verdad.
- **Interfaz optimista.** Marcar una tarea se refleja al instante y se revierte
  si el servidor falla, en lugar de bloquear el botón hasta que responda.
- **82 tests** que cubren, entre otras cosas, que no se puede robar la tarea de
  otro, que el login no delata qué cuentas existen y que un override de Tailwind
  hace lo que dice.

## Estructura

Monorepo con workspaces de npm:

```
shared/          # Esquemas Zod, tipos y constantes compartidas
├── constants.ts #   Límites que cliente y servidor deben compartir
├── date.ts      #   Fechas como YYYY-MM-DD, sin husos horarios
├── auth.ts      #   Esquemas de registro y login
└── task.ts      #   Esquemas de tarea, filtros y consulta

server/src/
├── app.ts              # construye la app Express (sin abrir puerto: testeable)
├── index.ts            # conecta a Mongo, sincroniza índices y escucha
├── config/env.ts       # valida la configuración con Zod al arrancar
├── controllers/        # lógica de auth y tareas
├── middleware/         # JWT, límites de peticiones y manejo de errores
├── models/             # esquemas de Mongoose con sus índices
└── routes/

client/src/
├── lib/          # axios, sesión y unión de clases
├── hooks/        # useTasks (estado optimista), useTheme, useAuth
├── context/      # sesión y reacción al 401
├── services/     # llamadas tipadas a la API
├── pages/        # login/registro y pantalla principal
└── components/   # gestor de tareas y primitivas de interfaz
```

`shared/` no es un truco: el cliente importa de `@task-manager/shared/pure`,
una entrada sin Zod, para no mandar el validador entero al navegador. Los tipos
se importan de la entrada normal y desaparecen al compilar.

## Cómo levantarlo

Necesitas Node 20+.

```bash
npm install                 # instala los tres workspaces
```

### Con MongoDB en memoria (sin configurar nada)

```bash
npm run dev:memory          # API en :5000 y cliente en :5173, a la vez
```

Los datos se pierden al cerrar. Para levantar solo una parte:
`npm run dev:server` o `npm run dev:client`.

### Contra una MongoDB real

```bash
cp server/.env.example server/.env    # rellena MONGO_URI y JWT_SECRET
cp client/.env.example client/.env    # VITE_API_URL=http://localhost:5000
npm run dev
```

Genera un `JWT_SECRET` decente con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Comprobaciones

```bash
npm run typecheck    # tsc en los tres workspaces
npm run lint
npm test             # 54 tests de servidor + 28 de cliente
npm run build
```

Los cuatro se ejecutan en cada push desde
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## API

Todas las rutas de tareas requieren `Authorization: Bearer <token>`.

| Método   | Ruta                     | Descripción                                  |
| -------- | ------------------------ | -------------------------------------------- |
| `POST`   | `/api/users/register`    | Crea una cuenta y devuelve un token          |
| `POST`   | `/api/users/login`       | Inicia sesión y devuelve un token            |
| `GET`    | `/api/users/me`          | Datos del usuario autenticado                |
| `POST`   | `/api/users/logout-all`  | Revoca todos los tokens de la cuenta         |
| `GET`    | `/api/tasks`             | Lista con filtros, orden y paginación         |
| `POST`   | `/api/tasks`             | Crea una tarea                               |
| `PATCH`  | `/api/tasks/:id`         | Cambia título, estado, fecha, prioridad o etiquetas |
| `DELETE` | `/api/tasks/:id`         | Elimina una tarea                            |
| `DELETE` | `/api/tasks/completed`   | Elimina todas las completadas                |
| `GET`    | `/api/health`            | Estado del servicio y de la conexión         |

### Parámetros de `GET /api/tasks`

| Parámetro  | Valores                                          | Por defecto |
| ---------- | ------------------------------------------------ | ----------- |
| `status`   | `all`, `pending`, `completed`                    | `all`       |
| `due`      | `any`, `overdue`, `today`, `week`, `none`        | `any`       |
| `today`    | `AAAA-MM-DD`, el día del cliente                 | —           |
| `tag`      | una etiqueta                                     | —           |
| `priority` | `low`, `medium`, `high`                          | —           |
| `search`   | texto a buscar en el título                      | —           |
| `sort`     | `created`, `due`, `priority`, `title`            | `created`   |
| `order`    | `asc`, `desc`                                    | `desc`      |
| `page`     | número de página                                 | `1`         |
| `limit`    | tamaño de página (máx. 100)                      | `50`        |

La respuesta trae los contadores y el vocabulario de etiquetas del conjunto
completo, no solo de la página devuelta, para que los filtros puedan mostrar
cuántas tareas hay detrás de cada uno.

**`today` lo manda el cliente a propósito.** El servidor no sabe en qué huso
horario está el usuario, y «vence hoy» solo tiene sentido contra el calendario
de quien mira la pantalla. Por lo mismo, las fechas de vencimiento se guardan
como `AAAA-MM-DD` y no como instantes.

## Variables de entorno

**`server/.env`**

| Variable         | Obligatoria | Descripción                                        |
| ---------------- | ----------- | -------------------------------------------------- |
| `MONGO_URI`      | sí          | Cadena de conexión a MongoDB                       |
| `JWT_SECRET`     | sí          | Clave de firma. 32+ caracteres, exigido en producción |
| `JWT_EXPIRES_IN` | no          | Duración del token (`2h` por defecto)              |
| `PORT`           | no          | Puerto del servidor (`5000`)                       |
| `CORS_ORIGINS`   | no          | Orígenes permitidos, separados por comas           |
| `BCRYPT_ROUNDS`  | no          | Coste de bcrypt (`12`)                             |
| `TRUST_PROXY`    | no          | Saltos de proxy de confianza (`1`)                 |

**`client/.env`**

| Variable       | Descripción                            |
| -------------- | -------------------------------------- |
| `VITE_API_URL` | URL base de la API, sin barra ni ruta   |

## Despliegue

Las dos configuraciones están en el repositorio, así que los servicios se
reconstruyen igual desde cero sin depender de ajustes hechos a mano:

- **API en Render** — [`render.yaml`](render.yaml)
- **Cliente en Vercel** — [`vercel.json`](vercel.json), con reescrituras para el
  router y las cabeceras de seguridad (CSP incluida)

## Autor

Jose Blondel — [joseblondel.dev](https://www.joseblondel.dev) ·
[GitHub](https://github.com/Chijopana) ·
[LinkedIn](https://www.linkedin.com/in/jose-manuel-blondel-moya/)
