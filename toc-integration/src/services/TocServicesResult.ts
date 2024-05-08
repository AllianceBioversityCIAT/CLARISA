import { Connection } from "typeorm";
import { Database } from "../database/db";
import { ValidatorTypes } from "../validators/validatorType";
import { ErrorValidators } from "../validators/errorsValidators";
import { TocSdgResults } from "../entities/tocSdgResults";
import { TocResultsIndicators } from "../entities/tocResultsIndicators";
import { SdgTarget } from "../entities/sdg_target";
import axios from "axios";
import { TocSdgsServices } from "./TocSdgsResults";
import { TocResultImpactAreaServices } from "./TocImpactAreaResults";
import { ActionAreaTocServices } from "./TocActionAreaResults";
import { TocResultServices } from "./TocResultServices";
import { TocOutputOutcomeRelationService } from "./TocOutputOutcomeRelations";
import { sendSlackNotification } from "../validators/slackNotification";
import { env } from "process";

export class TocServicesResults {
  public validatorType = new ValidatorTypes();
  public errorMessage = new ErrorValidators();
  public tocSdgResults = new TocSdgsServices();
  public tocImpactAreas = new TocResultImpactAreaServices();
  public actionAreaToc = new ActionAreaTocServices();
  public resultsToc = new TocResultServices();
  public outputOutcomeRelations = new TocOutputOutcomeRelationService();
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
      i.official_code
    FROM
      ${env.OST_DB}.tocs t
      INNER JOIN (
        SELECT
          max(t2.updated_at) AS max_date,
          t2.initvStgId
        FROM
          ${env.OST_DB}.tocs t2
          INNER JOIN ${env.OST_DB}.initiatives_by_stages ibs2 ON t2.initvStgId = ibs2.id
        where
          t2.active > 0
          AND t2.type = 1
        GROUP BY
          t2.initvStgId
      ) tr ON tr.initvStgId = t.initvStgId
      AND tr.max_date = t.updated_at
      INNER JOIN ${env.OST_DB}.initiatives_by_stages ibs ON t.initvStgId = ibs.id
      INNER JOIN ${env.OST_DB}.initiatives i ON i.id = ibs.initiativeId
    WHERE
      t.active > 0
      AND t.type = 1
      AND t.toc_id = ?;
    `;

    const getInit = await queryRunner.query(getInitOfficialCodeQuery, [
      idInitiativeToc,
    ]);
    const officialCode = getInit[0]?.official_code;
    console.log(`🚀 ~ Start sync with ${officialCode}`);

    try {
      const narrative = await axios({
        method: "get",
        url: tocHost,
        timeout: 20000,
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
        let relations =
          await this.outputOutcomeRelations.saveRelationsOutputOutcomes(
            narrative.data.relations,
            narrative.data.phase,
            idInitiativeToc
          );

        this.InformationSaving = {
          ...sdgTocResults,
          ...impactAreaTocResults,
          ...actionAreaResults,
          ...relations,
          ...tocResult,
        };
      } else {
        throw new Error("The properties are not in the object");
      }

      await this.saveInDataBase();
      sendSlackNotification(
        ":check1:",
        officialCode,
        "Synchronization with ToC was successful"
      );
      return this.InformationSaving;
    } catch (error) {
      sendSlackNotification(
        ":alert:",
        officialCode,
        "A problem occurred while synchronizing with ToC"
      );
      throw new Error(error);
    }
  }

  async saveInDataBase() {
    let database = new Database();
    let dbConn: Connection = await database.getConnection();
    let sdgRepo = await dbConn.getRepository(TocSdgResults);
  }
}
