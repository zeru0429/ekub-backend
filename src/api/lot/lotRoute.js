import { Router } from "express";
import lotController from "./lotController.js";
// import { errorMiddleware } from "../../middlewares/errorMiddleware.js";
// import errorHandler from "../../middlewares/error.js"
import {isAuthUser,isAdmin,isUser} from "../../middlewares/auth.js"

const lotRouter = Router();

lotRouter.post("/register",lotController.register);
lotRouter.get("/getLotAll/:id", lotController.getUserInfo);
lotRouter.get("/getLot/Category/:id", lotController.getLotwithCategory);
lotRouter.get("/getLot/:id", lotController.getLot);
lotRouter.get("/getLotProfile/:id", lotController.getProfile);
lotRouter.put("/updateProfile/:id",[isAuthUser], lotController.updateProfile);
lotRouter.delete("/deleteLot/:id",[isAuthUser], lotController.deleteLot);
lotRouter.get("/getAllLot", lotController.getAllLotosInfo);

export default lotRouter;