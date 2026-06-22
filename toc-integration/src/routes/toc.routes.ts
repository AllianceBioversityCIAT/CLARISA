import { Router } from "express";
import { tocController } from "../controllers/tocControllerResult";

const router = Router();
const TocResultDashboard = new tocController();
 
// get information toc result dashboard
router.post("/toc", TocResultDashboard.getTocResultDashboard);

// * New Portfolio Route
router.post("/toc/sp", TocResultDashboard.bulkSpTocResultDashboard)

// * New Portfolio Route
router.post("/toc/avisa", TocResultDashboard.bulkAvisaTocResultDashboard)

// Get test
router.get("/tocs", TocResultDashboard.getToc);

// Test API TOC
router.get("/", TocResultDashboard.getHelloWorld);

// Get test
router.get("/test", TocResultDashboard.getTest);

// Get ToC Results by Category and Initiative
router.get("/toc/results/category/:category/initiative/:official_code", TocResultDashboard.getTocResultsByCategoryAndCode);

export default router;
