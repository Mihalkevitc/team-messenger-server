// server/routes/team.routes.js
const express = require('express');
const router = express.Router();
const teamController = require('../controllers/team.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Все маршруты чатов требуют аутентификации
router.use(authMiddleware);

// Основные CRUD операции для команд
router.post('/', teamController.createTeam); // Создание команды
router.get('/', teamController.getTeams); // Получение списка команд пользователя
router.get('/:id', teamController.getTeamById); // Получение конкретной команды

// Управление участниками команды
router.post('/:teamId/members', teamController.addTeamMember); // Добавление участника
router.delete('/:teamId/members/:userId', teamController.removeTeamMember); // Удаление участника
router.put('/:teamId/members/:userId/role', teamController.updateMemberRole); // Изменение роли участника

// Управление настройками команды
router.put('/:id', teamController.updateTeam); // Обновление информации о команде
router.delete('/:id', teamController.deleteTeam); // Удаление команды

// Управление чатами команды
router.post('/:teamId/chats', teamController.createTeamChat); // Создание чата команды
router.get('/:teamId/chats', teamController.getTeamChats); // Получение чатов команды

module.exports = router;