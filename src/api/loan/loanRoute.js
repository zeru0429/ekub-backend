import express from "express"; // Assuming you're using Express
const router = express.Router(); // Create a router object
import loanController from "./loanController.js";
import { isAdmin, isAuthUser } from "../../middlewares/auth.js";
// const errorHandler = require("../../middlewares/error.js");

// Define routes with middleware
router.post("/register", loanController.register);
router.put("/update/:id", loanController.updateLoan);
router.delete("/delete/:id", loanController.deleteLoan);
router.get("/get/:id", loanController.getLoanById);
router.get("/getAll", loanController.getAllLoans);

export default router;
