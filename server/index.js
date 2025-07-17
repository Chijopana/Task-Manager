// server/index.js
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Servidor funcionando 🚀')
})

const PORT = process.env.PORT || 5000

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`))
}).catch(err => console.error('Error conectando a MongoDB', err))

const userRoutes = require('./routes/userRoutes')

app.use('/api/users', userRoutes)

const taskRoutes = require('./routes/taskRoutes')
app.use('/api/tasks', taskRoutes)
