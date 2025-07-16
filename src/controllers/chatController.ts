// src/controllers/chatController.ts
import { Request, Response, NextFunction } from 'express';
import Chat from '../models/Chat';
import Message from '../models/Message';
import { AppError } from '../middleware/errorHandler';

// Эндпоинт: POST /chats (создание личного чата)
export const createPrivateChat = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { partnerId } = req.body; // ID второго участника
        const myId = req.user?._id;

        if (!myId) {
            return next(new AppError('Authentication error', 401));
        }

        // Ищем существующий личный чат между этими двумя пользователями
        let chat = await Chat.findOne({
            isGroupChat: false,
            participants: { $all: [myId, partnerId], $size: 2 }, // Оба участника, и только они
        }).populate('participants', '-passwordHash'); // Заполняем данными участников

        // Если чат уже существует, возвращаем его
        if (chat) {
            return res.status(200).json(chat);
        }

        // Если чата нет, создаем новый
        const newChat = new Chat({
            isGroupChat: false,
            participants: [myId, partnerId],
        });

        const savedChat = await newChat.save();
        const fullChat = await Chat.findById(savedChat._id).populate('participants', '-passwordHash');

        res.status(201).json(fullChat);
    } catch (error) {
        next(error);
    }
};

// GET /chats (список чатов пользователя)
export const getUserChats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chats = await Chat.find({ participants: req.user?._id })
            .populate('participants', 'username avatarUrl') // Загружаем данные участников
            .populate('lastMessage') // Загружаем последнее сообщение
            .sort({ updatedAt: -1 }); // Сортируем по времени последнего обновления

        res.status(200).json(chats);
    } catch (error) {
        next(error);
    }
};


// Эндпоинт: POST /chats/{id}/messages (отправка сообщения)
export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { content } = req.body;
        const chatId = req.params.id;
        const senderId = req.user?._id;

        // Создаем новое сообщение
        const newMessage = new Message({
            sender: senderId,
            chat: chatId,
            content: content,
        });

        const savedMessage = await newMessage.save();

        // Обновляем поле lastMessage в документе чата
        await Chat.findByIdAndUpdate(chatId, { lastMessage: savedMessage._id });

        // Заполняем данные отправителя перед отправкой ответа
        const populatedMessage = await Message.findById(savedMessage._id)
                                              .populate('sender', 'username avatarUrl');

        res.status(201).json(populatedMessage);
    } catch (error) {
        next(error);
    }
};

// Эндпоинт: POST /chats/{id}/messages/read (отметить сообщения как прочитанные)
export const markMessagesAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatId = req.params.id;
        const userId = req.user?._id;

        if (!userId) {
            return next(new AppError('Authentication error', 401));
        }

        const result = await Message.updateMany(
            { 
                chat: chatId, 
                sender: { $ne: userId }, // Обновляем только сообщения, отправленные не нами
                status: { $ne: 'read' }  // Обновляем только те, что еще не прочитаны
            },
            { $set: { status: 'read' } }
        );

        // В result.modifiedCount будет количество обновленных документов.
        // Мы можем использовать это, чтобы решить, нужно ли отправлять событие через сокет.
        if (result.modifiedCount > 0) {
            // Логика для оповещения через сокет будет добавлена позже
        }

        res.status(200).json({ message: `${result.modifiedCount} messages marked as read.` });
    } catch (error) {
        next(error);
    }
};

// Эндпоинт: GET /chats/{id}/messages (получение сообщений с пагинацией)
export const getChatMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const chatId = req.params.id;
        
        const skip = (Number(page) - 1) * Number(limit);

        const messages = await Message.find({ chat: chatId })
            .populate('sender', 'username avatarUrl')
            .sort({ createdAt: -1 }) // Сортируем от новых к старым
            .skip(skip)
            .limit(Number(limit));
        
        // Переворачиваем массив, чтобы на фронтенде они отображались в правильном порядке (старые вверху)
        res.status(200).json(messages.reverse());
    } catch (error) {
        next(error);
    }
}; 