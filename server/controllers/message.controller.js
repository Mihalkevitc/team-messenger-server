const { Message, Chat, User, TeamMember } = require('../models');

exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Получаем чат, чтобы проверить, командный ли он
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    // Получаем все сообщения с отправителями
    const messages = await Message.findAll({
      where: { chatId },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['createdAt', 'ASC']]
    });

    // Если чат не командный — возвращаем как есть
    if (!chat.teamId) {
      return res.json(messages);
    }

    // Если чат командный — получаем роли отправителей
    const messagesWithRoles = await Promise.all(messages.map(async (msg) => {
      const member = await TeamMember.findOne({
        where: {
          teamId: chat.teamId,
          userId: msg.sender.id
        }
      });

      return {
        ...msg.toJSON(),
        sender: {
          ...msg.sender.toJSON(),
          role: member ? member.role : null
        }
      };
    }));

    res.json(messagesWithRoles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
