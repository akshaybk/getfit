const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Check if token exists
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by id
    const user = await User.findById(decoded.id);
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Check if user is an admin
    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    // Set user in request with updated properties
    req.user = {
      id: decoded.id,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin
    };
    
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is invalid' });
  }
};

module.exports = adminMiddleware; 