import express from "express"; 
const router = express.Router(); 
import categoryController from "./categoryController.js";
import {isAuthUser,isAdmin,isUser} from "../../middlewares/auth.js"

router.post("/register" ,categoryController.register);
router.get("/getCategory/:id", categoryController.getSingleCategory);
router.get("/getAllCategory", categoryController.getAllCategories);
router.put("/update/:id",[isAuthUser,isAdmin], categoryController.update);
router.delete("/delete/:id",[isAuthUser,isAdmin],categoryController.deleteCategoryById);


export default router;