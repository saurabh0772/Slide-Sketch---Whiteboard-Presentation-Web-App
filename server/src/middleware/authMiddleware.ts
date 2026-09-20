import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    username: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  // Try extracting token from Authorization header or query parameter (useful for PDF streaming / window.open)
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized: Authentication required. Please log in.',
    });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET || 'slidesketch_secure_jwt_secret_key_abhishek_2026';

  try {
    const decoded = jwt.verify(token, jwtSecret) as { username: string };
    req.user = { username: decoded.username };
    next();
  } catch (err: any) {
    res.status(401).json({
      error: 'Unauthorized: Session invalid or expired. Please log in again.',
    });
    return;
  }
};
