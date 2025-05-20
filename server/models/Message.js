// server/models/Message.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'content'
    },
    fileUrl: {
      type: DataTypes.STRING,
      field: 'fileUrl'
    },
    chatId: {
      type: DataTypes.INTEGER,
      field: 'chatId'
    },
    senderId: {
      type: DataTypes.INTEGER,
      field: 'senderId'
    }
  }, {
    tableName: 'Messages',
    freezeTableName: true,
    timestamps: true
  });

  return Message;
};