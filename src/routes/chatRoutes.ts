// src/routes/chatRoutes.ts
import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { isChatParticipant } from '../middleware/chatAuthMiddleware';
import {
    createPrivateChat,
    getUserChats,
    sendMessage,
    getChatMessages,
    markMessagesAsRead,
} from '../controllers/chatController';
import { validate } from '../middleware/validate';
import { 
    createPrivateChatSchema, 
    sendMessageSchema, 
    getChatMessagesSchema 
} from '../lib/validators/chatValidators';

const router = Router();

// Все роуты здесь защищены, так как они требуют аутентификации пользователя
router.use(protect);

// POST /api/chats - Создать приватный чат
router.post('/', validate(createPrivateChatSchema), createPrivateChat);

// GET /api/chats - Получить список всех чатов пользователя
router.get('/', getUserChats);

// POST /api/chats/:id/messages - Отправить сообщение в чат
router.post('/:id/messages', validate(sendMessageSchema), isChatParticipant, sendMessage);

// GET /api/chats/:id/messages - Получить сообщения чата
router.get('/:id/messages', validate(getChatMessagesSchema), isChatParticipant, getChatMessages);

// POST /api/chats/:id/messages/read - Отметить сообщения как прочитанные
router.post('/:id/messages/read', isChatParticipant, markMessagesAsRead);

export default router; 