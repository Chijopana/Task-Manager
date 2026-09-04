# Task Manager — MERN

Gestor de tareas full-stack con autenticación JWT: cada usuario ve, crea y edita
únicamente sus propias tareas.

**Demo:** https://task-manager-front-five.vercel.app

> ⚠️ La API está en un plan gratuito y puede tardar unos segundos en despertar
> en la primera petición.

---

## Stack

**Cliente** — React 19, Vite, Tailwind CSS v4, React Router, Framer Motion, axios
**Servidor** — Node.js, Express 5, MongoDB con Mongoose, JWT, bcrypt, Helmet
**Tests** — runner nativo de Node (`node:test`) + Supertest + MongoDB en memoria

## Qué demuestra este proyecto

- **Autenticación real**: registro y login con contraseñas hasheadas con bcrypt y
  sesiones por JWT con expiración.
- **Autorización por recurso**: cada consulta filtra por el usuario del token, así
  que nadie puede leer ni modificar tareas ajenas.
- **API defensiva**: validación en el servidor, lista blanca de campos
  actualizables, límite de intentos de login, CORS restringido y manejo central
  de errores.
- **Tests de integración** que cubren precisamente esos casos.

## Estructura

```
server/
├── app.js              # construye la app Express (sin abrir puerto: testeable)
├── index.js            # conecta a Mongo, escucha y cierra ordenadamente
├── config/env.js       # valida las variables de entorno al arrancar
├── controllers/        # lógica de auth y tareas
├── middleware/         # verificación de JWT y manejo de errores
├── models/             # esquemas de Mongoose
├── routes/             # rutas + rate limiting
├── scripts/            # utilidad para desarrollar sin Atlas
└── tests/              # tests de integración de la API

client/
├── src/lib/            # instancia de axios (interceptores) y sesión
├── src/hooks/          # tema claro/oscuro
├── src/pages/          # login/registro y pantalla principal
├── src/components/     # gestor de tareas y primitivas de UI
└── src/services/       # llamadas a la API de tareas
```

## Cómo levantarlo

Necesitas Node 18+ y, opcionalmente, una base de datos MongoDB.

### 1. Servidor

```bash
cd server
npm install
cp .env.example .env      # rellena MONGO_URI y JWT_SECRET
npm run dev
```

Genera un `JWT_SECRET` decente con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**¿Sin MongoDB a mano?** Hay un modo que arranca una base de datos en memoria:

```bash
npm run dev:memory        # los datos se pierden al cerrar
```

### 2. Cliente

```bash
cd client
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:5000
npm run dev
```

## Tests

```bash
cd server
npm test
```

15 tests de integración que levantan la API contra una MongoDB en memoria y
comprueban, entre otras cosas, que no se puede editar ni robar la tarea de otro
usuario, que un id inválido responde 400 en vez de reventar, y que el hash de la
contraseña nunca sale en una respuesta.

## API

Todas las rutas de tareas requieren la cabecera `Authorization: Bearer <token>`.

| Método   | Ruta                  | Descripción                          |
| -------- | --------------------- | ------------------------------------ |
| `POST`   | `/api/users/register` | Crea una cuenta y devuelve un token  |
| `POST`   | `/api/users/login`    | Inicia sesión y devuelve un token    |
| `GET`    | `/api/users/me`       | Datos del usuario autenticado        |
| `GET`    | `/api/tasks`          | Lista las tareas del usuario         |
| `POST`   | `/api/tasks`          | Crea una tarea                       |
| `PUT`    | `/api/tasks/:id`      | Edita el título o el estado          |
| `DELETE` | `/api/tasks/:id`      | Elimina una tarea                    |
| `GET`    | `/api/health`         | Estado del servicio y de la conexión |

## Variables de entorno

**server/.env**

| Variable         | Obligatoria | Descripción                                   |
| ---------------- | ----------- | --------------------------------------------- |
| `MONGO_URI`      | sí          | Cadena de conexión a MongoDB                  |
| `JWT_SECRET`     | sí          | Clave para firmar los tokens (32+ caracteres) |
| `JWT_EXPIRES_IN` | no          | Duración del token (`1d` por defecto)         |
| `PORT`           | no          | Puerto del servidor (`5000` por defecto)      |
| `CORS_ORIGINS`   | no          | Orígenes permitidos, separados por comas      |

**client/.env**

| Variable       | Descripción                          |
| -------------- | ------------------------------------ |
| `VITE_API_URL` | URL base de la API, sin barra ni ruta |

## Autor

Jose Blondel — [joseblondel.dev](https://www.joseblondel.dev) ·
[GitHub](https://github.com/Chijopana) ·
[LinkedIn](https://www.linkedin.com/in/jose-manuel-blondel-moya/)
