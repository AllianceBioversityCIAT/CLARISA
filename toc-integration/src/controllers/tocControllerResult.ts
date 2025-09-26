import axios from "axios";
import { Request, Response } from "express";
import { TocServicesResults } from "../services/TocServicesResult";

export class tocController {
  async getTocResultDashboard(req: Request, res: Response) {
    const id_toc = await req.body.id_toc;
    try {
      let servicesInformation = new TocServicesResults();

      const message = await servicesInformation.splitInformation(id_toc);

      res.json({ response: message });
    } catch (error) {
      console.error(error);
      return res.status(500).json(error);
    }
  }

  /**
   * @param req
   * @param res
   * New ToC Integration dashboard
   */
  async bulkSpTocResultDashboard(req: Request, res: Response) {
    const spIds = await req.body.spId;
    try {
      let servicesInformation = new TocServicesResults();
      const data = await servicesInformation.spSplitInformation(spIds);
      res.json({ response: data });
    } catch (error) {
      console.error(error);
      return res.status(500).json(error);
    }
  }

  async getToc(_req: Request, res: Response) {
    try {
      let servicesInformation = new TocServicesResults();

      const message = await servicesInformation.queryTest();

      res.json({ response: "Hello Toc", message });
    } catch (error) {
      console.error(error);
      return res.status(500).json(error);
    }
  }

  async getHelloWorld(_req: Request, res: Response) {
    try {
      res.status(200).json({ message: "Welcome to the ToC Integration 🍦" });
    } catch (error) {
      res.status(500).json({
        error: "An error occurred at the time of making the request.",
      });
    }
  }

  async getTest(_req: Request, res: Response) {
    try {
      let servicesInformation = new TocServicesResults();

      const message = await servicesInformation.entitiesTest();

      res.json({ response: "Hello Toc", message });
    } catch (error) {
      console.log(error.response);
      return res.status(error.response.status).json(error.response.data);
    }
  }
}
