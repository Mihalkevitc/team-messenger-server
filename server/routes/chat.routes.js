// server/routes/chat.routes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const messageController = require('../controllers/message.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Все маршруты чатов требуют аутентификации
router.use(authMiddleware);

// Создание нового чата
router.post('/', chatController.createChat);

// Получение списка чатов пользователя
router.get('/', chatController.getChats); // Express самостоятельно передаёт параметры (req, res) в метод getChats и вывзывает его

// Получение информации о сообщениях чата
router.get('/:chatId/messages', messageController.getChatMessages);

router.get('/:chatId', authMiddleware, chatController.getChatById);
router.delete('/:chatId', authMiddleware, chatController.deleteChat);
//router.post('/:chatId/participants', authMiddleware, chatController.addParticipant);
router.get('/:chatId/participants', authMiddleware, chatController.getChatParticipants);
//router.post('/:chatId/messages', authMiddleware, chatController.sendMessage);


module.exports = router;