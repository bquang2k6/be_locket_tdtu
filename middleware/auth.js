const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return res.error(401, 'Missing Authorization header');

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.error(401, 'Sai Authorization header');

  const token = parts[1];
  jwt.verify(token, process.env.JWT_SECRET || 'change-this-secret', (err, decoded) => {
    if (err) return res.error(401, 'token hết hạn');
    req.user = decoded;
    next();
  });
};
