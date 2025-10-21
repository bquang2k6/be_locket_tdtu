
import jwt from 'jsonwebtoken';

export function verifyAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Sai Authorization header' });

  const token = parts[1];
  jwt.verify(token, process.env.JWT_SECRET || 'change-this-secret', (err, decoded) => {
    if (err) return res.status(401).json({ error: 'token hết hạn' });
    req.user = decoded;
    next();
  });
}

export default verifyAuth;
