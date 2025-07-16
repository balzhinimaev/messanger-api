// src/socket/middleware/auth.ts
import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../../models/User'; // Ваш интерфейс пользователя

const JWT_SECRET = process.env.JWT_SECRET!;

// Расширяем интерфейс сокета, чтобы добавить поле user
export interface AuthenticatedSocket extends Socket {
    user?: IUser;
}

export const socketAuthMiddleware = async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    // Получаем токен, который клиент должен передать в auth.token
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        // Верифицируем токен
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

        // Находим пользователя в базе данных, чтобы получить полный документ
        const user = await User.findById(decoded.id);

        if (!user) {
            return next(new Error('Authentication error: User not found'));
        }

        // Прикрепляем полный объект пользователя к сокету
        socket.user = user;
        next();
    } catch (error) {
        console.error('Socket authentication failed:', error);
        return next(new Error('Authentication error: Invalid token'));
    }
}; 