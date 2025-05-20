require('dotenv').config();
const http = require('http');
const app = require('./app'); // app.js с маршрутами

// Создаём HTTP-сервер на базе Express
const server = http.createServer(app);

// Подключение WebSocket
require('./websocket/chat.server')(server);

// Запуск сервера
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
