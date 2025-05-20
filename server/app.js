require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const teamRoutes = require('./routes/team.routes');
const userRoutes = require('./routes/users');

// Создаем экземпляр приложения
const app = express();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // разрешаем все origin'ы, включая undefined (например, postman, curl и т.д.)
    callback(null, true);
  },
  credentials: true
}));
// app.use(cors({
//   origin: 'http://localhost:3000',
//   credentials: true
// }));
app.use(express.json());

// Тестовый роут
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Подключение маршрутов
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/users', userRoutes);

// Подключение к PostgreSQL
sequelize.authenticate()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('PostgreSQL connection error:', err));

// Синхронизация моделей с БД
sequelize.sync({ alter: true })
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Database sync error:', err));

// Экспортируем app для использования в server.js
module.exports = app;