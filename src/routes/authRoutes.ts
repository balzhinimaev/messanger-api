// src/routes/authRoutes.ts
import { Router } from 'express';
import { registerUser, loginUser, getCurrentUser } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware'; // Импортируем наше middleware
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../lib/validators/authValidators';

const router = Router();

// POST /auth/register
router.post('/register', validate(registerSchema), registerUser);

// POST /auth/login
router.post('/login', validate(loginSchema), loginUser);

// GET /auth/me - Защищенный эндпоинт, требует аутентификации
router.get('/me', protect, getCurrentUser);

export default router; 