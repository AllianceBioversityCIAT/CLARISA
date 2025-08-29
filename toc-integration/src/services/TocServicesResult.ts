import { DataSource } from "typeorm";
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
    const dataSource: DataSource = await Database.getDataSource();

    try {
      const queryRunner = dataSource.createQueryRunner();
      let tocResultRepo = dataSource.getRepository(TocResultsIndicators);
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
    const dataSource: DataSource = await Database.getDataSource();
    let iniciativeRepo = dataSource.getRepository(SdgTarget);
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
    const dataSource: DataSource = await Database.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
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

  async spSplitInformation(spId: string) {
    const startedAt = Date.now();
    let metaForNotif: { phase: string | null; original_id: string | null } = {
      phase: null,
      original_id: spId,
    };

    try {
      const tocHost = `${env.LINK_TOC}/api/toc/${spId}`;

      const response = await axios({
        method: "get",
        url: tocHost,
        timeout: 20000,
      });

      if (
        this.validatorType.existPropertyInObjectMul(response.data, [
          "data",
          "relations",
        ])
      ) {
        const { data, phase, original_id } = response.data || {};
        if (!this.validatorType.validatorIsArray(data)) {
          throw new Error("The property data must be an array");
        }
        const meta = {
          phase:
            typeof phase === "string" || typeof phase === "number"
              ? String(phase)
              : null,
          original_id:
            typeof original_id === "string" || typeof original_id === "number"
              ? String(original_id)
              : spId,
        };
        metaForNotif = meta;

        const sdgV2 = await this.tocSdgResults.createTocSdgResultsV2(
          data,
          meta
        );

        const impactAreasV2 =
          await this.tocImpactAreas.saveImpactAreaTocResultV2(data, meta);

        this.InformationSaving = {
          ...sdgV2,
          ...impactAreasV2,
        };

        await this.saveInDataBase();

        const counts = {
          sdgResults: sdgV2?.sdgResults?.length ?? 0,
          sdgTargets: sdgV2?.sdgTargets?.length ?? 0,
          sdgIndicators: sdgV2?.sdgIndicators?.length ?? 0,
          impactAreas: impactAreasV2?.listImpactAreaResults?.length ?? 0,
          impactAreaGlobalTargets: impactAreasV2?.globalTargets?.length ?? 0,
          impactAreaIndicators:
            impactAreasV2?.impactAreaIndicators?.length ?? 0,
        };
        const durationMs = Date.now() - startedAt;

        sendSlackNotification(
          ":check1:",
          spId,
          `*Synchronization with the new ToC Integration was successful*\nTime=${durationMs}ms\nSDGs Results=${
            counts.sdgResults
          } | SDGs Targets=${counts.sdgTargets} | SDGs Indicators=${
            counts.sdgIndicators
          }\nImpact Areas=${counts.impactAreas} | IA Global Targets=${
            counts.impactAreaGlobalTargets
          } | IA Indicators=${counts.impactAreaIndicators}\nPhase=${
            metaForNotif.phase ?? "null"
          }\nEntity ID=${metaForNotif.original_id ?? "null"}`
        );

        return {
          ...this.InformationSaving,
          meta: metaForNotif,
          counts,
          durationMs,
        };
      } else {
        throw new Error(
          "The properties (data or relations) are not in the object"
        );
      }
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      sendSlackNotification(
        ":alert:",
        spId,
        `*A problem occurred while synchronizing with the new ToC Integration*\nTime=${durationMs}ms\nPhase=${
          metaForNotif.phase ?? "null"
        }\nEntity ID=${metaForNotif.original_id ?? "null"}`,
        error
      );
      throw new Error(error as any);
    }
  }

  async saveInDataBase() {
    let database = new Database();
    const dataSource: DataSource = await Database.getDataSource();
    let sdgRepo = dataSource.getRepository(TocSdgResults);
  }
}
