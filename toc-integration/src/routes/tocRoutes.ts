import { Router } from "express";
import { tocController } from "../controllers/tocControllerResult";
import { sendSlackNotification } from "../validators/slackNotification";

const router = Router();
const TocResultDashboard = new tocController();

// get information toc result dashboard
router.post("/toc", TocResultDashboard.getTocResultDashboard);

// Get test
router.get("/tocs", TocResultDashboard.getToc);

// Test API TOC
router.get("/", TocResultDashboard.getHelloWorld);

// Get test
router.get("/test", TocResultDashboard.getTest);
export default router;
