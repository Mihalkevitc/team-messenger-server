// server/models/Team.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Team = sequelize.define('Team', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'name'
    },
    description: {
      type: DataTypes.TEXT,
      field: 'description'
    },
    projectLink: {
      type: DataTypes.STRING,
      field: 'projectLink'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      field: 'createdBy'
    }
  }, {
    tableName: 'Teams',
    freezeTableName: true,
    timestamps: true
  });

  return Team;
};