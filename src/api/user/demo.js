import express from "express";
import { prisma } from "../../config/prisma.js";
import userSchema from "./userSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { STATUS } from "@prisma/client";
import { SECRET } from "../../config/secrets.js";
import {z} from "zod";
// import { generatePassword } from "../../util/generateor.js";
// import { sendEmail } from "../../util/emailSender.js";

const userController = {
  register: async (req, res, next) => {
    console.log("sena");

    try {
        // Assuming userSchema.register.parse exists and returns a plain object
        const data = userSchema.register.parse(req.body);

        // Check if the email exists
        const isUserExist = await prisma.users.findFirst({
            where: {
                email: data.email,
            },
        });

        if (isUserExist) {
            return res.status(404).json({
                success: false,
                message: "Email is already in use",
            });
        }

        // Hash the password
        const password = await bcrypt.hash(data.password, 10);

        // Create a new user with profile details and connect to the lot
        const newUser = await prisma.users.create({
            data: {
                email: data.email,
                password: password,
                activeStatus: STATUS.ACTIVE, // Assuming STATUS.ACTIVE exists
                Profiles: {
                    create: {
                        firstName: data.firstName,
                        middleName: data.middleName,
                        lastName: data.lastName,
                        city: data.city,
                        gender: data.gender,
                        street: data.street,
                        lot: {
                            connect: {
                                id: data.lot, // Assuming data.lot contains the ID of an existing lot
                            },
                        },
                    },
                },
                lots: {
                    connect: {
                        id: data.lot, // Connect to an existing lot by ID
                    },
                },
            },
            include: {
                Profiles: true,
                lots: true, // Include lots to confirm the connection
            },
        });

        return res.status(200).json({
            success: true,
            message: "User created successfully",
            data: newUser,
        });
    } catch (error) {
        // Handle errors, such as parsing errors or database errors
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
            message: "An error occurred while creating the user",
        });
    }
},
  login : async (req, res, next) => {
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
  },
   getUserById :async (req, res, next) => {
    console.log("Fetching user by ID");

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
            include: {
                Profiles: true,
                lots: true, 
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
  console.log("Fetching all users");

  try {
      const users = await prisma.users.findMany({
          include: {
              Profiles: true,
              lots: true, // Include lots associated with the users
          },
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
  console.log("Updating user status to inactive");

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
    req.body.userId = req.userId;
    const data = userSchema.changePassword.parse(req.body);
    // console.log(req.body.userId);
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

    const isMatch = bcrypt.compareSync(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect old password",
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    const updatePassword = await prisma.users.update({
      where: { id: data.userId },
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
updateProfile: async (req, res, next) => {
  console.log("Update profile request");
  const userId = parseInt(req.params.id.substring(1)); // Assuming user ID is passed in the route parameters

  const data = userSchema.updateProfile.parse(req.body);



  try {
    // Validate user ID (optional)
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing user ID",
      });
    }

    // Find the existing user
    const user = await prisma.users.findUnique({
      where: {
        id: userId,
      },
      include:{
        Profiles : true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Assuming userSchema.updateProfile.parse exists and returns a plain object
    // Update user profile details
    const updatedUser = await prisma.users.update({
      where: {
        id: userId,
      },
      data: {
        Profiles: {
          update: {
            firstName: data.firstName,
            middleName: data.middleName,
            lastName: data.lastName,
            gender: data.gender, // Update relevant profile fields based on updateData
          },
        },
      },
      include: {
        Profiles: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    // Handle errors, such as parsing errors or database errors
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
      message: "An error occurred while updating the profile",
    });
  }
},

updateAddress: async (req, res, next) => {
  console.log("Update address request");

  const userId = parseInt(req.params.id.substring(1)); // Assuming user ID is passed in the route parameters
  const data = userSchema.updateAddress.parse(req.body); // Assuming userSchema.updateAddress exists

  try {
    // Validate user ID (optional)
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing user ID",
      });
    }

    // Find the existing user with their profile
    const user = await prisma.users.findUnique({
      where: {
        id: userId,
      },
      include: {
        Profiles: true, // Eagerly fetch the associated profile
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update the user's profile (address)
    const updatedUser = await prisma.users.update({
      where: {
        id: userId,
      },
      data: {
        Profiles: {
          update: {
            city: data.city,
            street: data.street, // Update relevant address fields (city, street)
          },
        },
      },
      include: {
        Profiles: true, // Include the updated profile after update
      },
    });

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    // Handle errors
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
      message: "An error occurred while updating the address",
    });
  }
},









  
}

export default userController