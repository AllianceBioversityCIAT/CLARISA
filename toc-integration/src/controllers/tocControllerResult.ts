import axios from "axios";
import { Request, Response } from "express";
import { TocServicesResults } from "../services/TocServicesResult";
import {
  DEFAULT_REPORTING_YEAR,
  parseReportingYearInput,
} from "../types/sp-sync-meta";

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
    const phaseId =
      typeof req.body.phaseId === "string" ? req.body.phaseId : undefined;
    try {
      let servicesInformation = new TocServicesResults();
      const data = await servicesInformation.spSplitInformation(spIds, phaseId);
      res.json({ response: data });
    } catch (error) {
      console.error(error);
      return res.status(500).json(error);
    }
  }
  
  /**
   * @param req
   * @param res
   * New ToC Integration dashboard for Avisa
   */
  async bulkAvisaTocResultDashboard(req: Request, res: Response) {
    try {
      let servicesInformation = new TocServicesResults();
      const data = await servicesInformation.avisaSplitInformation();
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

  async getTocResultsByCategoryAndCode(req: Request, res: Response) {
    const { category, official_code } = req.params;
    const { phase, year } = req.query;

    if (!category || !official_code) {
      return res.status(400).json({
        message: "Parameters 'category' and 'official_code' are required.",
        statusCode: 400
      });
    }

    const parsedYear =
      year === undefined
        ? DEFAULT_REPORTING_YEAR
        : parseReportingYearInput(year);

    if (year !== undefined && parsedYear == null) {
      return res.status(400).json({
        message: "Query parameter 'year' must be a valid reporting year.",
        statusCode: 400
      });
    }

    try {
      let servicesInformation = new TocServicesResults();
      const { meta, results } =
        await servicesInformation.getTocResultsByCategoryAndCode(
          category,
          official_code,
          {
            year: parsedYear ?? DEFAULT_REPORTING_YEAR,
            phaseId: typeof phase === "string" ? phase : undefined,
          }
        );
      return res.json({ meta, response: results });
    } catch (error: any) {
      console.error(error);
      const statusCode =
        typeof error?.statusCode === "number" ? error.statusCode : 500;
      return res.status(statusCode).json({
        message: error.message || "An error occurred while fetching ToC results.",
        statusCode
      });
    }
  }
}

