// src/models/Message.ts
import { Schema, model, Document, Types } from 'mongoose';

interface IMessage extends Document {
    _id: Types.ObjectId;
    sender: Types.ObjectId; // Ссылка на отправителя (User)
    chat: Types.ObjectId;   // Ссылка на чат (Chat)
    content: string;        // Текстовое содержимое сообщения
    status: 'sent' | 'delivered' | 'read'; // Статус сообщения
    // В будущем здесь будут статусы (sent, delivered, read), вложения и т.д.
}

const messageSchema = new Schema<IMessage>(
    {
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User', // Связь с моделью User
            required: true,
        },
        chat: {
            type: Schema.Types.ObjectId,
            ref: 'Chat', // Связь с моделью Chat
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ['sent', 'delivered', 'read'],
            default: 'sent',
        },
    },
    {
        timestamps: true, // Добавляет createdAt и updatedAt
    }
);

const Message = model<IMessage>('Message', messageSchema);

export default Message;
export type { IMessage }; 