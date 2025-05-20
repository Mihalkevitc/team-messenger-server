const { User } = require('../models');
const jwt = require('jsonwebtoken');

// Регистрация
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    const user = await User.create({ 
      firstName, 
      lastName, 
      email, 
      password 
    });
    
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { 
      expiresIn: '1h' 
    });
    
    res.status(201).json({ 
      token,
      user: { 
        id: user.id, 
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
    
  } catch (err) {
    res.status(400).json({ 
      error: err.name === 'SequelizeUniqueConstraintError'
        ? 'Email уже используется' 
        : 'Ошибка регистрации'
    });
  }
};

// Логин
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { 
      expiresIn: '1h' 
    });
    
    res.json({ 
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
    
  } catch (err) {
    res.status(400).json({ error: 'Ошибка авторизации' });
  }
};