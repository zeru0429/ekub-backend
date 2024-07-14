import { Router } from "express";
import userController from "./userController.js";
import {isAuthUser,isAdmin} from "../../middlewares/auth.js"
const userRouter = Router();

userRouter.post("/register",userController.register);
userRouter.post('/login',userController.login);
userRouter.get("/get/:id",userController.getUserById);
userRouter.get("/get",userController.getAllUsers);
userRouter.put("/change/Password",[isAuthUser],userController.changePassword);
userRouter.put("/update/:id",[isAuthUser],userController.updateUser);
userRouter.put("/deactivate/:id",[isAuthUser,isAdmin],userController.updateUserStatusToInactive); // deactivate




export default userRouter;
