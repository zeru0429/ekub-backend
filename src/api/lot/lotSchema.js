import { z } from 'zod';
import { GENDER } from '@prisma/client';

 const lotSchema = {
  register: z.object({
    categoryId: z.number().int().positive(),
    firstName: z.string().min(1).max(255),
    middleName: z.string().min(1).max(255),
    lastName: z.string().min(1).max(255),
    gender: z.nativeEnum(GENDER),
    city: z.string().min(1).max(255),
    street: z.string().min(1).max(255),
  }),
  updateProfile: z.object({
    firstName: z.string().min(1).max(255).optional(),
    middleName: z.string().min(1).max(255).optional(),
    lastName: z.string().min(1).max(255).optional(),
    gender: z.nativeEnum(GENDER).optional(),
    city: z.string().min(1).max(255).optional(),
    street: z.string().min(1).max(255).optional(),
  }),
};
export default lotSchema;