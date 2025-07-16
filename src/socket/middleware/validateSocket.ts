// src/socket/middleware/validateSocket.ts
import { z, ZodError } from 'zod';
import { AuthenticatedSocket } from './auth';

type SocketEventHandler = (socket: AuthenticatedSocket, data: any) => Promise<void> | void;

export const validateSocketData = (schema: z.ZodTypeAny, handler: SocketEventHandler) => {
    // Используем обычную функцию, чтобы получить доступ к `this`, который socket.io устанавливает в сам сокет.
    return async function(this: AuthenticatedSocket, data: any) {
        const socket = this; // Правильно получаем сокет
        try {
            const validatedData = schema.parse(data);
            // Передаем сокет и данные в обработчик, как он и ожидает
            await handler(socket, validatedData);
        } catch (error) {
            if (error instanceof ZodError) {
                console.error('Socket validation error:', error.issues);
                socket.emit('error', {
                    message: 'Invalid data received.',
                    details: error.flatten().fieldErrors,
                });
            } else {
                console.error('An unexpected error occurred in socket handler:', error);
                socket.emit('error', { message: 'An internal server error occurred.' });
            }
        }
    };
}; 