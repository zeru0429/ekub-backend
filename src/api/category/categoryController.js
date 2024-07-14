import express from "express"; // Assuming you're using Express
// const { Request, Response, NextFunction } = express; // Destructuring for cleaner syntax
import categorySchema  from "./categorySchema.js";
import prisma from "../../config/prisma.js";

const categoryController = {
  register: async (req, res, next) => {
    try {
      const data = req.body;
      console.log(data);

      // Check if any required field is missing
      const requiredFields = ["name", "amount", "commition", "totalCount", "duration", "collectionCycle"];
      for (const field of requiredFields) {
        if (!data[field]) {
          return res.status(403).json({
            success: false,
            message: `${field} is required`,
          });
        }
      }
      try {
        categorySchema.register.parse(data);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
        });
      }

      req.body.totalAmount = req.body.totalCount * (req.body.amount + req.body.commition);
      req.body.totalCommition = req.body.totalCount * req.body.commition;
      
      const newCategory = await prisma.category.create({
        data: {
          name: data.name,
          amount: data.amount,
          commition: data.commition,
          totalCount: data.totalCount,
          totalAmount: req.body.totalAmount,
          totalCommition: req.body.totalCommition,
          duration: data.duration,
          collectionCycle: data.collectionCycle,
        },
      });
      
      return res.status(200).json({
        success: true,
        message: "Category registered",
        data: newCategory,
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while creating the category",
      });
    }
  },
  update: async (req, res, next) => {
    const id = parseInt(req.params.id.substring(1));
    const data = categorySchema.update.parse(req.body);
  
    
    const categoryExist = await prisma.category.findFirst({
      where: {
        id: parseInt(id), 
      },
    });
    if (!categoryExist) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    const  newAmount = data.amount || categoryExist.amount
    const  newCommission = data.commition || categoryExist.commition
   const totalCount = data.totalCount|| categoryExist.totalCount
   const newName = data.name || categoryExist.name
  
   req.body.totalAmount = totalCount * (newAmount + newCommission);
    // You might want to consider calculating totalAmount based on just commission here
     req.body.totalCommition = totalCount * newCommission; 

    const updatedCategory = await prisma.category.update({
      where: {
        id: parseInt(id),
      },
      data: {
        name: data.name,
        amount: newAmount,
        commition: newCommission,
        totalCount: totalCount,
        totalAmount: req.body.totalAmount,
        totalCommition: req.body.totalCommition,
        duration:data.duration,
        collectionCycle: data.collectionCycle
      },
    });

    return res.status(200).json({
      success: true,
      message: "Category updated",
      data: updatedCategory,
    });
  },
  delete: async (req, res, next) => {
    const id = req.params.id;
    const categoryExist = await prisma.category.findFirst({
      where: {
        id: parseInt(id),
      },
    });
    if (!categoryExist) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const deletedCategory = await prisma.category.delete({
      where: {
        id: parseInt(id),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  },
  getSingleCategory : async (req, res, next) => {
    // console.log("Fetching all categories");
    const categoryId = parseInt(req.params.id.substring(1)); 
    try {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(404).json({ 
          message: "Category not found" 
      });
      }

      return res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }


  
  },

  getAllCategories :async (req, res, next) => {
    try {
      const categories = await prisma.category.findMany({
        include: {
          _count: true,
          lot: {
            include:{
              _count: true,
              category: true,
              profile: true,
              deposits: true,
              returnedRemaining: true,
              loans: true,
              winners: true,
            }
          },
        },

      }); // Fetch all categories

      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching categories",
      });
    }
  },

deleteCategoryById : async (req, res, next) => {
  const categoryId = parseInt(req.params.id.substring(1), 10);

  if (isNaN(categoryId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid category ID",
    });
  }

  try {
    const deletedCategory = await prisma.category.delete({
      where: { id: categoryId },
    });

    if (!deletedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the category",
    });
  }
}









};

export default categoryController;
