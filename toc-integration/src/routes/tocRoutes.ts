import { Router } from "express";
import { tocController } from "../controllers/tocControllerResult";
import { sendSlackNotification } from "../validators/slackNotification";

const router = Router();
const TocResultDashboard = new tocController();

// get information toc result dashboard
router.post("/toc", TocResultDashboard.getTocResultDashboard);

// Get test
router.get("/tocs", TocResultDashboard.getToc);

router.post("/test-slack-notificacion", (req, res) => {
  try {
    sendSlackNotification(
      ":alert:",
      "INIT-01",
      "A problem occurred while synchronizing with ToC"
    );
    return res.status(200).json({ message: "Notificación enviada" });
  } catch (error) {
    res.status(500).json({ error: "Ha ocurrido un error" });
  }
});

// Get test
router.get("/test", TocResultDashboard.getTest);
export default router;
