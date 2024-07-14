import express from "express"
import jwt from 'jsonwebtoken';
import { SECRET } from '../config/secrets.js';
import { prisma } from '../config/prisma.js';
import { ROLE } from '@prisma/client';

const isAuthUser = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const payload = await jwt.verify(token, SECRET);
    const user = await prisma.users.findUnique({
      where: {
        id: payload.id,
      },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    req.user = user;
    req.userId = user.id

    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

const isAdmin = async (req, res, next) => {
  const admin = req.user;
  if (admin && admin.role !== ROLE.ADMIN) {
    return res.status(401).json({ success: false, message: 'User not admin' });
  }
  next();
};
const isUser = async (req, res, next) => {
  const user = req.user;
  if (user && user.role !== ROLE.USER) {
    return res.status(401).json({ success: false, message: 'User not a regular user' });
  }
  next();
};

export { isAuthUser, isAdmin, isUser };


