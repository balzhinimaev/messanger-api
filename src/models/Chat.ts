// src/models/Chat.ts
import { Schema, model, Document, Types } from 'mongoose';

interface IChat extends Document {
    _id: Types.ObjectId;
    name?: string; // Имя чата (для групп в будущем)
    isGroupChat: boolean;
    participants: Types.ObjectId[]; // Массив участников (User)
    lastMessage?: Types.ObjectId; // Ссылка на последнее сообщение
    // admin?: Types.ObjectId; // Для групповых чатов в будущем
}

const chatSchema = new Schema<IChat>(
    {
        name: {
            type: String,
            trim: true,
        },
        isGroupChat: {
            type: Boolean,
            default: false,
        },
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
        },
    },
    {
        timestamps: true, // updatedAt будет показывать время последнего сообщения
    }
);

const Chat = model<IChat>('Chat', chatSchema);

export default Chat;
export type { IChat }; 