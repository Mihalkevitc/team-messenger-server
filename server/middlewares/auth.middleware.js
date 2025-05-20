// server/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware для проверки аутентификации пользователя
 */
module.exports = async (req, res, next) => {
  try {
    // Получаем токен из заголовков
    // В req.headers.authorization будет 'Bearer <token>'.
    const token = req.headers.authorization?.split(' ')[1];
    // authorization - заголовок с токеном
    // split(' ') разделит строку по пробелу на ["Bearer", "<token>"]
    // [1] возьмёт второй элемент массива (сам токен)
    
    if (!token) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Находим пользователя в базе данных
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    // Добавляем пользователя в запрос для использования в контроллерах
    req.user = user;
    next();
  } catch (error) {
    console.error('Ошибка аутентификации:', error);
    res.status(401).json({ error: 'Неверный токен' });
  }
};