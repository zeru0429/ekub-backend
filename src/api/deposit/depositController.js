import express from "express";
import { prisma } from "../../config/prisma.js";
import depositSchema from "./depositSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { STATUS } from "@prisma/client";
import { SECRET } from "../../config/secrets.js";
import {z} from "zod";
import {isAuthUser,isAdmin} from "../../middlewares/auth.js"
import { startOfWeek, endOfWeek, eachDayOfInterval,addDays , format } from 'date-fns';
import { startOfMonth, endOfMonth } from 'date-fns';
import { startOfYear, endOfYear, getMonth, addWeeks  } from 'date-fns';
import { parseISO, startOfDay, endOfDay } from 'date-fns';


const depositController = {
  register: async (req, res, next) => {

  const requiredFields = ["lotId", "amount", "commition"];
  for (const field of requiredFields) {
  if (!req.body[field]) {
  return res.status(403).json({
  success: false,
  message: `${field} is required`,
  });
  }
  }

  const data = depositSchema.register.parse(req.body);  
  try {
  const lot = await prisma.lots.findUnique({
  where: { id: data.lotId },
  });

  if (!lot) {
  return res.status(404).json({
  success: false,
  message: 'Lot not found',
  });
  }

  const categoryId = lot.categoryId;
  const category = await prisma.category.findUnique({
  where: { id: categoryId },
  });

  if (!category) {
  return res.status(404).json({
  success: false,
  message: 'Category not found',
  });
  }

  req.body.remainingAmount = parseFloat(lot.remainingAmount) - (parseFloat(req.body.amount) + parseFloat(req.body.commition));
  req.body.remainingDay = parseInt(lot.remainingDay) - 1;
  req.body.cumulativePayment = parseFloat(lot.cumulativePayment) + (parseFloat(req.body.amount) + parseFloat(req.body.commition)); // Update cumulative payment
  if (data.amount > category.amount) {
  return res.status(400).json({
  success: false,
  message: `The deposit amount exceeds the amount allowed for one cycle. You can only deposit up to ${category.amount}.`
  });
  }

  if (data.commition > category.commition) {
  return res.status(400).json({
  success: false,
  message: `The commission exceeds the allowed amount for one cycle. You can only deposit up to ${category.commition}.`
  });
  }   if(req.body.cumulativePayment> category.totalAmount) {
  return res.status(400).json({
  success: false,
  message: `The cumulative payment exceeds the total allowed amount.. You can only deposit up to ${lot.remainingAmount}.`,
  });
  }
  // const cycleAmount = parseFloat(category.totalAmount) / parseFloat(category.totalCount);
  req.body.remainingAmountPerDeposit= category.amount - data.amount
  req.body.remainingCommissionPerDeposit = category.commition - data.commition
  // req.body.remaining = cycleAmount - (parseFloat(req.body.amount) + parseFloat(req.body.commition));
  req.body.count =  category.totalCount - lot.remainingDay + 1

  const newDeposit = await prisma.deposits.create({
  data: {
  amount: parseFloat(data.amount),
  commition: parseFloat(data.commition),
  remainingAmountPerDeposit: parseFloat(req.body.remainingAmountPerDeposit),
  remainingCommissionPerDeposit: parseFloat(req.body.remainingCommissionPerDeposit),
  count : req.body.count,
  userId: req.user.id,
  lotId: data.lotId,
  },
  });



  const updatedLot = await prisma.lots.update({
  where: { id: data.lotId },
  data: {
  remainingAmount: req.body.remainingAmount, 
  remainingDay: req.body.remainingDay,
  cumulativePayment: req.body.cumulativePayment, 
  isCompleted: req.body.remainingAmount === 0 ? true : false,
  },
  });

  return res.status(200).json({
  success: true,
  message: 'register deposit',
  data: newDeposit,
  updatedLot: updatedLot,
  });

  } catch (error) {
  next(error);
  }
  },
  update: async (req, res, next) => {
  const id = parseInt(req.params.id.substring(1));
  const data = depositSchema.update.parse(req.body);

  try {
  const existingDeposit = await prisma.deposits.findUnique({
  where: { id: id },
  });

  if (!existingDeposit) {
  return res.status(404).json({
  success: false,
  message: 'Deposit not found',
  });
  }

  const lot = await prisma.lots.findUnique({
  where: { id: existingDeposit.lotId },
  });

  if (!lot) {
  return res.status(404).json({
  success: false,
  message: 'Lot not found',
  });
  }

  const categoryId = lot.categoryId;
  const category = await prisma.category.findUnique({
  where: { id: categoryId },
  });

  if (!category) {
  return res.status(404).json({
  success: false,
  message: 'Category not found',
  });
  }


  const amountDifference = data.amount - existingDeposit.amount;
  const commitionDifference = data.commition - existingDeposit.commition;

  req.body.remainingAmount = lot.remainingAmount - amountDifference - commitionDifference;
  req.body.remainingDay = lot.remainingDay; // No change in remainingDay unless it's specific to the deposit
  const cumulativePayment = parseInt(lot.cumulativePayment) + parseInt(amountDifference) + parseInt(commitionDifference); // Update cumulative payment
  if (data.amount > category.amount) {
  return res.status(400).json({
  success: false,
  message: `The deposit amount exceeds the amount allowed for one cycle. You can only deposit up to ${category.amount}.`
  });
  }

  if (data.commition > category.commition) {
  return res.status(400).json({
  success: false,
  message: `The commission exceeds the allowed amount for one cycle. You can only deposit up to ${category.commition}.`
  });
  } 



  if(cumulativePayment > category.totalAmount) {
  return res.status(400).json({
  success: false,
  message: `Deposit amount exceeds the remaining amount. You can only deposit up to ${parseFloat(lot.remainingAmount) + parseFloat(existingDeposit.amount)+ parseFloat(existingDeposit.commition) }.`,
  });
  }

  // const cycleAmount = category.totalAmount / category.totalCount;
  req.body.remainingAmountPerDeposit= category.amount - data.amount
  req.body.remainingCommissionPerDeposit = category.commition - data.commition
  // req.body.remaining = cycleAmount - (req.body.amount + req.body.commition);

  const updatedDeposit = await prisma.deposits.update({
  where: { id: id },
  data: {
  amount: data.amount,
  commition: data.commition,
  remainingAmountPerDeposit: parseFloat(req.body.remainingAmountPerDeposit),
  remainingCommissionPerDeposit: parseFloat(req.body.remainingCommissionPerDeposit), },
  });

  const updatedLot = await prisma.lots.update({
  where: { id: existingDeposit.lotId },
  data: {
  remainingAmount: req.body.remainingAmount,
  cumulativePayment: cumulativePayment, // Save cumulative payment
  isCompleted: req.body.remainingAmount === 0 ? true : false,
  },
  });

  return res.status(200).json({
  success: true,
  message: 'update deposit',
  data: updatedDeposit,
  updatedLot: updatedLot,
  });

  } catch (error) {
  next(error);
  }
  },    

  getSingleDeposit: async (req, res, next) => {
  const  id  = parseInt(req.params.id.substring(1));

    try {
      const deposit = await prisma.deposits.findUnique({
        where: { id: id },
        include: {
          lot: true, // Include related lot information
        },
      });

      if (!deposit) {
        return res.status(404).json({
          success: false,
          message: 'Deposit not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'fetched single deposit',
        data: deposit,
      });

    } catch (error) {
      next(error);
    }
  }, 
  getAllDeposits: async (req, res, next) => {

  try {
    const deposits = await prisma.deposits.findMany({
      include: {
        lot: true, // Include related lot information
      },
    });

    return res.status(200).json({
      success: true,
      message: 'fetch all deposits',
      data: deposits,
    });

  } catch (error) {
    next(error);
  }
  },
  deleteDeposit: async (req, res, next) => {
    const id = parseInt(req.params.id.substring(1));
    try {
      const existingDeposit = await prisma.deposits.findUnique({
        where: { id: id },
      });

      if (!existingDeposit) {
        return res.status(404).json({
          success: false,
          message: 'Deposit not found',
        });
      }

      const lot = await prisma.lots.findUnique({
        where: { id: existingDeposit.lotId },
      });

      if (!lot) {
        return res.status(404).json({
          success: false,
          message: 'Lot not found',
        });
      }

      const amountDifference = parseFloat(existingDeposit.amount);
      const commitionDifference = parseFloat(existingDeposit.commition);

      req.body.remainingAmount = parseFloat(lot.remainingAmount) + amountDifference + commitionDifference;
      req.body.remainingDay = parseInt(lot.remainingDay) + 1;
      const cumulativePayment = parseFloat(lot.cumulativePayment) - amountDifference - commitionDifference ;

      const updatedLot = await prisma.lots.update({
        where: { id: existingDeposit.lotId },
        data: {
          remainingAmount: req.body.remainingAmount,
          remainingDay: req.body.remainingDay,
          cumulativePayment: cumulativePayment, // Update cumulative payment
          isCompleted: req.body.remainingAmount !== 0 ? false : true,
        },
      });

      await prisma.deposits.delete({
        where: { id: id },
      });

      return res.status(200).json({
        success: true,
        message: 'delete deposit',
        updatedLot: updatedLot,
      });

    } catch (error) {
      next(error);
    }
  },
  getDepositsWithinDay: async (req, res, next) => {
  const { day } = req.query; // Optional: you can pass a specific day as a query parameter

  try {
  const startOfDay = new Date(day || Date.now());
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const deposits = await prisma.deposits.findMany({
  where: {
  createdAt: {
    gte: startOfDay,
    lte: endOfDay,
  },
  },
  });

  return res.status(200).json({
  success: true,
  message: 'Deposits fetched successfully for the day',
  data: deposits,
  });
  } catch (error) {
  next(error);
  }
  },
  getAllStatistics: async (req, res, next) => {
    try {
      const today = new Date();
      const startOfMonthDate = startOfMonth(today);
      const endOfMonthDate = endOfMonth(today);
  
      const monthDays = eachDayOfInterval({ start: startOfMonthDate, end: endOfMonthDate });
    
      const depositsByDay = await Promise.all(
        monthDays.map(async (day) => {
          const formattedDay = format(day, 'yyyy-MM-dd');
          const deposits = await prisma.deposits.findMany({
            where: {
              AND: [
                { createdAt: { gte: day } },
                { createdAt: { lt: new Date(day.getTime() + 24 * 60 * 60 * 1000) } }, // Next day
              ],
            },
            include: {
              _count: true,
              remainingPayment: {
                distinct:"amountPaid"
              }
            }

          
          });
          return { day: formattedDay, deposits };
        })
      );

  
      return res.status(200).json({
        success: true,
        message: 'Deposits within this month grouped by day',
        data: depositsByDay,
      });
    } catch (error) {
      console.error('Error in getDepositsWithinMonthByDay:', error);
      next(error);
    }
  },

  ///get deposit of a week where 
  getDepositsGroupedByDay : async (req, res, next) => {
    try {
      const deposits = await prisma.deposits.findMany();
  
      if (deposits.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No deposits found',
          data: {},
        });
      }
  
      // Determine the range of dates for the deposits
      const firstDepositDate = startOfDay(new Date(Math.min(...deposits.map(d => new Date(d.createdAt)))));
      const lastDepositDate = startOfDay(new Date(Math.max(...deposits.map(d => new Date(d.createdAt)))));
  
      // Initialize an object to hold deposits grouped by day
      const groupedDeposits = {};
  
      // Create an entry for each day in the interval, even if there are no deposits for that day
      eachDayOfInterval({ start: firstDepositDate, end: lastDepositDate }).forEach((date) => {
        const dayKey = date.toISOString().split('T')[0];
        groupedDeposits[dayKey] = [];
      });
  
      // Group deposits by their creation day
      deposits.forEach((deposit) => {
        const depositDate = deposit.createdAt.toISOString().split('T')[0];
        if (groupedDeposits[depositDate]) {
          groupedDeposits[depositDate].push(deposit);
        }
      });
  
      return res.status(200).json({
        success: true,
        message: 'Deposits grouped by day',
        data: groupedDeposits,
      });
    } catch (error) {
      console.error('Error in getDepositsGroupedByDay:', error);
      next(error);
    }

  },

  getDepositsWithinWeek : async (req, res, next) => {
      try {
        const today = new Date();
        const startOfWeekDate = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
        const endOfWeekDate = endOfWeek(today, { weekStartsOn: 1 }); // Week ends on Sunday
    
        const deposits = await prisma.deposits.findMany({
          where: {
            createdAt: {
              gte: startOfWeekDate,
              lte: endOfWeekDate,
            },
          },
        });
    
        if (deposits.length === 0) {
          return res.status(200).json({
            success: true,
            message: 'No deposits found within this week',
            data: [],
          });
        }
    
        return res.status(200).json({
          success: true,
          message: 'Deposits within this week',
          data: deposits,
        });
      } catch (error) {
        console.error('Error in getDepositsWithinWeek:', error);
        next(error);
      }
    },

  getDepositsWithinWeekdividedbyaday : async (req, res, next) => {
  try {
    const today = new Date();
    const startOfWeekDate = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
    const endOfWeekDate = endOfWeek(today, { weekStartsOn: 1 }); // Week ends on Sunday

    const weekDays = eachDayOfInterval({ start: startOfWeekDate, end: endOfWeekDate });

    const depositsByDay = await Promise.all(
      weekDays.map(async (day) => {
        const formattedDay = format(day, 'yyyy-MM-dd');
        const deposits = await prisma.deposits.findMany({
          where: {
            AND: [
              { createdAt: { gte: day } },
              { createdAt: { lt: new Date(day.getTime() + 24 * 60 * 60 * 1000) } }, // Next day
            ],
          },
        });
        return { day: formattedDay, deposits };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Deposits within this week grouped by day',
      data: depositsByDay,
    });
  } catch (error) {
    console.error('Error in getDepositsWithinWeekByDay:', error);
    next(error);
  }
  },
  getDepositsWithinMonthByDay : async (req, res, next) => {
    try {
      const today = new Date();
      const startOfMonthDate = startOfMonth(today);
      const endOfMonthDate = endOfMonth(today);
  
      const monthDays = eachDayOfInterval({ start: startOfMonthDate, end: endOfMonthDate });
  
      const depositsByDay = await Promise.all(
        monthDays.map(async (day) => {
          const formattedDay = format(day, 'yyyy-MM-dd');
          const deposits = await prisma.deposits.findMany({
            where: {
              AND: [
                { createdAt: { gte: day } },
                { createdAt: { lt: new Date(day.getTime() + 24 * 60 * 60 * 1000) } }, // Next day
              ],
            },
          });
          return { day: formattedDay, deposits };
        })
      );
  
      return res.status(200).json({
        success: true,
        message: 'Deposits within this month grouped by day',
        data: depositsByDay,
      });
    } catch (error) {
      console.error('Error in getDepositsWithinMonthByDay:', error);
      next(error);
    }
  },

  getMonthlyDepositsForYear: async (req, res, next) => {
    try {
      // Get the year from the URL parameters
      const year = parseInt(req.params.year, 10);
      if (isNaN(year) || year < 1000 || year > 9999) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year specified',
        });
      }

      const startOfYearDate = startOfYear(new Date(year, 0, 1));
      const endOfYearDate = endOfYear(new Date(year, 11, 31));
      
      // Find deposits for the specified year
      const deposits = await prisma.deposits.findMany({
        where: {
          createdAt: {
            gte: startOfYearDate,
            lt: endOfYearDate,
          },
        },
      });

      // Categorize deposits by month
      const monthlyDeposits = Array.from({ length: 12 }, () => []);

      deposits.forEach(deposit => {
        const monthIndex = getMonth(deposit.createdAt);
        monthlyDeposits[monthIndex].push(deposit);
      });

      // Format the response
      const monthlyDepositsFormatted = monthlyDeposits.map((deposits, index) => ({
        month: format(new Date(year, index, 1), 'MMMM'),
        deposits,
      }));

      return res.status(200).json({
        success: true,
        message: `Monthly deposits for the year ${year}`,
        data: monthlyDepositsFormatted,
      });
    } catch (error) {
      next(error);
    }
  },
  getDepositsForWeekOfYear: async (req, res, next) => {
    try {
      const year = parseInt(req.params.year, 10);
      const week = parseInt(req.params.week, 10);

      // Validate year and week
      if (isNaN(year) || year < 1000 || year > 9999) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year parameter. Please provide a valid year.',
        });
      }

      if (isNaN(week) || week < 1 || week > 52) {
        return res.status(400).json({
          success: false,
          message: 'Invalid week parameter. Please provide a valid week (1-52).',
        });
      }

      // Calculate the start and end dates for the specified week of the year
      const startOfYearDate = new Date(year, 0, 1);
      const startOfWeekDate = startOfWeek(addWeeks(startOfYearDate, week - 1), { weekStartsOn: 1 });
      const endOfWeekDate = endOfWeek(startOfWeekDate, { weekStartsOn: 1 });

      // Find deposits for the specified week of the year
      const deposits = await prisma.deposits.findMany({
        where: {
          createdAt: {
            gte: startOfWeekDate,
            lt: endOfWeekDate,
          },
        },
      });

      // Calculate the total deposit amount
      const totalDeposit = deposits.reduce((sum, deposit) => {
        return sum + parseFloat(deposit.amount);
      }, 0);

      return res.status(200).json({
        success: true,
        message: `Deposits for week ${week} of ${year}`,
        data: deposits,
        totalDeposit: totalDeposit,
      });
    } catch (error) {
      next(error);
    }
  },

  getDepositsForMonthandEachYearWithTotalDeposit: async (req, res, next) => {
    try {
      const year = parseInt(req.params.year, 10);  // Extract year from path parameters
      const month = parseInt(req.query.month, 10);  // Extract month from query parameters

      // Validate year and month
      if (isNaN(year) || year < 1000 || year > 9999) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year parameter. Please provide a valid year.',
        });
      }

      if (isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({
          success: false,
          message: 'Invalid month parameter. Please provide a valid month (1-12).',
        });
      }

      const startOfMonthDate = new Date(year, month - 1, 1);  // First day of the specified month
      const endOfMonthDate = new Date(year, month, 0, 23, 59, 59, 999);  // Last day of the specified month

      // Find deposits for the specified month and year
      const deposits = await prisma.deposits.findMany({
        where: {
          createdAt: {
            gte: startOfMonthDate,
            lt: endOfMonthDate,
          },
        },
      });

      // Calculate the total deposit amount
      const totalDeposit = deposits.reduce((sum, deposit) => {
        return sum + parseFloat(deposit.amount);
      }, 0);

      return res.status(200).json({
        success: true,
        message: `Deposits for ${format(startOfMonthDate, 'MMMM yyyy')}`,
        data: deposits,
        totalDeposit: totalDeposit,
      });
    } catch (error) {
      next(error);
    }
  },
  getDepositsForPeriodWithDeposit : async (req, res, next) => {
      try {
        const year = parseInt(req.query.year, 10);
        const month = parseInt(req.query.month, 10);
        const weekNumber = parseInt(req.query.week, 10);
    
        if (isNaN(year) || year < 1900 || year > 2100) {
          return res.status(400).json({
            success: false,
            message: 'Invalid year specified',
          });
        }
    
        if (isNaN(month) || month < 1 || month > 12) {
          return res.status(400).json({
            success: false,
            message: 'Invalid month specified',
          });
        }
    
        if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 4) {
          return res.status(400).json({
            success: false,
            message: 'Invalid week number specified',
          });
        }
    
        const startOfMonthDate = startOfMonth(new Date(year, month - 1));
        const endOfMonthDate = endOfMonth(new Date(year, month - 1));
        let startDate, endDate;
    
        if (weekNumber === 1) {
          startDate = startOfWeek(startOfMonthDate, { weekStartsOn: 1 });
          endDate = addDays(startDate, 6);
        } else if (weekNumber === 2) {
          startDate = addDays(startOfWeek(startOfMonthDate, { weekStartsOn: 1 }), 7);
          endDate = addDays(startDate, 6);
        } else if (weekNumber === 3) {
          startDate = addDays(startOfWeek(startOfMonthDate, { weekStartsOn: 1 }), 14);
          endDate = addDays(startDate, 6);
        } else if (weekNumber === 4) {
          startDate = addDays(startOfWeek(startOfMonthDate, { weekStartsOn: 1 }), 21);
          endDate = endOfMonthDate;
        }
    
        const deposits = await prisma.deposits.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });
    
        const groupedDeposits = {};
        let totalDeposit = 0;
    
        deposits.forEach(deposit => {
          const date = new Date(deposit.createdAt);
          const dayKey = format(date, 'yyyy-MM-dd');
    
          if (!groupedDeposits[dayKey]) {
            groupedDeposits[dayKey] = [];
          }
    
          groupedDeposits[dayKey].push(deposit);
          totalDeposit += parseFloat(deposit.amount);
        });
    
        return res.status(200).json({
          success: true,
          message: `Deposits for the specified period`,
          data: groupedDeposits,
          totalDeposit,
        });
      } catch (error) {
        next(error);
      }
    },

  getDepositsForPeriod : async (req, res, next) => {
    
      try {
        const year = parseInt(req.query.year, 10);
        const month = parseInt(req.query.month, 10);
        const weekNumber = parseInt(req.query.week, 10);
    
        if (isNaN(year) || year < 1900 || year > 2100) {
          return res.status(400).json({
            success: false,
            message: 'Invalid year specified',
          });
        }
    
        if (isNaN(month) || month < 1 || month > 12) {
          return res.status(400).json({
            success: false,
            message: 'Invalid month specified',
          });
        }
    
        if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 4) {
          return res.status(400).json({
            success: false,
            message: 'Invalid week number specified',
          });
        }
    
        const startOfMonthDate = startOfMonth(new Date(year, month - 1));
        const endOfMonthDate = endOfMonth(new Date(year, month - 1));
        let startDate, endDate;
    
        if (weekNumber === 1) {
          startDate = startOfWeek(startOfMonthDate, { weekStartsOn: 1 });
          endDate = addDays(startDate, 6);
        } else if (weekNumber === 2) {
          startDate = addDays(startOfWeek(startOfMonthDate, { weekStartsOn: 1 }), 7);
          endDate = addDays(startDate, 6);
        } else if (weekNumber === 3) {
          startDate = addDays(startOfWeek(startOfMonthDate, { weekStartsOn: 1 }), 14);
          endDate = addDays(startDate, 6);
        } else if (weekNumber === 4) {
          startDate = addDays(startOfWeek(startOfMonthDate, { weekStartsOn: 1 }), 21);
          endDate = endOfMonthDate;
        }
        
if (isNaN(weekNumber)) {
// If week number is not provided, return deposits for the entire month
weekNumber === 0;
}

    
        const deposits = await prisma.deposits.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });
    
        const groupedDeposits = {};
    
        deposits.forEach(deposit => {
          const date = new Date(deposit.createdAt);
          const dayKey = format(date, 'yyyy-MM-dd');
    
          if (!groupedDeposits[dayKey]) {
            groupedDeposits[dayKey] = [];
          }
    
          groupedDeposits[dayKey].push(deposit);
        });
    
        return res.status(200).json({
          success: true,
          message: `Deposits for the specified period`,
          data: groupedDeposits,
        });
      } catch (error) {
        next(error);
      }
    },

  getTotalRemainingDepositsForPeriod : async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    const weekNumber = parseInt(req.query.week, 10);

    if (isNaN(year) || year < 1900 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year specified',
      });
    }

    if (isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month specified',
      });
    }

    if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 4) {
      return res.status(400).json({
        success: false,
        message: 'Invalid week number specified',
      });
    }

    const startOfMonthDate = startOfMonth(new Date(year, month - 1));
    const endOfMonthDate = endOfMonth(new Date(year, month - 1));
    let startDate, endDate;

    if (weekNumber === 1) {
      startDate = startOfWeek(startOfMonthDate, { weekStartsOn: 1 });
      endDate = addDays(startDate, 6);
    } else if (weekNumber === 2) {
      startDate = addDays(startOfWeek(startOfMonthDate, { weekStartsOn: 1 }), 7);
      endDate = addDays(startDate, 6);
    } else if (weekNumber === 3) {
      startDate = addDays(startOfWeek(startOfMonthDate, { weekStartsOn: 1 }), 14);
      endDate = addDays(startDate, 6);
    } else if (weekNumber === 4) {
      startDate = addDays(startOfWeek(startOfMonthDate, { weekStartsOn: 1 }), 21);
      endDate = endOfMonthDate;
    }

    const deposits = await prisma.deposits.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    let remainingAmount = 0;
    deposits.forEach((deposit) => {
      remainingAmount += parseFloat(deposit.remaining);
    });

    return res.status(200).json({
      success: true,
      message: `Total remaining amount for the specified period`,
      data: {
        remainingAmount: remainingAmount, // Assuming you want to round to 2 decimal places
      },
    });
  } catch (error) {
    next(error);
  }
  },

  getRemainingDepositsForPeriod: async (req, res, next) => {
    try {
      const year = parseInt(req.query.year, 10);
      const month = req.query.month ? parseInt(req.query.month, 10) : null;
      const weekNumber = req.query.week ? parseInt(req.query.week, 10) : null;

      if (isNaN(year) || year < 1900 || year > 2100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year specified',
        });
      }

      if (month !== null && (isNaN(month) || month < 1 || month > 12)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid month specified',
        });
      }

      if (weekNumber !== null && (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 52)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid week number specified',
        });
      }

      let startDate, endDate;
      if (month === null && weekNumber === null) {
        // If month and week number are not provided, return deposits for the entire year
        startDate = startOfYear(new Date(year, 0, 1));
        endDate = endOfYear(new Date(year, 11, 31));
      } else if (month !== null && weekNumber === null) {
        // If week number is not provided, return deposits for the entire month
        startDate = startOfMonth(new Date(year, month - 1));
        endDate = endOfMonth(new Date(year, month - 1));
      } else if (month === null && weekNumber !== null) {
        // If week number is provided without month, calculate the week in terms of the year
        startDate = startOfWeek(startOfYear(new Date(year, 0, 1)), { weekStartsOn: 1 });
        startDate = addWeeks(startDate, weekNumber - 1);
        endDate = endOfWeek(startDate, { weekStartsOn: 1 });
      } else {
        // If both month and week number are provided, calculate the week in terms of the year
        const firstDayOfYear = startOfYear(new Date(year, 0, 1));
        startDate = addWeeks(startOfWeek(firstDayOfYear, { weekStartsOn: 1 }), weekNumber - 1);
        endDate = endOfWeek(startDate, { weekStartsOn: 1 });

        // Ensure end date does not exceed the end of the year
        const endOfYearDate = endOfYear(new Date(year, 11, 31));
        if (endDate > endOfYearDate) {
          endDate = endOfYearDate;
        }
      }

      const deposits = await prisma.deposits.findMany({
        where: {
          AND: [
            { createdAt: { gte: startDate, lte: endDate } },
            {
              OR: [
                { remainingAmountPerDeposit: { not: 0 } },
                { remainingCommissionPerDeposit: { not: 0 } }
              ]
            }
          ]
        },
        orderBy: { createdAt: 'asc' }, // Order deposits by createdAt date
      });

      // Filter out deposits with zero remaining amount and sort by remaining amount in descending order
      const filteredAndSortedDeposits = deposits.sort((a, b) => parseFloat(b.remaining) - parseFloat(a.remaining));

      let remainingDeposits = {};
      filteredAndSortedDeposits.forEach((deposit) => {
        const dayKey = format(new Date(deposit.createdAt), 'yyyy-MM-dd');
        if (!remainingDeposits[dayKey]) {
          remainingDeposits[dayKey] = [];
        }
        remainingDeposits[dayKey].push({
          id: deposit.id,
          lotId: deposit.lotId,
          userId: deposit.userId,
          remainingAmountPerDeposit: deposit.remainingAmountPerDeposit,
          remainingCommissionPerDeposit: deposit.remainingCommissionPerDeposit,
          createdAt: deposit.createdAt,
        });
      });

      return res.status(200).json({
        success: true,
        message: `Remaining deposits for the specified period`,
        data: remainingDeposits,
      });
    } catch (error) {
      next(error);
    }
  },
  getRemainingDepositsForYear : async (req, res, next) => {
    try {
      const year = parseInt(req.query.year, 10);

      if (isNaN(year) || year < 1900 || year > 2100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year specified',
        });
      }

      const startDate = startOfYear(new Date(year, 0));
      const endDate = endOfYear(new Date(year, 0));

      const deposits = await prisma.deposits.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'asc' }, // Order deposits by createdAt date
      });

      let remainingDeposits = {};
      let totalRemainingAmount = 0;

      deposits.forEach((deposit) => {
        const monthKey = format(new Date(deposit.createdAt), 'MM');
        if (!remainingDeposits[monthKey]) {
          remainingDeposits[monthKey] = [];
        }
        // Add deposit details
        remainingDeposits[monthKey].push({
          id: deposit.id,
          lotId: deposit.lotId,
          userId: deposit.userId,
          remaining: deposit.remaining,
          createdAt: deposit.createdAt,
        });
        // Accumulate total remaining amount
        totalRemainingAmount += parseFloat(deposit.remaining);
      });

      return res.status(200).json({
        success: true,
        message: `Remaining deposits for the specified year`,
        data: remainingDeposits,
        totalRemainingAmount: totalRemainingAmount.toFixed(2), // Total remaining amount for the period
      });
    } catch (error) {
      next(error);
    }
  },
  getCommissionForPeriod: async (req, res, next) => {
    try {
      const year = parseInt(req.query.year, 10);
      const month = req.query.month ? parseInt(req.query.month, 10) : null;
      const weekNumber = req.query.week ? parseInt(req.query.week, 10) : null;

      if (isNaN(year) || year < 1900 || year > 2100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year specified',
        });
      }

      if (month !== null && (isNaN(month) || month < 1 || month > 12)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid month specified',
        });
      }

      if (weekNumber !== null && (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 52)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid week number specified',
        });
      }

      let startDate, endDate;
      if (month === null && weekNumber === null) {
        startDate = startOfYear(new Date(year, 0, 1));
        endDate = endOfYear(new Date(year, 11, 31));
      } else if (month !== null && weekNumber === null) {
        startDate = startOfMonth(new Date(year, month - 1));
        endDate = endOfMonth(new Date(year, month - 1));
      } else if (month === null && weekNumber !== null) {
        startDate = startOfWeek(startOfYear(new Date(year, 0, 1)), { weekStartsOn: 1 });
        startDate = addWeeks(startDate, weekNumber - 1);
        endDate = endOfWeek(startDate, { weekStartsOn: 1 });
      } else {
        const firstDayOfYear = startOfYear(new Date(year, 0, 1));
        startDate = addWeeks(startOfWeek(firstDayOfYear, { weekStartsOn: 1 }), weekNumber - 1);
        endDate = endOfWeek(startDate, { weekStartsOn: 1 });

        const endOfYearDate = endOfYear(new Date(year, 11, 31));
        if (endDate > endOfYearDate) {
          endDate = endOfYearDate;
        }
      }

      const deposits = await prisma.deposits.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const filteredAndSortedDeposits = deposits
        .filter(deposit => parseFloat(deposit.commition) !== 0)
        .sort((a, b) => parseFloat(b.commition) - parseFloat(a.commition));

      let commissionData = {};
      filteredAndSortedDeposits.forEach((deposit) => {
        const dayKey = format(new Date(deposit.createdAt), 'yyyy-MM-dd');
        if (!commissionData[dayKey]) {
          commissionData[dayKey] = [];
        }
        commissionData[dayKey].push({
          id: deposit.id,
          lotId: deposit.lotId,
          userId: deposit.userId,
          commition: deposit.commition,
          createdAt: deposit.createdAt,
        });
      });

      return res.status(200).json({
        success: true,
        message: `Commission data for the specified period`,
        data: commissionData,
      });
    } catch (error) {
      next(error);
    }
  },
 
  }

        
      
        
  export default  depositController;