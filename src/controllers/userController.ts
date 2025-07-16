import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import { AppError } from '../middleware/errorHandler';

// GET /users/search – поиск пользователей по username или email
export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = (req.query.q as string)?.trim();
        if (!query) {
            return res.status(400).json({ message: 'Query parameter q is required' });
        }

        // Строим регулярное выражение для поиска (безопасно экранируем)
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

        // Ищем пользователей, исключая текущего пользователя
        const users = await User.find({
            $or: [{ username: regex }, { email: regex }],
            _id: { $ne: req.user?._id },
        }).select('username email avatarUrl');

        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
};

// POST /users/contacts – добавить контакт
export const addContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { contactId } = req.body;
        const myId = req.user?._id;

        if (!myId) {
            return next(new AppError('Authentication error', 401));
        }

        if (!mongoose.Types.ObjectId.isValid(contactId)) {
            return next(new AppError('Invalid contact ID', 400));
        }

        if (contactId === String(myId)) {
            return next(new AppError('Cannot add yourself as a contact', 400));
        }

        const contactUser = await User.findById(contactId);
        if (!contactUser) {
            return next(new AppError('User not found', 404));
        }

        // Добавляем контакт, избегая дубликатов
        await User.findByIdAndUpdate(myId, {
            $addToSet: { contacts: contactId },
        });

        res.status(200).json({ message: 'Contact added successfully' });
    } catch (error) {
        next(error);
    }
};

// GET /users/contacts – список контактов
export const getContacts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const myId = req.user?._id;
        if (!myId) {
            return next(new AppError('Authentication error', 401));
        }

        const userWithContacts = await User.findById(myId)
            .populate('contacts', 'username email avatarUrl')
            .select('contacts');

        res.status(200).json(userWithContacts?.contacts || []);
    } catch (error) {
        next(error);
    }
};

// DELETE /users/contacts/:id – удалить контакт
export const removeContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contactId = req.params.id;
        const myId = req.user?._id;

        if (!myId) {
            return next(new AppError('Authentication error', 401));
        }

        if (!mongoose.Types.ObjectId.isValid(contactId)) {
            return next(new AppError('Invalid contact ID', 400));
        }

        await User.findByIdAndUpdate(myId, {
            $pull: { contacts: contactId },
        });

        res.status(200).json({ message: 'Contact removed successfully' });
    } catch (error) {
        next(error);
    }
}; 