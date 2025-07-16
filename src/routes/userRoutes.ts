import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
    searchUsersSchema,
    addContactSchema,
    removeContactSchema,
} from '../lib/validators/userValidators';
import {
    searchUsers,
    addContact,
    getContacts,
    removeContact,
} from '../controllers/userController';

const router = Router();

// Поиск пользователей открыт для всех авторизованных пользователей (можно и без авторизации, если нужно)
router.get('/search', protect, validate(searchUsersSchema), searchUsers);

// Группируем эндпоинты контактов, все требуют авторизации
router.use('/contacts', protect);

// POST /users/contacts – добавить контакт
router.post('/contacts', validate(addContactSchema), addContact);

// GET /users/contacts – получить список контактов
router.get('/contacts', getContacts);

// DELETE /users/contacts/:id – удалить контакт
router.delete('/contacts/:id', validate(removeContactSchema), removeContact);

export default router; 