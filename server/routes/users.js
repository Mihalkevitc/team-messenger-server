// routes/users.js
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const authenticate = require('../middlewares/auth.middleware');
const { Op } = require('sequelize');


router.get('/search', authenticate, async (req, res) => {
  try {
    const { email } = req.query;

    const users = await User.findAll({
      where: {
        email: {
          [Op.iLike]: `%${email}%`
        }
      },
      attributes: ['firstName', 'lastName', 'email', 'id']  // Уточнить нужные поля
    });

    res.json(users);
  } catch (error) {
    console.error('Ошибка при поиске пользователей:', error);
    res.status(500).json({ error: 'Ошибка поиска пользователей' });
  }
});


// Получение текущего пользователя
router.get('/me', authenticate, (req, res) => {
  const { id, email, firstName, lastName } = req.user;
  res.json({ user: { id, email, firstName, lastName } }); // отправляем данные пользователя
  console.log('\n\nПользователь на сервере:', id, firstName, lastName, email);
});

module.exports = router;
