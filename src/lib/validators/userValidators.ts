import { z } from 'zod';
import mongoose from 'mongoose';

const isMongoId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// GET /users/search
export const searchUsersSchema = z.object({
    query: z.object({
        q: z.string().min(1, 'Query cannot be empty'),
    }),
});

// POST /users/contacts
export const addContactSchema = z.object({
    body: z.object({
        contactId: z.string().refine(isMongoId, { message: 'Invalid contact ID' }),
    }),
});

// DELETE /users/contacts/:id
export const removeContactSchema = z.object({
    params: z.object({
        id: z.string().refine(isMongoId, { message: 'Invalid contact ID' }),
    }),
}); 