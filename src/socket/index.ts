// src/socket/index.ts
import { Server } from 'socket.io';
import { socketAuthMiddleware, AuthenticatedSocket } from './middleware/auth';
import Chat from '../models/Chat';
import Message from '../models/Message';
import { validateSocketData } from './middleware/validateSocket';
import { sendMessageSocketSchema, typingSocketSchema, messageStatusSocketSchema } from '../lib/validators/socketValidators';
import { addUser, removeUser, getOnlineUsers } from './onlineUsers';
import { IChat } from '../models/Chat';

export const initSocketServer = (io: Server) => {
    // Используем наше middleware для авторизации
    io.use(socketAuthMiddleware);

    // Логируем ошибки подключения, например, отвергнутые middleware
    io.on('connection_error', (err) => {
        console.error('❌ Connection error:', err.message, err.data);
    });

    io.on('connection', async (socket: AuthenticatedSocket) => {
        // Мы можем быть уверены, что user существует благодаря middleware
        const user = socket.user!; 
        console.log(`✅ User connected: ${socket.id}, UserID: ${user._id}`);

        addUser(user._id.toString(), socket.id);

        // Получаем список контактов пользователя (участников его чатов)
        const userChats = await Chat.find({ participants: user._id }).select('participants');
        const contactIds = new Set<string>();
        userChats.forEach((chat: IChat) => {
            chat.participants.forEach(participantId => {
                if (participantId.toString() !== user._id.toString()) {
                    contactIds.add(participantId.toString());
                }
            });
        });

        // Оповещаем контакты, что пользователь вошел в сеть
        contactIds.forEach(contactId => {
            io.to(contactId).emit('user_online', { userId: user._id });
        });

        // Отправляем текущему пользователю список тех, кто уже онлайн
        socket.emit('online_users', getOnlineUsers());

        // 1. Присоединение к персональной комнате
        socket.join(user._id.toString());

        // 2. Присоединение ко всем комнатам-чатам пользователя
        try {
            const userChats = await Chat.find({ participants: user._id });
            userChats.forEach(chat => {
                socket.join(chat._id.toString());
                console.log(`User ${user._id} joined chat room: ${chat._id.toString()}`);
            });
        } catch (error) {
            console.error("Failed to join chat rooms:", error);
        }

        const sendMessageHandler = async (socket: AuthenticatedSocket, data: { chatId: string; content: string }) => {
            console.log('📨 [send_message] Data received:', data);
            const { chatId, content } = data;
            const senderId = socket.user!._id;
            console.log('📨 [send_message] Sender:', senderId.toString());

            const chat = await Chat.findOne({ _id: chatId, participants: senderId });
            if (!chat) {
                console.warn('⚠️ [send_message] Chat not found or sender is not a participant');
                socket.emit('error', { message: "You are not a participant of this chat." });
                return;
            }

            console.log('📨 [send_message] Chat found, creating message');

            try {
                const newMessage = new Message({ sender: senderId, chat: chatId, content });
                const savedMessage = await newMessage.save();
                console.log('📨 [send_message] Message saved with id:', savedMessage._id.toString());

                await Chat.findByIdAndUpdate(chatId, { lastMessage: savedMessage._id });
                console.log('📨 [send_message] Chat lastMessage updated');

                const populatedMessage = await Message.findById(savedMessage._id).populate('sender', 'username avatarUrl');
                console.log('📨 [send_message] Populated message ready, emitting to room', chatId);

                io.to(chatId).emit('message_received', populatedMessage);
                console.log(`📨 [send_message] Message emitted to room ${chatId}`);
            } catch (error) {
                console.error('❌ [send_message] Failed to send message:', error);
                socket.emit('error', { message: "Failed to send message." });
            }
        };

        const typingStartedHandler = (socket: AuthenticatedSocket, data: { chatId: string }) => {
            socket.to(data.chatId).emit('typing_indicator', {
                chatId: data.chatId,
                user: { id: socket.user!._id, username: socket.user!.username }
            });
        };

        const typingStoppedHandler = (socket: AuthenticatedSocket, data: { chatId: string }) => {
            socket.to(data.chatId).emit('typing_indicator_stopped', { chatId: data.chatId });
        };

        // Новый обработчик: Сообщение доставлено
        const messageDeliveredHandler = async (socket: AuthenticatedSocket, data: { messageId: string, chatId: string }) => {
            console.log('✅ [message_delivered] Data received:', data);
            try {
                const message = await Message.findById(data.messageId);
                if (!message) {
                    console.warn('⚠️ [message_delivered] Message not found');
                    return;
                }
                console.log('✅ [message_delivered] Current status:', message.status);

                if (message.status === 'sent') {
                    message.status = 'delivered';
                    await message.save();
                    console.log('✅ [message_delivered] Status updated to delivered');
                    
                    // Оповещаем отправителя, что его сообщение доставлено
                    io.to(message.sender.toString()).emit('message_status_updated', {
                        messageId: data.messageId,
                        chatId: data.chatId,
                        status: 'delivered'
                    });
                    console.log('✅ [message_delivered] Emitted message_status_updated to sender');
                }
            } catch (error) {
                console.error('❌ [message_delivered] Failed to update status:', error);
            }
        };

        // Новый обработчик: Сообщения в чате прочитаны
        const messagesReadHandler = async (socket: AuthenticatedSocket, data: { chatId: string }) => {
            console.log('👁 [messages_read] Data received:', data);
            try {
                const userId = socket.user!._id;
                const chat = await Chat.findById(data.chatId).populate('participants');
                if (!chat) {
                    console.warn('⚠️ [messages_read] Chat not found');
                    return;
                }
                console.log('👁 [messages_read] Chat found, participants:', chat.participants.map(p => p._id.toString()));

                const partner = chat.participants.find(p => p._id.toString() !== userId.toString());
                if (partner) {
                    io.to(partner._id.toString()).emit('messages_marked_as_read', {
                        chatId: data.chatId,
                        readerId: userId
                    });
                    console.log('👁 [messages_read] Emitted messages_marked_as_read to partner', partner._id.toString());
                } else {
                    console.log('👁 [messages_read] No partner found (possibly self-chat)');
                }
            } catch (error) {
                console.error('❌ [messages_read] Failed to emit event:', error);
            }
        };

        socket.on('send_message', validateSocketData(sendMessageSocketSchema, sendMessageHandler));
        socket.on('typing_started', validateSocketData(typingSocketSchema, typingStartedHandler));
        socket.on('typing_stopped', validateSocketData(typingSocketSchema, typingStoppedHandler));
        
        // Регистрируем новые события
        socket.on('message_delivered', validateSocketData(messageStatusSocketSchema, messageDeliveredHandler));
        socket.on('messages_read', validateSocketData(typingSocketSchema, messagesReadHandler)); // Используем ту же схему, что и для typing

        // 4. Обработка отключения с выводом причины
        socket.on('disconnect', (reason) => {
            console.log(`❌ User disconnected: ${socket.id}. Reason: ${reason}`);
            removeUser(user._id.toString(), socket.id);
            // Оповещаем контакты, что пользователь вышел из сети
            contactIds.forEach(contactId => {
                io.to(contactId).emit('user_offline', { userId: user._id });
            });
        });

        // 5. Логирование ошибок сокета
        socket.on('error', (err) => {
            console.error(`⚠️ Socket error on ${socket.id}:`, err);
        });
    });
}; 