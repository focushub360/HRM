import jwt from 'jsonwebtoken';

// Optional JWT protection for routes. Not enforced on every route by
// default (to stay drop-in compatible with the existing frontend), but
// ready to use: just add `protect` to any route you want to lock down,
// and send `Authorization: Bearer <token>` from the frontend.
export const protect = (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.authUser = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authorized, invalid or expired token' });
  }
};

// Restricts a route to specific roles, e.g. authorize('company', 'hr')
export const authorize = (...roles) => (req, res, next) => {
  if (!req.authUser || !roles.includes(req.authUser.role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient role permissions' });
  }
  next();
};

export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};