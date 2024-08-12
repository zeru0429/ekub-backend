import express from "express"; // Assuming you're using Express
// const { Request, Response, NextFunction } = express; // Destructuring for cleaner syntax
import categorySchema from "./categorySchema.js";
import prisma from "../../config/prisma.js";
import { late } from "zod";

const categoryController = {
  register: async (req, res, next) => {
    try {
      const data = req.body;
      // Check if any required field is missing
      const requiredFields = [
        "name",
        "amount",
        "commition",
        "totalCount",
        "duration",
        "collectionCycle",
      ];
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

      req.body.totalAmount =
        parseFloat(req.body.totalCount) * parseFloat(req.body.amount);
      req.body.totalCommition =
        parseFloat(req.body.totalCount) * parseFloat(req.body.commition);
      req.body.total =
        parseFloat(req.body.totalAmount) + parseFloat(req.body.totalCommition);
      console.log({
        name: data.name,
        amount: data.amount,
        commition: data.commition,
        totalCount: data.totalCount,
        totalAmount: req.body.totalAmount,
        totalCommition: req.body.totalCommition,
        total: parseFloat(req.body.total),
        duration: data.duration,
        collectionCycle: data.collectionCycle,
      });

      const newCategory = await prisma.category.create({
        data: {
          name: data.name,
          amount: data.amount,
          commition: data.commition,
          totalCount: data.totalCount,
          totalAmount: req.body.totalAmount,
          totalCommition: req.body.totalCommition,
          total: req.body.total,
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
    var newAmount = data.amount || categoryExist.amount;
    var newCommission = data.commition || categoryExist.commition;
    var totalCount = data.totalCount || categoryExist.totalCount;
    var newName = data.name || categoryExist.name;

    if (data.amount || data.commition || data.totalCount) {
      req.body.totalAmount = data.amount * data.totalCount;
      req.body.totalCommition = data.commition * data.totalCount;
      req.body.total = req.body.totalCommition + req.body.totalAmount;
    }
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
        total: req.body.total,
        duration: data.duration,
        collectionCycle: data.collectionCycle,
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
  getSingleCategory: async (req, res, next) => {
    // console.log("Fetching all categories");
    const categoryId = parseInt(req.params.id.substring(1));
    try {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(404).json({
          message: "Category not found",
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

  getAllCategories: async (req, res, next) => {
    const take = req.query.take || 10;
    const skip = req.query.skip || 0;

    try {
      const categories = await prisma.category.findMany({
        include: {
          _count: true,
        },
        take: +take,
        skip: +skip,
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

  deleteCategoryById: async (req, res, next) => {
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
  },
};

export default categoryController;
