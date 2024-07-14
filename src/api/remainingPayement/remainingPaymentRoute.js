import express from "express"; // Assuming you're using Express
const router = express.Router(); // Create a router object
import remainingPaymenController from "./remainigPaymentController.js";
import { isAdmin, isAuthUser, isUser } from "../../middlewares/auth.js";


router.post("/register",[isAuthUser,isAdmin],remainingPaymenController.register);
// router.put("/update/:id",[isAuthUser,isUser],remainingPaymenController.update);
// router.get("/get/:id",[isAuthUser,isAdmin],remainingPaymenController.getSingleDeposit);
router.get("/get/:id",[isAuthUser,isAdmin],remainingPaymenController.getSingle);
router.delete("/delete/:id",[isAuthUser,isAdmin],remainingPaymenController.delete);
router.put("/update/:id",[isAuthUser,isAdmin],remainingPaymenController.update);


export default router;