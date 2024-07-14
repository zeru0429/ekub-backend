import express from "express"; // Assuming you're using Express
import remainingPaymentSchema from "./remainingPaymenSchema.js";
import prisma from "../../config/prisma.js";
import { isAuthUser, isAdmin } from "../../middlewares/auth.js";

const remainingController = {
  register: async (req, res, next) => {
    const data = remainingPaymentSchema.register.parse(req.body);
    try {
      const deposit = await prisma.deposits.findFirst({
        where: { id: data.depositId },
    });

    // Check if the deposit exists
    if (!deposit) {
        return res.status(404).json({
            success: false,
            message: 'Deposit not found',
        });
    }
      
        // Fetch the lot using lotId from request body
        const lot = await prisma.lots.findUnique({
            where: { id: deposit.lotId },
        })

        // Check if the lot exists
        if (!lot) {
            return res.status(404).json({
                success: false,
                message: 'Lot not found',
            });
        }

        // Fetch the category using categoryId from the lot
        const categoryId = lot.categoryId;
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
        });

        // Check if the category exists
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }

          // Calculate the new amounts considering defaults if not provided
          const amountPaid = parseFloat(data.amountPaid || 0);
          const commissionPaid = parseFloat(data.commissionPaid || 0);
          const newAmout = parseFloat(deposit.amount) + amountPaid;
          const newCommission = parseFloat(deposit.commition) + commissionPaid;
  
          // Check if the new amounts exceed the category limits
          if (newAmout > category.amount) {
              return res.status(400).json({
                  success: false,
                  message: `The amount you are trying to deposit exceeds the remaining amount. You can only deposit up to ${category.amount - deposit.amount}.`
              });
          }
  
          if (newCommission > category.commition) {
              return res.status(400).json({
                  success: false,
                  message: `The commission you are trying to deposit exceeds the remaining commission. You can only deposit up to ${category.commition - deposit.commition}.`
              });
          }

      
        // Create a new remaining payment entry
        const remainingPayment = await prisma.remainingPayement.create({
            data: {
                amountPaid: data.amountPaid || 0,
                commissionPaid: data.commissionPaid || 0,
                // count: deposit.count , // Default count to 1 if not provided
                userId: req.user.id,
                lotId: deposit.lotId,
                depositId: data.depositId,
            },
        });

        // Calculate new amounts for deposit
        const newAmount = parseFloat(deposit.amount) + parseFloat(data.amountPaid || 0);
        const newCommition = parseFloat(deposit.commition) + parseFloat(data.commissionPaid || 0);
        const remainingAmount = parseFloat(deposit.remainingAmountPerDeposit) - parseFloat(data.amountPaid || 0);
        const remainingCommission = parseFloat(deposit.remainingCommissionPerDeposit) - parseFloat(data.commissionPaid || 0);

        // Update the deposit with new calculated values
        const updatedDeposit = await prisma.deposits.update({
            where: { id: deposit.id },
            data: {
                amount: newAmount,
                commition: newCommition,
                remainingAmountPerDeposit: remainingAmount,
                remainingCommissionPerDeposit: remainingCommission,
            },
        });

        // Calculate new cumulative payment and completion status for the lot
        const cumulativePayment = parseFloat(lot.cumulativePayment) + parseFloat(data.amountPaid || 0) + parseFloat(data.commissionPaid || 0);
        const isCompleted = cumulativePayment >= parseFloat(lot.totalAmount);

        // Update the lot with new calculated values
        const updatedLot = await prisma.lots.update({
            where: { id: deposit.lotId },
            data: {
                remainingAmount: parseFloat(lot.remainingAmount) - parseFloat(data.amountPaid || 0) - parseFloat(data.commissionPaid || 0 ),
                cumulativePayment: cumulativePayment,
                isCompleted: isCompleted,
            },
        });

        // Return success response with updated data
        return res.status(200).json({
            success: true,
            message: 'Registered remaining payment successfully',
            data: updatedDeposit,
            updatedLot: updatedLot,
            remainingPayment: remainingPayment,
        });
    } catch (error) {
        next(error);
    }
},
update: async (req, res, next) => {
  
  const id = parseInt(req.params.id.substring(1), 10);

  const data = remainingPaymentSchema.update.parse(req.body);
  try {

    const existingPayment = await prisma.remainingPayement.findUnique({
          where: { id: id },
      });

      if (!existingPayment) {
          return res.status(404).json({
              success: false,
              message: 'Remaining payment not found',
          });
      }

      // Fetch the lot using lotId from existing payment
      const lot = await prisma.lots.findUnique({
          where: { id: existingPayment.lotId },
      });

      // Check if the lot exists
      if (!lot) {
          return res.status(404).json({
              success: false,
              message: 'Lot not found',
          });
      }

      // Fetch the deposit using depositId from existing payment
      const deposit = await prisma.deposits.findFirst({
          where: { id: existingPayment.depositId },
      });

      // Check if the deposit exists
      if (!deposit) {
          return res.status(404).json({
              success: false,
              message: 'Deposit not found',
          });
      }
const categoryId = lot.categoryId
const category = await prisma.category.findUnique({
    where: { id: categoryId },
});



      // Calculate the difference in amounts
      const amountDifference = parseFloat(data.amountPaid || 0) - parseFloat(existingPayment.amountPaid || 0);
      console.log(amountDifference);
      const commissionDifference = parseFloat(data.commissionPaid || 0) - parseFloat(existingPayment.commissionPaid || 0);

      
      const newAmount = parseFloat(deposit.amount) + amountDifference;
      console.log(deposit.amount);
      console.log(newAmount);
      const newCommition = parseFloat(deposit.commition) + commissionDifference;
      const remainingAmount = parseFloat(deposit.remainingAmountPerDeposit) - amountDifference;
      const remainingCommission = parseFloat(deposit.remainingCommissionPerDeposit) - commissionDifference;






      if ( newAmount > category.amount) {
        return res.status(400).json({
            success: false,
            message: `The  amount you are trying to deposit exceeds the remainig amount . You can only deposit up to ${parseFloat(category.amount) - parseFloat(deposit.amount)+ parseFloat(existingPayment.amountPaid)}.`
        });
    }

    if (newCommition > category.commition) {
        return res.status(400).json({
            success: false,
            message: `The  amount you are trying to deposit exceeds the remainig commission. You can only deposit up to ${parseFloat(category.commition) - parseFloat(deposit.commition)+ parseFloat(existingPayment.commissionPaid)}.`
        });
    } 
      // Update the existing remaining payment entry
      const updatedPayment = await prisma.remainingPayement.update({
          where: { id: id },
          data: {
              amountPaid: parseFloat(data.amountPaid),
              commissionPaid: parseFloat(data.commissionPaid),
            //   count: existingPayment.count,
          },
      });
      const updatedDeposit = await prisma.deposits.update({
          where: { id: deposit.id },
          data: {
              amount: newAmount,
              commition: newCommition,
              remainingAmountPerDeposit: remainingAmount,
              remainingCommissionPerDeposit: remainingCommission,
          },
      });

      // Calculate new cumulative payment and completion status for the lot
      const cumulativePayment = parseFloat(lot.cumulativePayment) + amountDifference + commissionDifference;
      const isCompleted = cumulativePayment >= parseFloat(lot.totalAmount);

      // Update the lot with new calculated values
      const updatedLot = await prisma.lots.update({
          where: { id: existingPayment.lotId },
          data: {
              remainingAmount: parseFloat(lot.remainingAmount) - amountDifference  - commissionDifference,
              cumulativePayment: cumulativePayment,
              isCompleted: isCompleted,
          },
      });

      return res.status(200).json({
          success: true,
          message: 'Updated remaining payment successfully',
          data: updatedDeposit,
          updatedLot: updatedLot,
          remainingPayment: updatedPayment,
      });
  } catch (error) {
      next(error);
  }
},

delete: async (req, res, next) => {
  const id = parseInt(req.params.id.substring(1)); 

  try {
      // Fetch the existing remaining payment using its ID
      const remainingPayment = await prisma.remainingPayement.findUnique({
          where: { id: id },
      });

      // Check if the remaining payment exists
      if (!remainingPayment) {
          return res.status(404).json({
              success: false,
              message: 'Remaining payment not found',
          });
      }

      // Fetch the lot using lotId from the remaining payment
      const lot = await prisma.lots.findUnique({
          where: { id: remainingPayment.lotId },
      });

      // Check if the lot exists
      if (!lot) {
          return res.status(404).json({
              success: false,
              message: 'Lot not found',
          });
      }

      // Fetch the deposit using depositId from the remaining payment
      const deposit = await prisma.deposits.findFirst({
          where: { id: remainingPayment.depositId },
      });

      // Check if the deposit exists
      if (!deposit) {
          return res.status(404).json({
              success: false,
              message: 'Deposit not found',
          });
      }

      // Delete the remaining payment entry
      await prisma.remainingPayement.delete({
          where: { id: id },
      });

      // Calculate new amounts for deposit
      const newAmount = parseFloat(deposit.amount) - parseFloat(remainingPayment.amountPaid || 0);
      const newCommition = parseFloat(deposit.commition) - parseFloat(remainingPayment.commissionPaid || 0);
      const remainingAmount = parseFloat(deposit.remainingAmountPerDeposit) + parseFloat(remainingPayment.amountPaid || 0);
      const remainingCommission = parseFloat(deposit.remainingCommissionPerDeposit) + parseFloat(remainingPayment.commissionPaid || 0);

      // Update the deposit with new calculated values
      const updatedDeposit = await prisma.deposits.update({
          where: { id: deposit.id },
          data: {
              amount: newAmount,
              commition: newCommition,
              remainingAmountPerDeposit: remainingAmount,
              remainingCommissionPerDeposit: remainingCommission,
          },
      });

      // Calculate new cumulative payment and completion status for the lot
      const cumulativePayment = parseFloat(lot.cumulativePayment) - parseFloat(remainingPayment.amountPaid || 0) - parseFloat(remainingPayment.commissionPaid || 0);
      const isCompleted = cumulativePayment >= parseFloat(lot.totalAmount);

      // Update the lot with new calculated values
      const updatedLot = await prisma.lots.update({
          where: { id: remainingPayment.lotId },
          data: {
              remainingAmount: parseFloat(lot.remainingAmount) + parseFloat(remainingPayment.amountPaid || 0) + parseFloat(remainingPayment.commissionPaid || 0) ,
              cumulativePayment: cumulativePayment,
              isCompleted: isCompleted,
          },
      });

      // Return success response with updated data
      return res.status(200).json({
          success: true,
          message: 'Remaining payment deleted successfully',
          data: remainingPayment,
          updatedDeposit: updatedDeposit,
          updatedLot: updatedLot,

      });
  } catch (error) {
      next(error);
  }
},

getSingle: async (req, res, next) => {
  const id = parseInt(req.params.id.substring(1)); // Assuming the id of the remaining payment is passed as a URL parameter

  try {
      // Fetch the remaining payment using its id
      const remainingPayment = await prisma.remainingPayement.findUnique({
          where: { id: id },
          include: {
              deposit: true, // Include the related deposit
          },
      });

      // Check if the remaining payment exists
      if (!remainingPayment) {
          return res.status(404).json({
              success: false,
              message: 'Remaining payment not found',
          });
      }

      // Fetch the related deposit using depositId from remaining payment
      const deposit = remainingPayment.deposit;

      // Fetch the lot using lotId from the deposit
      const lot = await prisma.lots.findUnique({
          where: { id: deposit.lotId },
      });

      // Check if the lot exists
      if (!lot) {
          return res.status(404).json({
              success: false,
              message: 'Lot not found',
          });
      }

      // Fetch the category using categoryId from the lot
      const categoryId = lot.categoryId;
      const category = await prisma.category.findUnique({
          where: { id: categoryId },
      });

      // Check if the category exists
      if (!category) {
          return res.status(404).json({
              success: false,
              message: 'Category not found',
          });
      }

      // Return success response with remaining payment, deposit, lot, and category data
      return res.status(200).json({
          success: true,
          message: 'Fetched remaining payment successfully',
          data: {
              remainingPayment: remainingPayment,
              deposit: deposit,
              lot: lot,
              category: category,
          },
      });
  } catch (error) {
      next(error);
  }
},



}

;

export default remainingController;
