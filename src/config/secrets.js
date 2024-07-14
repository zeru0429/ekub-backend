import dotenv from "dotenv";
dotenv.config();

export const HOST = process.env.HOST;
export const PORT = process.env.PORT;
export const SECRET = process.env.JWT_SECRET;
export const EMAIL = process.env.EMAIL;
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
