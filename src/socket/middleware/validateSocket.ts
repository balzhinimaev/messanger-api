// src/socket/middleware/validateSocket.ts
import { z, ZodError } from 'zod';
import { AuthenticatedSocket } from './auth';

type SocketEventHandler = (socket: AuthenticatedSocket, data: any) => void;

export const validateSocketData = (schema: z.ZodTypeAny, handler: SocketEventHandler) => {
    return (socket: AuthenticatedSocket, data: any) => {
        try {
            const validatedData = schema.parse(data);
            handler(socket, validatedData);
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