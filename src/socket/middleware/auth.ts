// src/socket/middleware/auth.ts
import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../../models/User'; // Ваш интерфейс пользователя

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Расширяем интерфейс сокета, чтобы добавить поле user
export interface AuthenticatedSocket extends Socket {
    user?: IUser;
}

export const socketAuthMiddleware = async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    console.log('🔐 [AuthMW] handshake.auth:', socket.handshake.auth);
    console.log('🔐 [AuthMW] handshake.headers.authorization:', socket.handshake.headers.authorization);

    // Получаем токен, который клиент должен передать в auth.token или в заголовке Authorization
    let token = socket.handshake.auth.token as string | undefined;

    // Добавляем проверку заголовков для совместимости с клиентами вроде Postman
    if (!token && socket.handshake.headers.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        console.warn('🔐 [AuthMW] Token not provided');
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        // Верифицируем токен
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        console.log('🔐 [AuthMW] Token verified, user id:', decoded.id);

        // Находим пользователя в базе данных, чтобы получить полный документ
        const user = await User.findById(decoded.id);

        if (!user) {
            console.warn('🔐 [AuthMW] User not found in DB');
            return next(new Error('Authentication error: User not found'));
        }

        // Прикрепляем полный объект пользователя к сокету
        socket.user = user;
        next();
    } catch (error) {
        console.error('🔐 [AuthMW] Socket authentication failed:', error);
        return next(new Error('Authentication error: Invalid token'));
    }
}; 