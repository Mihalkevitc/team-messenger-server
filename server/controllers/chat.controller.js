// server/controllers/chat.controller.js
const { Chat, User, ChatParticipant, Message, sequelize } = require('../models');

exports.createChat = async (req, res) => {
  try {
    const { name, participantId, isTeamChat = false, teamId = null } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Название чата обязательно' });
    }

    const transaction = await sequelize.transaction();

    try {
      // Создаем чат
      const chat = await Chat.create({
        name,
        isTeamChat,
        teamId
      }, { transaction });

      // Добавляем создателя чата
      await ChatParticipant.create({
        userId,
        chatId: chat.id
      }, { transaction });

      console.log('\n\nСоздан чат:', chat);
      console.log('Создатель чата:', userId);
      console.log('Участник:', participantId);

      // Если указан участник, добавляем его в чат
      if (participantId) {
        // Проверяем, существует ли пользователь
        const participant = await User.findByPk(participantId, { transaction });
        if (!participant) {
          await transaction.rollback();
          return res.status(404).json({ error: 'Участник не найден' });
        }

        // Добавляем участника в чат
        await ChatParticipant.create({
          userId: participantId,
          chatId: chat.id
        }, { transaction });

        console.log('\nДобавлен участник:', participantId);

      }

      await transaction.commit();
      res.status(201).json(chat);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при создании чата:', error);
    res.status(500).json({ error: 'Не удалось создать чат' });
  }
};

exports.getChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Сначала находим все чаты пользователя
    const userChats = await Chat.findAll({
      include: [{
        model: User,
        as: 'participants',
        where: { id: userId },
        attributes: [],
        through: { attributes: [] }
      }],
      attributes: ['id'] // Получаем только id чатов
    });

    // Получаем полную информацию по найденным чатам
    const chats = await Chat.findAll({
      where: {
        id: userChats.map(chat => chat.id)
      },
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          through: { attributes: [] }
        },
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'content', 'createdAt', 'senderId'],
          include: {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName']
          }
        }
      ]
    });

    // Сортировка и форматирование
    chats.sort((a, b) => {
      const dateA = a.messages[0]?.createdAt || 0;
      const dateB = b.messages[0]?.createdAt || 0;
      return new Date(dateB) - new Date(dateA);
    });

    const formattedChats = chats.map(chat => ({
      id: chat.id,
      name: chat.name,
      isTeamChat: chat.isTeamChat,
      teamId: chat.teamId,
      participants: chat.participants,
      lastMessage: chat.messages[0] ? {
        text: chat.messages[0].content,
        sender: chat.messages[0].sender,
        createdAt: chat.messages[0].createdAt
      } : null,
      unreadCount: 0
    }));

    res.json(formattedChats);
  } catch (error) {
    console.error('Ошибка при получении чатов:', error);
    res.status(500).json({ error: 'Не удалось получить список чатов' });
  }
};
// Разные параметры req
// app.get('/api/chats/:chatId', (req, res) => {
//   console.log('Метод:', req.method); // GET
//   console.log('Путь:', req.path); // /api/chats/123
//   console.log('Параметры пути:', req.params.chatId); // 123
//   console.log('Query-параметры:', req.query); // например { page: '2' }
//   console.log('Заголовки:', req.headers.authorization); // Bearer token
// });

// Получение информации о конкретном чате
exports.getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Проверяем, является ли пользователь участником чата
    const participant = await ChatParticipant.findOne({
      where: {
        chatId,
        userId
      }
    });

    if (!participant) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const chat = await Chat.findByPk(chatId, {
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          through: { attributes: [] }
        },
        {
          model: Message,
          as: 'messages',
          order: [['createdAt', 'DESC']],
          limit: 20,
          include: {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName']
          }
        }
      ]
    });

    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    res.json(chat);
  } catch (error) {
    console.error('Ошибка при получении чата:', error);
    res.status(500).json({ error: 'Не удалось получить информацию о чате' });
  }
};

// Удаление чата
exports.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const transaction = await sequelize.transaction();

    try {
      // Проверяем, является ли пользователь участником чата
      const chatParticipant = await ChatParticipant.findOne({
        where: {
          chatId,
          userId
        },
        transaction
      });

      if (!chatParticipant) {
        await transaction.rollback();
        return res.status(403).json({ error: 'У вас нет прав для удаления этого чата' });
      }

      // Альтернативный вариант - проверка, что пользователь первый участник (создатель)
      // const firstParticipant = await ChatParticipant.findOne({
      //   where: { chatId },
      //   order: [['createdAt', 'ASC']],
      //   transaction
      // });
      // 
      // if (!firstParticipant || firstParticipant.userId !== userId) {
      //   await transaction.rollback();
      //   return res.status(403).json({ error: 'Только создатель чата может его удалить' });
      // }

      // Удаляем все сообщения чата
      await Message.destroy({
        where: { chatId },
        transaction
      });

      // Удаляем всех участников
      await ChatParticipant.destroy({
        where: { chatId },
        transaction
      });

      // Удаляем сам чат
      await Chat.destroy({
        where: { id: chatId },
        transaction
      });

      await transaction.commit();
      res.json({ message: 'Чат успешно удален' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при удалении чата:', error);
    res.status(500).json({ error: 'Не удалось удалить чат' });
  }
};

// // Добавление участника в чат
// exports.addParticipant = async (req, res) => {
//   try {
//     const { chatId } = req.params;
//     const { participantId } = req.body;
//     const userId = req.user.id;

//     // Проверяем, является ли пользователь участником чата
//     const isParticipant = await ChatParticipant.findOne({
//       where: {
//         chatId,
//         userId
//       }
//     });

//     if (!isParticipant) {
//       return res.status(403).json({ error: 'Доступ запрещен' });
//     }

//     // Проверяем, существует ли пользователь
//     const participant = await User.findByPk(participantId);
//     if (!participant) {
//       return res.status(404).json({ error: 'Пользователь не найден' });
//     }

//     // Проверяем, не является ли пользователь уже участником
//     const existingParticipant = await ChatParticipant.findOne({
//       where: {
//         chatId,
//         userId: participantId
//       }
//     });

//     if (existingParticipant) {
//       return res.status(400).json({ error: 'Пользователь уже является участником чата' });
//     }

//     // Добавляем участника
//     await ChatParticipant.create({
//       chatId,
//       userId: participantId
//     });

//     res.json({ message: 'Участник успешно добавлен' });
//   } catch (error) {
//     console.error('Ошибка при добавлении участника:', error);
//     res.status(500).json({ error: 'Не удалось добавить участника' });
//   }
// };

// Получение участников чата
exports.getChatParticipants = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Проверяем, является ли пользователь участником чата
    const isParticipant = await ChatParticipant.findOne({
      where: {
        chatId,
        userId
      }
    });

    if (!isParticipant) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const participants = await ChatParticipant.findAll({
      where: { chatId },
      include: {
        model: User,
        as: 'participants',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    });

    res.json(participants.map(p => p.User));
  } catch (error) {
    console.error('Ошибка при получении участников чата:', error);
    res.status(500).json({ error: 'Не удалось получить участников чата' });
  }
};

// У нас WebSocket-сервер, который будет отправлять сообщения клиентам в реальном времени.
// // Отправка сообщения в чат
// exports.sendMessage = async (req, res) => {
//   try {
//     const { chatId } = req.params;
//     const { content } = req.body;
//     const userId = req.user.id;

//     // Проверяем, является ли пользователь участником чата
//     const isParticipant = await ChatParticipant.findOne({
//       where: {
//         chatId,
//         userId
//       }
//     });

//     if (!isParticipant) {
//       return res.status(403).json({ error: 'Доступ запрещен' });
//     }

//     // Создаем сообщение
//     const message = await Message.create({
//       content,
//       senderId: userId,
//       chatId
//     });

//     // Обновляем время последнего сообщения в чате
//     await Chat.update(
//       { lastMessageAt: new Date() },
//       { where: { id: chatId } }
//     );

//     // Получаем полную информацию о сообщении
//     const fullMessage = await Message.findByPk(message.id, {
//       include: {
//         model: User,
//         as: 'sender',
//         attributes: ['id', 'firstName', 'lastName']
//       }
//     });

//     // Отправляем событие через WebSocket (если настроен)
//     if (req.app.get('io')) {
//       req.app.get('io').to(`chat_${chatId}`).emit('newMessage', fullMessage);
//     }

//     res.status(201).json(fullMessage);
//   } catch (error) {
//     console.error('Ошибка при отправке сообщения:', error);
//     res.status(500).json({ error: 'Не удалось отправить сообщение' });
//   }
// };