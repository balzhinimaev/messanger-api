// src/middleware/chatAuthMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import Chat from '../models/Chat';
import { AppError } from './errorHandler';

// Это middleware должно использоваться ПОСЛЕ protect middleware, т.к. оно рассчитывает на req.user
export const isChatParticipant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatId = req.params.id; // Получаем ID чата из параметров URL
        const userId = req.user?._id; // Получаем ID пользователя из req.user

        if (!userId) {
            return next(new AppError('Authentication error', 401));
        }
        
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return next(new AppError('Chat not found', 404));
        }

        // Проверяем, является ли текущий пользователь участником чата
        if (!chat.participants.includes(userId as any)) {
            // 403 Forbidden - у вас нет прав доступа к этому ресурсу
            return next(new AppError('Access denied. You are not a participant of this chat.', 403));
        }
        
        next(); // Если проверка пройдена, передаем управление дальше
    } catch (error) {
        next(error);
    }
}; 