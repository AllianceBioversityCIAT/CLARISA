import { Connection } from "typeorm";
import { Database } from "../database/db";
import { ValidatorTypes } from "../validators/validatorType";
import { ErrorValidators } from "../validators/errorsValidators";
import { CreateSdgResultsDto } from "../dto/tocSdgResults";
import { TocSdgResultsSdgTargetsDto } from "../dto/tocSdgResultsSdgTargets";
import { TocSdgResultsSdgIndicatorsDto } from "../dto/tocSdgResultsSdgIndicators";
import { TocImpactAreaResultsDto } from "../dto/tocImpactAreaResults";
import { TocImpactAreaResultsGlobalTargetsDto } from "../dto/tocImpactAreaResultsGlobalTargets";
import { TocImpactAreaResultsImpactAreaIndicatorsDto } from "../dto/tocImpactAreaResultsImpactAreaIndicators";
import { TocImpactAreaResultsSdgResultsDto } from "../dto/tocImpactAreaResultsSdgResults";
import { TocActionAreaResultsDto } from "../dto/tocActionAreaResults";
import { TocActionAreaResultsOutcomesIndicatorsDto } from "../dto/tocActionAreaResultsOutcomesIndicators";
import { TocActionAreaResultsImpactAreaResultsDto } from "../dto/tocActionAreaResultsImpactAreaResults";
import { TocResultsDto } from "../dto/tocResults";
import { TocResultsActionAreaResultsDto } from "../dto/tocResultsActionAreaResults";
import { TocResultsImpactAreaResultsDto } from "../dto/tocResultsImpactAreaResults";
import { TocResultsSdgResultsDto } from "../dto/tocResultsSdgResults";
import { TocSdgResultsSdgTargets } from "../entities/tocSdgResultsSdgTargets";
import { TocResultsIndicatorsDto } from "../dto/tocResultsIndicators";
import { TocResultsRegionsDto } from "../dto/tocResultsRegions";
import { TocResultsCountriesDto } from "../dto/tocResultsCountries";
import { TocResults } from "../entities/tocResults";
import { TocImpactAreaResults } from "../entities/tocImpactAreaResults";
import { TocActionAreaResults } from "../entities/tocActionAreaResults";
import { TocSdgResults } from "../entities/tocSdgResults";
import { TocSdgResultsSdgIndicators } from "../entities/tocSdgResultsSdgIndicators";
import { TocImpactAreaResultsGlobalTargets } from "../entities/tocImpactAreaResultsGlobalTargets";
import { TocImpactAreaResultsImpactAreaIndicators } from "../entities/tocImpactAreaResultsImpactAreaIndicators";
import { TocImpactAreaResultsSdgResults } from "../entities/tocImpactAreaResultsSdgResults";
import { TocActionAreaResultsOutcomesIndicators } from "../entities/tocActionAreaResultsOutcomesIndicators";
import { TocActionAreaResultsImpactAreaResults } from "../entities/tocActionAreaResultsImpactAreaResults";
import { TocResultsActionAreaResults } from "../entities/tocResultsActionAreaResults";
import { TocResultsImpactAreaResults } from "../entities/tocResultsImpactAreaResults";
import { TocResultsSdgResults } from "../entities/tocResultsSdgResults";
import { TocResultsIndicators } from "../entities/tocResultsIndicators";
import { TocResultsCountries } from "../entities/tocResultsCountries";
import { TocResultsRegions } from "../entities/tocResultsRegions";

import { SdgTarget } from "../entities/sdg_target";
import axios from "axios";
import { TocSdgsServices } from "./TocSdgsResults";
import { TocResultImpactAreaServices } from "./TocImpactAreaResults";
import { ActionAreaTocServices } from "./TocActionAreaResults";
import { TocResultServices } from "./TocResultServices";
import { sendSlackNotification } from "../validators/slackNotification";
import { env } from "process";

export class TocServicesResults {
  public validatorType = new ValidatorTypes();
  public errorMessage = new ErrorValidators();
  public tocSdgResults = new TocSdgsServices();
  public tocImpactAreas = new TocResultImpactAreaServices();
  public actionAreaToc = new ActionAreaTocServices();
  public resultsToc = new TocResultServices();
  InformationSaving = null;
  async queryTest() {
    let database = new Database();
    let dbConn: Connection = await database.getConnection();

    try {
      const queryRunner = dbConn.createQueryRunner();
      let tocResultRepo = await dbConn.getRepository(TocResultsIndicators);
      await queryRunner.connect();

      const getInitiatives = await tocResultRepo.find();

      await queryRunner.release();

      return { getInitiatives };
    } catch (error) {
      return { message: "getInitiatives" + error };
    }
  }

  async entitiesTest() {
    let database = new Database();
    let dbConn: Connection = await database.getConnection();
    let iniciativeRepo = dbConn.getRepository(SdgTarget);
    try {
      let getInitiatives = await iniciativeRepo.find();

      return { getInitiatives };
    } catch (error) {
      return { message: "getInitiatives" + error };
    }
  }

  async splitInformation(idInitiativeToc: string) {
    let tocHost = `${env.LINK_TOC}/api/toc/${idInitiativeToc}/dashboard-result`;

    let database = new Database();
    let dbConn: Connection = await database.getConnection();
    const queryRunner = await dbConn.createQueryRunner();
    await queryRunner.connect();

    const getInitOfficialCodeQuery = `
      SELECT 
        *
      FROM 
        prdb.clarisa_initiatives ci
      WHERE
        ci.toc_id = ?
    `;

    const getInit = await queryRunner.query(getInitOfficialCodeQuery, [
      idInitiativeToc,
    ]);
    const officialCode = getInit[0]?.official_code;

    try {
      const narrative = await axios({
        method: "get",
        url: tocHost,
        timeout: 20000, // only wait for 2s
      });

      if (
        this.validatorType.existPropertyInObjectMul(narrative.data, [
          "sdg_results",
          "impact_area_results",
          "action_area_results",
          "output_outcome_results",
        ])
      ) {
        let sdgTocResults = await this.tocSdgResults.createTocSdgResults(
          narrative.data.sdg_results,
          idInitiativeToc,
          narrative.data.phase
        );

        let impactAreaTocResults =
          await this.tocImpactAreas.saveImpactAreaTocResult(
            narrative.data.impact_area_results,
            idInitiativeToc,
            sdgTocResults.sdgResults,
            narrative.data.phase
          );

        let actionAreaResults = await this.actionAreaToc.saveActionAreaToc(
          narrative.data.action_area_results,
          idInitiativeToc,
          impactAreaTocResults.listImpactAreaResults,
          narrative.data.phase
        );

        let tocResult = await this.resultsToc.saveTocResults(
          narrative.data.output_outcome_results,
          sdgTocResults.sdgResults,
          actionAreaResults.actionAreaToc,
          impactAreaTocResults.listImpactAreaResults,
          idInitiativeToc,
          narrative.data.phase,
          narrative.data.version_id
        );

        this.InformationSaving = {
          ...sdgTocResults,
          ...impactAreaTocResults,
          ...actionAreaResults,
          ...tocResult,
        };
      }

      await this.saveInDataBase();
      return this.InformationSaving;
    } catch (error) {
      sendSlackNotification(officialCode);
      throw new Error(error);
    }
  }

  async saveInDataBase() {
    let database = new Database();
    let dbConn: Connection = await database.getConnection();
    let sdgRepo = await dbConn.getRepository(TocSdgResults);
  }
}
