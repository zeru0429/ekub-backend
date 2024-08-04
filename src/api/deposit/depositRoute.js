import express from "express"; // Assuming you're using Express
const router = express.Router(); // Create a router object
import depositController from "./depositController.js";
import { isAdmin, isAuthUser, isUser } from "../../middlewares/auth.js";

router.post("/register", depositController.register);
router.put("/update/:id", depositController.update);
router.get("/get/:id", depositController.getSingleDeposit);
router.get("/getAll", depositController.getAllDeposits);

//get deposit of today, current month , current year
router.get("/day", depositController.getDepositsWithinDay); // deposit of the current day
router.get("/week", depositController.getDepositsWithinWeek);
router.get("/week/day", depositController.getDepositsWithinWeekdividedbyaday);

//get deposit of day,  month , and  year  I specify

// router.get("/month/day",depositController.getDepositsWithinMonthByDay);
router.get("/year/month/:year", depositController.getMonthlyDepositsForYear); // works fine //?????
router.get(
  "/year/month/total/:year",
  depositController.getDepositsForMonthandEachYearWithTotalDeposit
); //works fine
router.get(
  "/year/:year/week/:week",
  depositController.getDepositsForWeekOfYear
); // works fine

//get remaining of day,  month , and  year  I specify

router.get("/remaining", depositController.getRemainingDepositsForPeriod); // remaining for specified period
router.get("/remaining/year", depositController.getRemainingDepositsForYear); // remaining within a year

//get commission  of day,  month , and  year  I specify
router.get("/commission", depositController.getCommissionForPeriod); // remaining for specified period

router.put("/update/:id", depositController.update);
router.delete("/delete/:id", depositController.deleteDeposit);

//test dash
router.get("/test", depositController.getAllStatistics);

export default router;
