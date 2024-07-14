import { GENDER } from "@prisma/client";
import {z} from "zod"
const userSchema = {
    register: z.object({
      password: z.string().min(6),
      email: z.string().email(),
      firstName: z.string().min(1),
      middleName: z.string().min(1),
      lastName: z.string().min(1),
    }),
    login: z.object({
      password: z.string().min(6),
      email: z.string().email(),
    }),
    changePassword: z.object({
      oldPassword: z.string().min(6),
      newPassword: z.string().min(6),
      id: z.number().min(1),
    }),
    update: z.object({
      firstName: z.string().min(1),
      middleName: z.string().min(1),
      lastName: z.string().min(1),
    }),



};
export default userSchema;