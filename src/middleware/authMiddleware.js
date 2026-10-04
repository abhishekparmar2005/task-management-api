const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Not authorized, token missing', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],
  });

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('Not authorized, user no longer exists', 401);
  }

  req.user = user;
  next();
};

module.exports = { protect };
