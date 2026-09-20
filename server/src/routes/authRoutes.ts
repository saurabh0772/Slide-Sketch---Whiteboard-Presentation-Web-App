import { Router } from 'express';
import { login, verify } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.get('/verify', authMiddleware, verify);

export default router;
