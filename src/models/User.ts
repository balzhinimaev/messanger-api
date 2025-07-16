// src/models/User.ts
import { Schema, model, Document, Types } from 'mongoose';

// Интерфейс для представления документа пользователя в TypeScript
interface IUser extends Document {
    _id: Types.ObjectId;
    username: string;
    email: string;
    passwordHash: string;
    avatarUrl?: string; // Опциональное поле для аватара
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true, // Имя пользователя должно быть уникальным
            trim: true,
            lowercase: true,
            minlength: [3, 'Username must be at least 3 characters long'],
            maxlength: [30, 'Username must be at most 30 characters long'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true, // Email должен быть уникальным
            trim: true,
            lowercase: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'], // Валидация формата email
        },
        passwordHash: {
            type: String,
            required: [true, 'Password is required'],
            select: false, // По умолчанию, пароль не будет возвращаться в запросах
        },
        avatarUrl: {
            type: String,
            default: '', // Пустая строка по умолчанию, если нет аватара
        },
    },
    {
        timestamps: true, // Автоматически добавляет поля createdAt и updatedAt
    }
);

// Важно: Если вы используете Mongoose v6+, то get, set и методы больше не являются частью схемы по умолчанию.
// Если вам нужны методы (например, для проверки пароля), их нужно определить через `userSchema.methods`.
// Для хеширования пароля мы будем использовать bcryptjs в логике контроллера при регистрации.

// Создание модели на основе схемы
const User = model<IUser>('User', userSchema);

export default User;
export type { IUser }; // Экспортируем тип для использования в других частях приложения 