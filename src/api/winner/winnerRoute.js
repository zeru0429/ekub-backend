import express from "express"; // Assuming you're using Express
const router = express.Router(); // Create a router object

import winnerController from "./winnerController.js";
import { isAdmin, isAuthUser, isUser } from "../../middlewares/auth.js";
// const errorHandler = require("../../middlewares/error.js");

// Define routes with middleware
// router.post("/register",[isAdmin,isAuthUser],winnerController.register);
router.post("/register", winnerController.register);
router.get("/get/:id", winnerController.getSingleWinner);
router.get("/get", winnerController.getAllWinners);
router.put("/update/:id", winnerController.update);
// router.put("/updateStatus/:id",winnerController.updateLoanStatus);
router.delete("/delete/:id", winnerController.delete);

export default router;
