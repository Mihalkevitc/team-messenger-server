// server/models/ChatParticipant.js
module.exports = (sequelize, DataTypes) => {
  const ChatParticipant = sequelize.define('ChatParticipant', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    chatId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  }, {
    timestamps: true,
    tableName: 'ChatParticipants',
    freezeTableName: true,
    // отключаем автоматическое создание поля id
    // должен быть составной первичный ключ (userId + chatId)
    createdAt: true,
    updatedAt: true,
    id: false
  });

  return ChatParticipant;
};
