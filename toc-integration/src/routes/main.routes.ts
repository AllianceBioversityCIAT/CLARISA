import { Router } from "express";
import toc from "./toc.routes";

const Routes = Router();

Routes.use("/toc-integration", toc);

export default Routes;
