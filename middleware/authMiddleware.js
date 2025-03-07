const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ error: 'Access Denied' });

  const token = authHeader.split(' ')[1]; // Extract token after 'Bearer '
  if (!token) return res.status(401).json({ error: 'Invalid Token' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid Token' });
  }
};

module.exports = authMiddleware;
