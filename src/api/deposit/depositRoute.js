import express from "express"; // Assuming you're using Express
const router = express.Router(); // Create a router object
import depositController from "./depositController.js";
import { isAdmin, isAuthUser, isUser } from "../../middlewares/auth.js";

router.post("/register",[isAuthUser,isAdmin],depositController.register);
router.put("/update/:id",[isAuthUser,isUser],depositController.update);
router.get("/get/:id",[isAuthUser,isAdmin],depositController.getSingleDeposit);
router.get("/get",[isAuthUser,isAdmin],depositController.getAllDeposits);

//get deposit of today, current month , current year
router.get("/day",[isAuthUser,isAdmin],depositController.getDepositsWithinDay);// deposit of the current day
router.get("/week",[isAuthUser,isAdmin],depositController.getDepositsWithinWeek);
router.get("/week/day",[isAuthUser,isAdmin],depositController.getDepositsWithinWeekdividedbyaday);

//get deposit of day,  month , and  year  I specify

// router.get("/month/day",[isAuthUser,isAdmin],depositController.getDepositsWithinMonthByDay);
router.get("/year/month/:year",[isAuthUser,isAdmin],depositController.getMonthlyDepositsForYear);  // works fine //?????
router.get('/year/month/total/:year',[isAuthUser,isAdmin], depositController.getDepositsForMonthandEachYearWithTotalDeposit);   //works fine 
router.get("/year/:year/week/:week",[isAuthUser,isAdmin],depositController.getDepositsForWeekOfYear); // works fine 

//get remaining of day,  month , and  year  I specify

router.get("/remaining",[isAuthUser,isAdmin],depositController.getRemainingDepositsForPeriod);// remaining for specified period
router.get("/remaining/year",[isAuthUser,isAdmin],depositController.getRemainingDepositsForYear);// remaining within a year 

//get commission  of day,  month , and  year  I specify
router.get("/commission",depositController.getCommissionForPeriod);// remaining for specified period



router.put("/update/:id",[isAuthUser,isUser],depositController.update);
router.delete("/delete/:id",depositController.deleteDeposit);

//test dash
router.get("/test",depositController.getAllStatistics);


export default router