// server/controllers/team.controller.js
const { sequelize, Team, User, TeamMember, Chat, ChatParticipant } = require('../models');

/**
 * Создание новой команды
 */
exports.createTeam = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ error: 'Название команды должно содержать минимум 3 символа' });
    }

    const transaction = await sequelize.transaction();

    try {
      // Создаем команду
      const team = await Team.create({
        name,
        description: description || null,
        createdBy: userId
      }, { transaction });

      // Добавляем создателя как участника команды с ролью 'admin'
      await TeamMember.create({
        userId: userId,
        teamId: team.id,
        role: 'admin'
      }, { transaction });

      // Создаем чат команды с тем же названием
      const chat = await Chat.create({
        name: `Чат команды ${name}`,
        isTeamChat: true,
        teamId: team.id
      }, { transaction });

      // Добавляем создателя в чат команды
      await ChatParticipant.create({
        userId: userId,
        chatId: chat.id
      }, { transaction });

      await transaction.commit();

      // Возвращаем созданную команду вместе с чатом
      const result = await Team.findByPk(team.id, {
        include: [
          {
            model: Chat,
            as: 'teamChats',
            attributes: ['id', 'name', 'isTeamChat']
          }
        ]
      });

      res.status(201).json(result);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при создании команды:', error);
    res.status(500).json({ error: 'Не удалось создать команду' });
  }
};

/**
 * Получение списка команд текущего пользователя
 */
exports.getTeams = async (req, res) => {
  try {
    const userId = req.user.id;

    //Находит все команды, в которых есть пользователь с заданным userId (за счёт where внутри teamMembers).
    // Для каждой команды вытягивает:
    // создателя команды (creator) с его именем и id,
    // всех участников команды (members) с их ролями и именами,

    // Находим все команды, где пользователь является участником
    const teams = await Team.findAll({
      // include: [...] — какие данные связанных моделей мы хотим получить вместе с командами:
      include: [
        // В каждой команде (Team) через ассоциацию creator (указан в модели: Team.belongsTo(User, 
        // { as: 'creator', foreignKey: 'createdBy' })) подтягивается пользователь, который создал эту команду.
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        // Здесь идёт запрос на получение всех пользователей (User), которые являются участниками этой команды (через связь belongsToMany с as: 'teamMembers').
        // этот блок фильтрует команды, оставляя только те, где пользователь с userId состоит в команде.
        {
          model: User,
          as: 'teamMembers',
          // where: { id: userId } — фильтр, который ограничивает выборку командами, в которых есть конкретный пользователь с этим userId. 
          // То есть это фильтр, чтобы найти только те команды, где пользователь участвует.
          where: { id: userId },
          attributes: [],
          // но из промежуточной таблицы TeamMember хотим получить поле role (роль пользователя в команде).
          through: {
            attributes: ['role']
          }
        },
        // Здесь через связь Team.hasMany(TeamMember, { as: 'members', foreignKey: 'teamId' }) 
        // к команде подтягиваются все записи участников команды из таблицы TeamMember.
        {
          model: TeamMember,
          as: 'members',
          // Это нужно, чтобы получить подробную информацию о каждом участнике команды вместе с его ролью (которая в TeamMember.role, есть в объекте member).
          include: {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName']
          }
        },
        // Добавляем включение чатов команды
        {
          model: Chat,
          as: 'teamChats',
          attributes: ['id', 'name', 'isTeamChat']
        }
      ],
      // Результат сортируется по дате создания команды — самые новые команды будут в начале.
      order: [['createdAt', 'DESC']]
    });

    // Форматируем данные для отправки клиенту
    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      creator: team.creator,
      createdAt: team.createdAt,
      members: team.members.map(member => ({
        user: member.user,
        role: member.role
      })),
      teamChats: team.teamChats // Добавляем чаты в ответ
    }));

    res.json(formattedTeams);
  } catch (error) {
    console.error('Ошибка при получении команд:', error);
    res.status(500).json({ error: 'Не удалось получить список команд' });
  }
};

/**
 * Получение конкретной команды по ID
 */
exports.getTeamById = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;

    // Находим команду и проверяем, что пользователь является участником
    const team = await Team.findOne({
      where: { id: teamId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'teamMembers',
          where: { id: userId },
          attributes: [],
          through: {
            attributes: ['role']
          },
          required: true // Только если пользователь участник
        },
        {
          model: TeamMember,
          as: 'members',
          include: {
            model: User,
            as: 'user', // Указываем, что это связь с моделью User
            attributes: ['id', 'firstName', 'lastName']
          }
        },
        {
          model: Chat,
          as: 'teamChats',
          attributes: ['id', 'name', 'isTeamChat']
        },
      ]
    });

    if (!team) {
      return res.status(404).json({ error: 'Команда не найдена или у вас нет доступа' });
    }

    // Форматируем данные для отправки клиенту
    const formattedTeam = {
      id: team.id,
      name: team.name,
      description: team.description,
      projectLink: team.projectLink,
      creator: team.creator,
      members: team.members.map(member => ({
        user: member.User,
        role: member.role
      })),
      teamChats: team.teamChats // Добавляем чаты в ответ
    };

    res.json(formattedTeam);
  } catch (error) {
    console.error('Ошибка при получении команды:', error);
    res.status(500).json({ error: 'Не удалось получить информацию о команде' });
  }
};


// server/controllers/team.controller.js
// Добавление новых участников в команду (только для создателя команды)

// Удаление участников из команды (только для создателя)

// Редактирование названия и описания команды

// Удаление всей команды

// Назначение ролей участникам

// Изменение роли участника

// Создание чата команды

// Получение списка чатов команды

/**
 * Добавление участника в команду (и в чаты команды)
 */
exports.addTeamMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const teamId = req.params.teamId;
    const userId = req.user.id;

    // Проверяем права (только создатель может добавлять участников)
    const team = await Team.findOne({
      where: { id: teamId, createdBy: userId }
    });

    if (!team) {
      return res.status(403).json({ error: 'Только создатель команды может добавлять участников' });
    }

    // Находим пользователя по email
    const userToAdd = await User.findOne({ where: { email } });
    if (!userToAdd) {
      return res.status(404).json({ error: 'Пользователь с таким email не найден' });
    }

    // Проверяем, что пользователь еще не в команде
    const existingMember = await TeamMember.findOne({
      where: { userId: userToAdd.id, teamId }
    });
    if (existingMember) {
      return res.status(400).json({ error: 'Пользователь уже в команде' });
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Добавляем участника в команду
      await TeamMember.create({
        userId: userToAdd.id,
        teamId,
        role
      }, { transaction });

      // 2. Находим все чаты команды
      const teamChats = await Chat.findAll({
        where: { teamId },
        transaction
      });

      // 3. Добавляем пользователя во все чаты команды
      const chatParticipants = teamChats.map(chat => ({
        userId: userToAdd.id,
        chatId: chat.id
      }));

      if (chatParticipants.length > 0) {
        await ChatParticipant.bulkCreate(chatParticipants, { transaction });
      }

      await transaction.commit();

      // Возвращаем обновленную команду с участниками
      const updatedTeam = await Team.findByPk(teamId, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName']
          },
          {
            model: TeamMember,
            as: 'members',
            include: {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName']
            }
          },
          {
            model: Chat,
            as: 'teamChats',
            include: {
              model: User,
              as: 'participants',
              attributes: ['id', 'firstName', 'lastName']
            }
          }
        ]
      });

      res.json(updatedTeam);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при добавлении участника:', error);
    res.status(500).json({ error: 'Не удалось добавить участника' });
  }
};

/**
 * Удаление участника из команды (и из чатов команды)
 */
exports.removeTeamMember = async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const userIdToRemove = req.params.userId;
    const currentUserId = req.user.id;

    // Проверяем права (только создатель может удалять участников)
    const team = await Team.findOne({
      where: { id: teamId, createdBy: currentUserId }
    });
    if (!team) {
      return res.status(403).json({ error: 'Только создатель команды может удалять участников' });
    }

    // Нельзя удалить самого себя из команды
    if (userIdToRemove == currentUserId) {
      return res.status(400).json({ error: 'Нельзя удалить себя из команды' });
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Удаляем участника из команды
      await TeamMember.destroy({
        where: { userId: userIdToRemove, teamId },
        transaction
      });

      // 2. Находим все чаты команды
      const teamChats = await Chat.findAll({
        where: { teamId },
        attributes: ['id'],
        transaction
      });

      const chatIds = teamChats.map(chat => chat.id);

      // 3. Удаляем пользователя из всех чатов команды
      if (chatIds.length > 0) {
        await ChatParticipant.destroy({
          where: {
            userId: userIdToRemove,
            chatId: chatIds
          },
          transaction
        });
      }

      await transaction.commit();

      // Возвращаем обновленную команду
      const updatedTeam = await Team.findByPk(teamId, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName']
          },
          {
            model: TeamMember,
            as: 'members',
            include: {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName']
            }
          },
          {
            model: Chat,
            as: 'teamChats',
            include: {
              model: User,
              as: 'participants',
              attributes: ['id', 'firstName', 'lastName']
            }
          }
        ]
      });

      res.json(updatedTeam);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при удалении участника:', error);
    res.status(500).json({ error: 'Не удалось удалить участника' });
  }
};

/**
 * Обновление информации о команде
 */
exports.updateTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const { name, description } = req.body;
    const userId = req.user.id;

    // Проверяем, что пользователь является создателем команды
    const team = await Team.findOne({
      where: { id: teamId, createdBy: userId }
    });

    if (!team) {
      return res.status(403).json({ error: 'Только создатель команды может изменять её данные' });
    }

    // Обновляем команду
    await team.update({
      name,
      description
    });

    res.json(team);
  } catch (error) {
    console.error('Ошибка при обновлении команды:', error);
    res.status(500).json({ error: 'Не удалось обновить команду' });
  }
};

/**
 * Удаление команды
 */
exports.deleteTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;

    // Проверяем, что пользователь является создателем команды
    const team = await Team.findOne({
      where: { id: teamId, createdBy: userId }
    });

    if (!team) {
      return res.status(403).json({ error: 'Только создатель команды может её удалить' });
    }

    // Удаляем команду (каскадное удаление настроено в моделях)
    await team.destroy();

    res.json({ message: 'Команда успешно удалена' });
  } catch (error) {
    console.error('Ошибка при удалении команды:', error);
    res.status(500).json({ error: 'Не удалось удалить команду' });
  }
};

/**
 * Изменение роли участника команды
 */
exports.updateMemberRole = async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.id;

    // Проверяем, что текущий пользователь - создатель команды
    const team = await Team.findOne({
      where: { id: teamId, createdBy: currentUserId }
    });

    if (!team) {
      return res.status(403).json({ error: 'Только создатель команды может изменять роли' });
    }

    // Обновляем роль участника
    await TeamMember.update(
      { role },
      { where: { userId, teamId } }
    );

    // Возвращаем обновленную команду
    const updatedTeam = await Team.findByPk(teamId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: TeamMember,
          as: 'members',
          include: {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName']
          }
        }
      ]
    });

    res.json(updatedTeam);
  } catch (error) {
    console.error('Ошибка при изменении роли участника:', error);
    res.status(500).json({ error: 'Не удалось изменить роль участника' });
  }
};

/**
 * Создание чата команды
 */
exports.createTeamChat = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    // Проверяем, что пользователь является участником команды
    const isMember = await TeamMember.findOne({
      where: { teamId, userId }
    });

    if (!isMember) {
      return res.status(403).json({ error: 'Вы не являетесь участником этой команды' });
    }

    // Создаем чат
    const chat = await Chat.create({
      name,
      isTeamChat: true,
      teamId
    });

    // Добавляем всех участников команды в чат
    const teamMembers = await TeamMember.findAll({
      where: { teamId },
      attributes: ['userId']
    });

    const chatParticipants = teamMembers.map(member => ({
      userId: member.userId,
      chatId: chat.id
    }));

    await ChatParticipant.bulkCreate(chatParticipants);

    res.status(201).json(chat);
  } catch (error) {
    console.error('Ошибка при создании чата команды:', error);
    res.status(500).json({ error: 'Не удалось создать чат команды' });
  }
};

/**
 * Получение чатов команды
 */
exports.getTeamChats = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    // Проверяем, что пользователь является участником команды
    const isMember = await TeamMember.findOne({
      where: { teamId, userId }
    });

    if (!isMember) {
      return res.status(403).json({ error: 'Вы не являетесь участником этой команды' });
    }

    // Получаем чаты команды
    const chats = await Chat.findAll({
      where: { teamId },
      include: [
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'content', 'createdAt'],
          include: {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName']
          }
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(chats);
  } catch (error) {
    console.error('Ошибка при получении чатов команды:', error);
    res.status(500).json({ error: 'Не удалось получить чаты команды' });
  }
};