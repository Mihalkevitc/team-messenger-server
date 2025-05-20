const { Server } = require('socket.io');
const { Chat, Message, User } = require('../models');
const jwt = require('jsonwebtoken');

module.exports = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"]
    }
  });

  // Middleware для аутентификации
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      
      if (!user) return next(new Error('Authentication error'));
      
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Пользователь ${socket.user.id} подключен (WebSocket)`);

    // Подписка на комнаты чатов, где состоит пользователь
    socket.on('subscribe', async (chatId) => {
      const chat = await Chat.findByPk(chatId, {
        include: [{
          model: User,
          as: 'participants',
          where: { id: socket.user.id },
          required: true
        }]
      });

      if (chat) {
        socket.join(`chat_${chatId}`);
        console.log(`\n\nПользователь ${socket.user.id} присоединился к чату ${chatId}`);
      }
    });

    // Обработка новых сообщений
    socket.on('message', async ({ chatId, content }) => {
      console.log('\n\nДанные для создания сообщения:', {
        content,
        chatId,
        senderId: socket.user.id // лог для проверки
    });
      try {
        // Создаем сообщение в БД
        const message = await Message.create({
          content,
          chatId,
          senderId: socket.user.id
        });

        console.log('\n\nСообщение успешно создано:', message);

        // Получаем полные данные сообщения с информацией об отправителе
        const fullMessage = await Message.findByPk(message.id, {
          include: [{
            model: User,
            as: 'sender'
          }]
        });

        // Отправляем сообщение всем подписанным на этот чат
        io.to(`chat_${chatId}`).emit('message', fullMessage);

        // Добавляем новое событие для обновления списка чатов (да, это как бы для всех пользователей сразу, не оч хорошо, но пока так)
        io.emit('chatUpdated', { chatId });

      } catch (err) {
        console.error('Error sending message:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.user.id} disconnected`);
    });
  });

  return io;
};