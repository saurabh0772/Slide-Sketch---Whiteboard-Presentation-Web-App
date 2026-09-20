import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../middleware/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'slidesketch_secure_jwt_secret_key_abhishek_2026';
const EXPECTED_USERNAME = process.env.AUTH_USERNAME || 'Abhishek';
const EXPECTED_PASSWORD = process.env.AUTH_PASSWORD || 'SSCVertex@0772';

/**
 * Log in with username and password, issuing a 30-day JWT token
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const trimmedUsername = String(username).trim();
    const cleanPassword = String(password);

    if (trimmedUsername !== EXPECTED_USERNAME || cleanPassword !== EXPECTED_PASSWORD) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Generate JWT token with 30 days validity
    const token = jwt.sign(
      { username: trimmedUsername },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + thirtyDaysInMs;

    res.json({
      success: true,
      token,
      user: {
        username: trimmedUsername,
      },
      expiresAt,
    });
  } catch (error: any) {
    console.error('[AuthController] Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

/**
 * Verify token validity and return current user info
 */
export const verify = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    res.json({
      valid: true,
      user: req.user,
    });
  } catch (error: any) {
    res.status(401).json({ error: 'Session verification failed' });
  }
};
