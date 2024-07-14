import express from "express";
import { prisma } from "../../config/prisma.js";
import lotSchema from "./lotSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { STATUS } from "@prisma/client";
import { SECRET } from "../../config/secrets.js";
import {z} from "zod";
const lotController = {
    register: async (req, res, next) => {
       try {
         const requiredFields = ["categoryId", "firstName", "middleName", "lastName", "city", "street", "gender"];
           for (const field of requiredFields) {
          if (!req.body[field]) {
           return res.status(403).json({
          success: false,
          message: `${field} is required`,
        });
      }
    }

    const data = lotSchema.register.parse(req.body);
          console.log(data.categoryId);
          console.log('Parsed data:', data);
      
          const catId = data.categoryId;
          const categoryExist = await prisma.category.findFirst({
            where: { id: catId },
          });
      
          if (!categoryExist) {
            return res.status(404).json({
              success: false,
              message: 'Category not found',
            });
          }
      
          console.log('categoryExist:', categoryExist);
      
          const { totalCount, totalAmount } = categoryExist;
      
          if (totalCount === undefined || totalAmount === undefined) {
            return res.status(500).json({
              success: false,
              message: 'Category does not contain totalCount or totalAmount fields',
            });
          }
      
          const newLot = await prisma.lots.create({
            data: {
              isCompleted: false,
              categoryId: data.categoryId,
              registeredBy: 1,//req.user.id, 
              remainingDay: totalCount,
              remainingAmount: totalAmount,
              profile: {
                create: {
                  firstName: data.firstName,
                  middleName: data.middleName,
                  lastName: data.lastName,
                  city: data.city,
                  street: data.street,
                  gender: data.gender.toUpperCase(), 
                  userId: 1//req.user.id, 
                },
              },
            },
            include: {
              category: true, 
              profile: true,  
            },
          });
      
          console.log('New lot created:', newLot); 
      
          return res.status(200).json({
            success: true,
            message: 'Lot registered successfully',
            data: newLot,
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.error('Validation error:', error.errors); 
            return res.status(400).json({
              success: false,
              message: 'Validation error',
              errors: error.errors,
            });
          }
      
          console.error('An error occurred:', error); 
          return res.status(500).json({
            success: false,
            message: 'An error occurred while registering the lot',
          });
        }

      },
    getUserInfo: async (req, res, next) => {
        const lotId = parseInt(req.params.id.substring(1), 10);

        try {
            const lot = await prisma.lots.findUnique({
                where: { id: lotId },
                include: {
                    category: true,
                    profile: true,
                },
            });
    
            if (!lot) {
                return res.status(404).json({
                    success: false,
                    message: 'Lot not found',
                });
            }
    
            return res.status(200).json({
                success: true,
                data: lot,
            });
        } catch (error) {
            console.error('An error occurred:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while retrieving the lot',
            });
        }
    },
    getAllLotosInfo: async (req, res, next) => {
      try {
          const lot = await prisma.lots.findMany({
              include: {
                  category: {
                    include:{
                      _count: true,
                    }
                  },
                  profile: true,
                  deposits: true,
                  loans: true,
                  _count:true,
                  returnedRemaining: true,
                  winners: true,
              },
          });
  
          if (!lot) {
              return res.status(404).json({
                  success: false,
                  message: 'Lot not found',
              });
          }
  
          return res.status(200).json({
              success: true,
              data: lot,
          });
      } catch (error) {
          console.error('An error occurred:', error);
          return res.status(500).json({
              success: false,
              message: 'An error occurred while retrieving the lot',
          });
      }
    },
    getLotwithCategory: async (req, res, next) => {
        const lotId = parseInt(req.params.id.substring(1), 10);

        try {
            const lot = await prisma.lots.findUnique({
                where: { id: lotId },
                include: {
                    category: true,
                },
            });
    
            if (!lot) {
                return res.status(404).json({
                    success: false,
                    message: 'Lot not found',
                });
            }
    
            return res.status(200).json({
                success: true,
                data: lot,
            });
        } catch (error) {
            console.error('An error occurred:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while retrieving the lot',
            });
        }
    },
    getLot: async (req, res, next) => {
        const lotId = parseInt(req.params.id.substring(1), 10);

        try {
            const lot = await prisma.lots.findUnique({
                where: { id: lotId },
                
            });
    
            if (!lot) {
                return res.status(404).json({
                    success: false,
                    message: 'Lot not found',
                });
            }
    
            return res.status(200).json({
                success: true,
                data: lot,
            });
        } catch (error) {
            console.error('An error occurred:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while retrieving the lot',
            });
        }
    },
    getProfile: async (req, res, next) => {
        const lotId = parseInt(req.params.id.substring(1), 10);

        try {
            const lot = await prisma.lots.findUnique({
                where: { id: lotId },
                
            });
    
            if (!lot) {
                return res.status(404).json({
                    success: false,
                    message: 'Lot not found',
                });
            }
           const  profile = await prisma.profiles.findUnique({
                where: { lotId: lotId },
               
            })
    
            return res.status(200).json({
                success: true,
                data: profile,
            });
        } catch (error) {
            console.error('An error occurred:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while retrieving the lot',
            });
        }
    },

    updateProfile: async (req, res, next) => {
        const lotId = parseInt(req.params.id.substring(1), 10);

    try {

        const data = lotSchema.updateProfile.parse(req.body); // Assuming lotSchema is defined elsewhere

        const profile = await prisma.profiles.update({
            where: { lotId: parseInt(lotId, 10) },
            data: {
                firstName:  data.firstName,
                middleName:data.middleName,
                lastName:data.lastName,
                city:data.city,
                street:data.street,
                gender: data.gender.toUpperCase(), // Convert gender to uppercase
            },
            include: {
                lot: true, 
                user: true, 
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: profile,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Validation error:', error.errors); 
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors,
            });
        }

        console.error('An error occurred:', error); 
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the profile',
        });
    }
    },
    
    deleteLot: async (req, res, next) => {
        const lotId = parseInt(req.params.id.substring(1), 10);
    try {
        console.log('Delete function called'); 
            console.log('Lot ID to delete:', lotId);
    
        // Find the lot to ensure it exists
        const lotExist = await prisma.lots.findUnique({
          where: { id: lotId },
          include: { profile: true }, 
        });
    
        if (!lotExist) {
          return res.status(404).json({
            success: false,
            message: 'Lot not found',
          });
        }
    
        const deletedLot = await prisma.lots.delete({
          where: { id: lotId },
          include: { profile: true }, 
        });
    
        console.log('Lot deleted:', deletedLot);
    
        return res.status(200).json({
          success: true,
          message: 'Lot deleted successfully',
          data: deletedLot,
        });
      } catch (error) {
        console.error('An error occurred:', error); 
    
        return res.status(500).json({
          success: false,
          message: 'An error occurred while deleting the lot',
        });
      }




    }

}

export default lotController;