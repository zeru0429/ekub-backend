import express from "express";
import { prisma } from "../../config/prisma.js";
import userSchema from "./userSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { STATUS } from "@prisma/client";
import { SECRET } from "../../config/secrets.js";
import {z} from "zod";
import {isAuthUser,isAdmin} from "../../middlewares/auth.js"
// import { generatePassword } from "../../util/generateor.js";
// import { sendEmail } from "../../util/emailSender.js";

const userController = {
  register: async (req, res, next) => {
    console.log(req.body);
  
    try {
      const requiredFields = ["email", "firstName", "middleName", "lastName"];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(403).json({
            success: false,
            message: `${field} is required`,          
          });
        }
      }
  
      const data = userSchema.register.parse(req.body);
  
      const isUserExist = await prisma.users.findFirst({
        where: {
          email: data.email,
        },
      });
  
      if (isUserExist) {
        return res.status(400).json({
          success: false,
          message: "Email is already in use",
        });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(data.password, 10);
  
      // Create a new user with profile details
      const newUser = await prisma.users.create({
        data: {
          email: data.email,
          password: hashedPassword,
          activeStatus: STATUS.ACTIVE, // Assuming STATUS.ACTIVE exists
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          gender: data.gender, 
        },
      });
  
      return res.status(201).json({
        success: true,
        message: "User created successfully",
        data: newUser,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while creating the user",
      });
    }
  },
  
  
  login : async (req, res, next) => {
    console.log("..........login...........", req.body);
    try{
    const data = userSchema.login.parse(req.body);
  
    // Find user by email
    const user = await prisma.users.findFirst({
      where: {
        email: data.email,
      },
    }); 
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }
    if (user.activeStatus !== "ACTIVE") {
      return res.status(404).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    // Compare password using bcrypt
    if (!bcrypt.compareSync(data.password, user.password)) {
      return res.status(404).json({
        success: false,
        message: "password is incorrect",
      });
    }// Check user active status
    if (user.activeStatus !== STATUS.ACTIVE) {
      return res.status(404).json({
        success: false,
        message: "user is not active",
      });
    }
  
    // Create payload for JWT
const payload = {
      id: user.id,
      firstName: user.firstName,
      role: user.role,
    };
  
    // Assuming jwt.sign exists and SECRET is defined
    const token = await jwt.sign(payload, SECRET);
  
    return res.status(200).json({
      success: true,
      message: "user logged in successfully",
      data: user,
      token: token,
    });
  }catch (error) {
    console.error('An error occurred:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while logging in',
    });
  }
},
   getUserById :async (req, res, next) => {
    // console.log("Fetching user by ID");

    try {
        const userId = parseInt(req.params.id.substring(1), 10);

        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        const user = await prisma.users.findUnique({
            where: {
                id: userId,
            },
          
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching the user",
        });
    }
},
getAllUsers : async (req, res, next) => {
 // console.log("Fetching all users");

  try {
      const users = await prisma.users.findMany({
         
      });
      return res.status(200).json({
          success: true,
          data: users,
      });
  } catch (error) {
      console.error(error);
      return res.status(500).json({
          success: false,
          message: "An error occurred while fetching the users",
      });
  }
},
 updateUserStatusToInactive : async (req, res, next) => {
  // console.log("Updating user status to inactive");

  try {
      const userId = parseInt(req.params.id.substring(1), 10);

      if (isNaN(userId)) {
          return res.status(400).json({
              success: false,
              message: "Invalid user ID",
          });
      }
      // Update the user's status to INACTIVE
      const updatedUser = await prisma.users.update({
          where: {
              id: userId,
          },
          data: {
              activeStatus: STATUS.DEACTIVATED, // Assuming STATUS.INACTIVE exists
          },
      });
      return res.status(200).json({
          success: true,
          message: "User status updated to inactive",
          data: updatedUser,
      });
  } catch (error) {
      // Handle errors, such as user not found or database errors
      if (error.code === 'P2025') { // Prisma error code for record not found
          return res.status(404).json({
              success: false,
              message: "User not found",
          });
      }

      console.error(error);
      return res.status(500).json({
          success: false,
          message: "An error occurred while updating the user status",
      });
  }
},
changePassword: async (req, res) => {
  try {
    req.body.id = req.userId;
    const data = userSchema.changePassword.parse(req.body);

    // console.log("User ID:", data.id);

    const user = await prisma.users.findUnique({
      where: { id: data.id },
      select: { password: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist",
      });
    }
    const isMatch = bcrypt.compareSync(data.oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect old password",
      });
    }
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(data.newPassword, salt);

    // Update the password
    const updatePassword = await prisma.users.update({
      where: { id: data.id },
      data: { password: hashedPassword },
    });

    if (!updatePassword) {
      return res.status(500).json({
        success: false,
        message: "Error during password update",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error in changePassword:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
},

updateUser: async (req, res, next) => {
  try {
    // console.log("Update user function called");

    const data = userSchema.update.parse(req.body);

    const userId = parseInt(req.params.id.substring(1)); 

    const userExist = await prisma.users.findUnique({
      where: {
        id: userId, 
      },
    });

    if (!userExist) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const updatedUser = await prisma.users.update({
      where: {
        id: parseInt(userId), 
      },
      data:{
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
      } ,
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the user",
    });
  }
}
}

export default userController