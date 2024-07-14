import express from "express";
import { prisma } from "../../config/prisma.js";
import loanSchema from "./loanSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { STATUS } from "@prisma/client";
import { SECRET } from "../../config/secrets.js";
import {z} from "zod";
import {isAuthUser,isAdmin} from "../../middlewares/auth.js"
// import { generatePassword } from "../../util/generateor.js";
// import { sendEmail } from "../../util/emailSender.js";

const loanController = {
      register: async (req, res, next) => {
        try {
          
          const requiredFields = ["lotId", "amount"];
          for (const field of requiredFields) {
            if (!req.body[field]) {
              return res.status(403).json({
                success: false,
                message: `${field} is required`,
              });
            }
          }
      
          const data = loanSchema.register.parse(req.body);
      
          const lot = await prisma.lots.findUnique({
            where: { id: data.lotId },
          });
      
          if (!lot) {
            return res.status(404).json({
              success: false,
              message: 'Lot not found',
            });
          }

          const winner = await prisma.winners.findFirst({
            where: { lotId: data.lotId },
          });
          console.log(data.lotId);
      console.log(winner);
         
      if (winner) {
        return res.status(400).json({
          success: false,
          message: "You cannot get a loan because you are already registered as a winner for this round",
        });
      }
          const loans = await prisma.loans.findMany({
            where: {
              lotId: data.lotId,
            },
          });
      
          const totalBorrowed = loans.reduce((acc, loan) => acc + parseFloat(loan.amount), 0);
      
          let allowedLoan;
          if (loans.length === 0) {
            allowedLoan = parseFloat(lot.cumulativePayment) / 2;
          } else {
            allowedLoan = ((parseFloat(lot.cumulativePayment) - totalBorrowed) - totalBorrowed) / 2;
          }
      
          if (data.amount <= allowedLoan) {
            const newLoan = await prisma.loans.create({
              data: {
                amount: parseFloat(data.amount),
                // count : data.count,
                lotId: data.lotId,
                userId: req.user.id,
              },
            });
            return res.status(200).json({
              success: true,
              data: newLoan,
            });
          } else {
            return res.status(400).json({
              success: false,
              message: `You are only allowed to get a loan of up to ${allowedLoan}`,
            });
          }
        } catch (error) {
          next(error);
        }
      },
      updateLoan: async (req, res, next) => {
        const loanId = parseInt(req.params.id.substring(1));
        const data = loanSchema.update.parse(req.body);
      
        try {
          const existingLoan = await prisma.loans.findUnique({
            where: { id: loanId },
          });
      
          if (!existingLoan) {
            return res.status(404).json({
              success: false,
              message: 'Loan not found',
            });
          }
      
          const lot = await prisma.lots.findUnique({
            where: { id: existingLoan.lotId },
          });
      
          if (!lot) {
            return res.status(404).json({
              success: false,
              message: 'Lot not found',
            });
          }
      
          const loans = await prisma.loans.findMany({
            where: { lotId: existingLoan.lotId, id: { not: loanId } },
          });
  
          
          const totalBorrowed = loans.reduce((acc, loan) => acc + parseFloat(loan.amount), 0);
      
          let allowedLoan;
          if (loans.length === 0) {
            allowedLoan = parseFloat(lot.cumulativePayment) / 2;
          } else {
            allowedLoan = ((parseFloat(lot.cumulativePayment) - totalBorrowed) - parseFloat(totalBorrowed)) / 2;
          }
      
          if (data.amount <= allowedLoan) {
            const updatedLoan = await prisma.loans.update({
              where: { id: loanId },
              data: {
                amount: parseFloat(data.amount),
                // count: data.count,
                userId: req.user.id,
              },
            });
      
            return res.status(200).json({
              success: true,
              message: 'Loan updated successfully',
              data: updatedLoan,
            });
          } else {
            return res.status(400).json({
              success: false,
              message: `You are only allowed to update the loan amount up to ${allowedLoan}`,
            });
          }
        } catch (error) {
          next(error);
        }
      },
      deleteLoan: async (req, res, next) => {
        const loanId = parseInt(req.params.id.substring(1)); 
      
        try {
          // Find the existing loan
          const existingLoan = await prisma.loans.findUnique({
            where: { id: loanId },
          });
      
          if (!existingLoan) {
            return res.status(404).json({
              success: false,
              message: 'Loan not found',
            });
          }
      
          // Find the lot associated with the loan
          const lot = await prisma.lots.findUnique({
            where: { id: existingLoan.lotId },
          });
      
          if (!lot) {
            return res.status(404).json({
              success: false,
              message: 'Lot not found',
            });
          }
          // Delete the loan
        const deletedLoan=   await prisma.loans.delete({
            where: { id: loanId },
          });
      
          return res.status(200).json({
            success: true,
            message: 'Loan deleted successfully',
            data : deletedLoan, // Send allowed loan for reference if needed
          });
        } catch (error) {
          next(error);
        }
      },
      
      getAllLoans: async (req, res, next) => {
        try {
          const allLoans = await prisma.loans.findMany({
            include:{
              lot:{
                include:{
                  profile: true,
                  category:true,
                }
              }
            }
          });
      
          return res.status(200).json({
            success: true,
            message: 'Loans fetched successfully',
            data: allLoans,
          });
        } catch (error) {
          next(error);
        }
      },
      getLoanById: async (req, res, next) => {
        const loanId = parseInt(req.params.id.substring(1)); 
      
        try {
          const loan = await prisma.loans.findUnique({
            where: { id: loanId },
          });
      
          if (!loan) {
            return res.status(404).json({
              success: false,
              message: 'Loan not found',
            });
          }
      
          return res.status(200).json({
            success: true,
            message: 'Loan fetched successfully',
            data: loan,
          });
        } catch (error) {
          next(error);
        }
      },
      
        
      


    }
    export default loanController;