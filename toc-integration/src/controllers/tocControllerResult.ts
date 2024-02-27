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
      console.log(error.response);
      return res.status(error.response).json(error.response.data);
    }
  }

  async getToc(req: Request, res: Response) {
    try {
      let servicesInformation = new TocServicesResults();

      const message = await servicesInformation.queryTest();

      res.json({ response: "Hello Toc", message });
    } catch (error) {
      console.log(error.response);
      return res.status(error.response.status).json(error.response.data);
    }
  }

  async getHelloWorld(req: Request, res: Response) {
    try {
      const html = `
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta http-equiv="X-UA-Compatible" content="ie=edge" />
            <title>Welcome to the ToC Integration 🍦</title>
          </head>
          <body>
            <h1>Hello World! 🍦</h1>
            <p>Welcome to the ToC Integration, a REST API designed to synchronize ToC Board information with the entire PRMS ecosystem.</p>
          </body>
        </html>  
      `;

      res.status(200).json({ message: "Welcome to the ToC Integration 🍦" });
    } catch (error) {
      res.status(500).json({
        error: "An error occurred at the time of making the request.",
      });
    }
  }

  async getTest(req: Request, res: Response) {
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
