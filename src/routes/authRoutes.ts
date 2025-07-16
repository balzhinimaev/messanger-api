// src/routes/authRoutes.ts
import { Router } from 'express';
import { registerUser, loginUser, getCurrentUser } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware'; // Импортируем наше middleware
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../lib/validators/authValidators';
import { catchAsync } from '../lib/catchAsync';

const router = Router();

// POST /auth/register
router.post('/register', validate(registerSchema), catchAsync(registerUser));

// POST /auth/login
router.post('/login', validate(loginSchema), catchAsync(loginUser));

// GET /auth/me - Защищенный эндпоинт, требует аутентификации
router.get('/me', protect, catchAsync(getCurrentUser));

export default router; 