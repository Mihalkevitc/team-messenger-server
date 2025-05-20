// server/models/index.js
// Sequelize — класс для подключения к базе данных и работы с ней.
// DataTypes — типы данных Sequelize (например, STRING, INTEGER и т.д.)
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config');

// Инициализация подключения к базе данных
const sequelize = new Sequelize(config.development);

// Импорт моделей
const User = require('./User')(sequelize, DataTypes);
const Team = require('./Team')(sequelize, DataTypes);
const Chat = require('./Chat')(sequelize, DataTypes);
const Message = require('./Message')(sequelize, DataTypes);
const ChatParticipant = require('./ChatParticipant')(sequelize, DataTypes);
const TeamMember = require('./TeamMember')(sequelize, DataTypes);

/**
 * Определение ассоциаций (связей) между моделями
 */

// 1. Связь между пользователем и командами, которые он создал
// belongsTo - значит принадлежит (по англ.)
Team.belongsTo(User, {
  as: 'creator',       // Псевдоним Алиас для связи (чтобы можно было обращаться как team.creator)
  foreignKey: 'createdBy', // Поле в таблице Team, ссылающееся на User
  onDelete: 'SET NULL', // Что делать при удалении пользователя (можно также 'CASCADE' или 'RESTRICT')
  onUpdate: 'CASCADE'   // Каскадное обновление при изменении id пользователя
});

User.hasMany(Team, {
  foreignKey: 'createdBy', // То же поле, что и в belongsTo
  as: 'createdTeams',     // Псевдоним для коллекции созданных команд, тип console.log(user.createdTeams); 
  onDelete: 'SET NULL',   // Согласовано с belongsTo
  onUpdate: 'CASCADE'
});

// 2. Связь многие-ко-многим между пользователями и командами через TeamMember
User.belongsToMany(Team, {
  through: TeamMember,    // Используем модель TeamMember как промежуточную таблицу
  as: 'memberTeams',      // Псевдоним для команд, в которых состоит пользователь
  foreignKey: 'userId',   // Поле в TeamMember, ссылающееся на User
  otherKey: 'teamId',     // Поле в TeamMember, ссылающееся на Team
  onDelete: 'CASCADE',    // При удалении пользователя удаляем записи о его участии
  onUpdate: 'CASCADE'
});

Team.belongsToMany(User, {
  through: TeamMember,
  as: 'teamMembers',      // Псевдоним для участников команды
  foreignKey: 'teamId',   // Согласовано с belongsToMany User
  otherKey: 'userId',
  onDelete: 'CASCADE',    // При удалении команды удаляем записи об участниках
  onUpdate: 'CASCADE'
});

// Прямая связь: Команда => TeamMember (чтобы ты мог использовать include: 'members')
Team.hasMany(TeamMember, {
  as: 'members',          // Это как раз то имя, которое ты используешь в include
  foreignKey: 'teamId'
});

TeamMember.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user' // Важно!
});

// И опционально — если где-то понадобится:
TeamMember.belongsTo(Team, {
  foreignKey: 'teamId'
});

// 3. Связь между чатами и командами
Chat.belongsTo(Team, {
  foreignKey: 'teamId',   // Поле в Chat, ссылающееся на Team
  as: 'team',             // Псевдоним для команды чата
  onDelete: 'SET NULL',   // При удалении команды чат остается без команды
  onUpdate: 'CASCADE'
});

Team.hasMany(Chat, {
  foreignKey: 'teamId',   // То же поле, что и в belongsTo
  as: 'teamChats',        // Псевдоним для коллекции чатов команды
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

// 4. Связь многие-ко-многим между пользователями и чатами через ChatParticipant
User.belongsToMany(Chat, {
  through: 'ChatParticipants', // Используем явное имя таблицы
  as: 'participatingChats',    // Псевдоним для чатов пользователя
  foreignKey: 'userId',        // Поле в промежуточной таблице
  otherKey: 'chatId',
  onDelete: 'CASCADE',         // При удалении пользователя удаляем его из чатов
  onUpdate: 'CASCADE'
});

Chat.belongsToMany(User, {
  through: 'ChatParticipants',
  as: 'participants',          // Псевдоним для участников чата
  foreignKey: 'chatId',        // Согласовано с belongsToMany User
  otherKey: 'userId',
  onDelete: 'CASCADE',         // При удалении чата удаляем всех участников
  onUpdate: 'CASCADE'
});

// 5. Связь между сообщениями, чатами и пользователями
Message.belongsTo(Chat, {
  foreignKey: 'chatId',        // Поле в Message, ссылающееся на Chat
  as: 'chat',                  // Псевдоним для чата сообщения
  onDelete: 'CASCADE',         // При удалении чата удаляем все сообщения
  onUpdate: 'CASCADE'
});

Chat.hasMany(Message, {
  foreignKey: 'chatId',        // То же поле, что и в belongsTo
  as: 'messages',              // Псевдоним для коллекции сообщений чата
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

Message.belongsTo(User, {
  as: 'sender',                // Псевдоним для отправителя
  foreignKey: 'senderId',      // Поле в Message, ссылающееся на User
  onDelete: 'SET NULL',        // При удалении пользователя оставляем сообщения
  onUpdate: 'CASCADE'
});

User.hasMany(Message, {
  foreignKey: 'senderId',      // То же поле, что и в belongsTo
  as: 'sentMessages',          // Псевдоним для отправленных сообщений
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

// Экспорт всех моделей и экземпляра Sequelize
module.exports = {
  sequelize,      // Экземпляр Sequelize для подключения к БД
  User,           // Модель пользователя
  Team,           // Модель команды
  Chat,           // Модель чата
  Message,        // Модель сообщения
  TeamMember,     // Модель участника команды
  ChatParticipant // Модель участника чата
};