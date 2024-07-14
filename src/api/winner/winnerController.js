import { prisma } from "../../config/prisma.js";
import  winnerSchema  from "./winnerSchema.js";


const winnerController = {
  register: async (req, res, next) => {
    
  try {
    // Check if any required field is missing
    const requiredFields = ["lotId"];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(403).json({
          success: false,
          message: `${field} is required`,
        });
      }
    }

    const data = winnerSchema.register.parse(req.body);

      const lot = await prisma.lots.findUnique({
        where: { id: data.lotId },
      });

      if (!lot) {
        return res.status(404).json({
          success: false,
          message: "Lot not found",
        });
      }
     
  
      
      // Check if the winner is already registered
      const existingWinner = await prisma.winners.findFirst({
        where: {
          lotId: data.lotId,
        },
      });

      if (existingWinner) {
        return res.status(400).json({
          success: false,
          message: "Winner is already registered",
        });
      }
        //  const loansOnCount = await prisma.loans.findMany({
        //   where: {
        //     count: data.count,
        //   },
        // });
  
        // const totalLoansOnCount = loansOnCount.reduce((acc, loan) => acc + parseFloat(loan.amount), 0);
      // Calculate total loans for the lot
      const loans = await prisma.loans.findMany({
        where: {
          lotId: data.lotId,
        },
      });

      const totalLoans = loans.reduce((acc, loan) => acc + parseFloat(loan.amount), 0);

      // Fetch the category associated with the lot
      const category = await prisma.category.findUnique({
        where: {
          id: lot.categoryId,
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Calculate the prize amount
      const prizeAmount = parseFloat(category.totalAmount) - totalLoans ;

      // Register the winner
      const newWinner = await prisma.winners.create({
        data: {
          lotId: data.lotId,
          registeredBy: req.user.id,
          // count: data.count
        },
      });

      return res.status(200).json({
        success: true,
        message: `You have won ${prizeAmount}`, // Using template literals here
        data: {
          winner: newWinner,
        },
      });
    } catch (error) {
      next(error);
    }
  },
  update: async (req, res, next) => {
    try {
        const id = parseInt(req.params.id.substring(1));
      const data = winnerSchema.update.parse(req.body);

      const lot = await prisma.lots.findUnique({
        where: { id: data.lotId },
      });


      // Check if the winner exists
      const isWinnerExist = await prisma.winners.findFirst({
        where: {
          id: id,
        },
      });

      if (!isWinnerExist) {
        return res.status(404).json({
          success: false,
          message: "Winner not found",
        });
      }
      const Winner = await prisma.winners.findFirst({
        where: {
          id: data.lotId,
        },
      });

      if(Winner){
      return res.status(404).json({
        success : false,
        message: "Winner is already registered"
      })
      }

      // const loansOnCount = await prisma.loans.findMany({
      //   where: {
      //     count: data.count || isWinnerExist.count,
      //   },
      // });

      // const totalLoansOnCount = loansOnCount.reduce((acc, loan) => acc + parseFloat(loan.amount), 0);
    // Calculate total loans for the lot
    const loans = await prisma.loans.findMany({
      where: {
        lotId: data.lotId || isWinnerExist.lotId,
      },
    });

    const totalLoans = loans.reduce((acc, loan) => acc + parseFloat(loan.amount), 0);

    // Fetch the category associated with the lot
    const category = await prisma.category.findUnique({
      where: {
        id: lot.categoryId,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Calculate the prize amount
    const prizeAmount = parseFloat(category.totalAmount) - totalLoans ;

      const updatedWinner = await prisma.winners.update({
        where: {
          id: id,
        },
        data: {
          lotId: data.lotId,
          registeredBy: req.user.id,
          // count: data.count
        },
      });

      return res.status(200).json({
        success: true,
        message: `Winner has won ${prizeAmount} `,
        data: updatedWinner
      });
    } catch (error) {
      next(error);
    }
  },
  // updateLoanStatus : async (req, res, next) => {
  //   const id = parseInt(req.params.id.substring(1));
  
  //   try {
  //     const existingLoan = await prisma.loans.findUnique({
  //       where: { id: id },
  //     });
  
  //     if (!existingLoan) {
  //       return res.status(404).json({
  //         success: false,
  //         message: 'Loan not found',
  //       });
  //     }
  
  //     const updatedLoan = await prisma.loans.update({
  //       where: { id: parseInt(id) },
  //       data: {
  //         isPaidBack: true,
  //       },
  //     });
  
  //     return res.status(200).json({
  //       success: true,
  //       message: 'Loan status updated to paid back',
  //       data: updatedLoan,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // },



  

  delete: async (req, res, next) => {
    try {
        const id = parseInt(req.params.id.substring(1));

      // Check if the winner exists
      const isWinnerExist = await prisma.winners.findFirst({
        where: {
          id: id,
        },
      });

      if (!isWinnerExist) {
        return res.status(404).json({
          success: false,
          message: "Winner not found",
        });
      }

      await prisma.winners.delete({
        where: {
          id: id,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Winner deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
  getSingleWinner: async (req, res, next) => {
    try {
      const id = parseInt(req.params.id.substring(1), 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid winner ID specified',
        });
      }

      const winner = await prisma.winners.findUnique({
        where: {
          id: id,
        },
      });

      if (!winner) {
        return res.status(404).json({
          success: false,
          message: 'Winner not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Winner retrieved successfully',
        data: winner,
      });
    } catch (error) {
      next(error);
    }
  },
  getAllWinners: async (req, res, next) => {
    try {
      const winners = await prisma.winners.findMany();

      return res.status(200).json({
        success: true,
        message: 'All winners retrieved successfully',
        data: winners,
      });
    } catch (error) {
      next(error);
    }
  },
}



;

export default winnerController;
