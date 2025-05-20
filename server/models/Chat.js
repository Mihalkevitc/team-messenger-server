// server/models/Chat.js
module.exports = (sequelize, DataTypes) => {
  const Chat = sequelize.define('Chat', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isTeamChat: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'Chats', // Явно указываем имя таблицы
    freezeTableName: true // Запрещаем изменять имя таблицы
  });

  return Chat;
};