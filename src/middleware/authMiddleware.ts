// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User'; // Импортируем модель и интерфейс

// Расширяем интерфейс Request, чтобы добавить наше поле 'user'
declare global {
    namespace Express {
        interface Request {
            user?: IUser; // Пользователь будет добавляться сюда после успешной аутентификации
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

if (!JWT_SECRET) {
    console.warn('JWT_SECRET is not defined in .env, using default value');
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Ищем токен в заголовке Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]; // Отделяем 'Bearer ' от самого токена
    }

    // Если токен не найден, возвращаем ошибку
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        // Верификация токена
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string }; // Декодируем и получаем ID пользователя

        // Находим пользователя в базе данных и добавляем его в req.user
        // .select('-passwordHash') чтобы не возвращать пароль в объекте req.user
        const user = await User.findById(decoded.id).select('-passwordHash');

        if (!user) {
            // Пользователь с таким ID не найден (возможно, был удален)
            return res.status(401).json({ message: 'User not found or token is invalid' });
        }

        req.user = user; // Прикрепляем объект пользователя к объекту запроса
        next(); // Передаем управление дальше
    } catch (error) {
        // Если токен недействителен (например, истек срок действия)
        console.error('Token verification failed:', error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
}; 