// server/models/TeamMember.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeamMember = sequelize.define('TeamMember', {
    role: {
      type: DataTypes.STRING, // Заменяем ENUM на STRING
      allowNull: true,
      comment: 'Роль участника в команде'
    }
  }, {
    timestamps: false,
    tableName: 'team_members',
    underscored: true
  });

  return TeamMember;
};


  // const TeamMember = sequelize.define('TeamMember', {
  //   role: {
  //     type: DataTypes.ENUM(
  //       'backend',    // Бэкенд-разработчик
  //       'frontend',   // Фронтенд-разработчик
  //       'designer',   // Дизайнер
  //       'manager',    // Менеджер
  //       'qa',         // Тестировщик
  //       'devops',     // DevOps-инженер
  //       'analyst',    // Аналитик
  //       'product_owner' // Владелец продукта
  //     ),