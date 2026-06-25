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
import { ToCWorkPackagesService } from "./ToCWorkPackages";
import { env } from "process";
import {
  DEFAULT_REPORTING_YEAR,
  resolvePhaseId,
  resolvePhaseIdFromReportingYear,
  SpSyncMeta,
} from "../types/sp-sync-meta";

export interface TocResultsReadFilters {
  year?: number;
  phaseId?: string;
}

export interface TocResultsReadMeta {
  year: number;
  phase: string;
}

const PHASES_LIST_CACHE_TTL_MS = 10 * 60 * 1000;
let phasesListCache: { body: unknown; fetchedAt: number } | null = null;

export class TocServicesResults {
  public validatorType = new ValidatorTypes();
  public errorMessage = new ErrorValidators();
  public tocSdgResults = new TocSdgsServices();
  public tocImpactAreas = new TocResultImpactAreaServices();
  public actionAreaToc = new ActionAreaTocServices();
  public resultsToc = new TocResultServices();
  public outputOutcomeRelations = new TocOutputOutcomeRelationService();
  public workPackages = new ToCWorkPackagesService();
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

  async spSplitInformation(spId: string, inputPhaseId?: string) {
    const startedAt = Date.now();
    const phaseId = resolvePhaseId(inputPhaseId);
    console.info({ message: "Start splitting information", spId, phaseId });
    let metaForNotif: SpSyncMeta = {
      phase: null,
      original_id: spId,
      version_id: null,
      official_code: spId,
    };

    try {
      const tocHost = `${env.LINK_TOC}/api/toc/${spId}?phase_id=${phaseId}`;
      console.info({ message: "Fetching data from ToC", tocHost });

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
        const {
          data,
          phase,
          original_id,
          version_id,
          version,
          toc_type,
        } = response.data || {};
        if (!this.validatorType.validatorIsArray(data)) {
          throw new Error("The property data must be an array");
        }

        const resolvedPhase =
          typeof phase === "string" || typeof phase === "number"
            ? String(phase)
            : phaseId;

        const reportingYear = await this.fetchReportingYear(phaseId);

        const meta: SpSyncMeta = {
          phase: resolvedPhase,
          original_id:
            typeof original_id === "string" || typeof original_id === "number"
              ? String(original_id)
              : spId,
          version_id:
            typeof version_id === "string" || typeof version_id === "number"
              ? String(version_id)
              : null,
          official_code: spId,
          reporting_year: reportingYear,
          version: typeof version === "number" ? version : null,
          toc_type: typeof toc_type === "string" ? toc_type : null,
        };
        metaForNotif = meta;

        const sdgV2 = await this.tocSdgResults.createTocSdgResultsV2(
          data,
          meta
        );

        const impactAreasV2 =
          await this.tocImpactAreas.saveImpactAreaTocResultV2(data, meta);

        const workPackagesV2 = await this.workPackages.saveWorkPackagesV2(
          data,
          meta
        );

        const resultsV2 = await this.resultsToc.saveTocResultsV2(
          data,
          meta,
          sdgV2.sdgResults,
          impactAreasV2.listImpactAreaResults
        );

        this.InformationSaving = {
          ...sdgV2,
          ...impactAreasV2,
          ...workPackagesV2,
          ...resultsV2,
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
          workPackages: workPackagesV2?.workPackages?.length ?? 0,
          results: resultsV2?.listResultsToc?.length ?? 0,
        };
        const durationMs = Date.now() - startedAt;

        sendSlackNotification(
          ":check1:",
          spId,
          `*Synchronization with the new ToC Integration was successful*\nTime=${durationMs}ms\nSDGs Results=${counts.sdgResults
          } | SDGs Targets=${counts.sdgTargets} | SDGs Indicators=${counts.sdgIndicators
          }\nImpact Areas=${counts.impactAreas} | IA Global Targets=${counts.impactAreaGlobalTargets
          } | IA Indicators=${counts.impactAreaIndicators}
          \nWPs (AOW)=${counts.workPackages}
          \nResults=${counts.results}
          \nPhase=${metaForNotif.phase ?? "null"}\nReporting Year=${metaForNotif.reporting_year ?? "null"}\nEntity ID=${metaForNotif.original_id ?? "null"
          }`
        );

        console.info({ message: "Finished saving ToC results" });
        return {
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
        `*A problem occurred while synchronizing with the new ToC Integration*\nTime=${durationMs}ms\nPhase=${metaForNotif.phase ?? "null"
        }\nEntity ID=${metaForNotif.original_id ?? "null"}`,
        error
      );
      throw new Error(error as any);
    }
  }

  private async fetchPhasesListBody(forceRefresh = false): Promise<unknown> {
    const now = Date.now();
    if (
      !forceRefresh &&
      phasesListCache &&
      now - phasesListCache.fetchedAt < PHASES_LIST_CACHE_TTL_MS
    ) {
      return phasesListCache.body;
    }

    const listUrl = `${env.LINK_TOC}/api/phases`;
    const { data: listBody } = await axios.get(listUrl, { timeout: 10000 });
    phasesListCache = { body: listBody, fetchedAt: now };
    return listBody;
  }

  private listPhasesFromResponse(
    body: unknown
  ): { id?: string; reporting_year?: unknown }[] {
    if (!body || typeof body !== "object") {
      return [];
    }

    const record = body as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return record.data.filter(
        (item): item is { id?: string; reporting_year?: unknown } =>
          !!item && typeof item === "object"
      );
    }

    if (Array.isArray(body)) {
      return body.filter(
        (item): item is { id?: string; reporting_year?: unknown } =>
          !!item && typeof item === "object"
      );
    }

    if (typeof record.id === "string") {
      return [record as { id?: string; reporting_year?: unknown }];
    }

    return [];
  }

  private async fetchReportingYear(phaseId: string): Promise<number | null> {
    try {
      const listBody = await this.fetchPhasesListBody();
      const phase = this.findPhaseInPhasesResponse(listBody, phaseId);
      if (phase) {
        return this.parseReportingYear(phase.reporting_year);
      }

      console.warn({
        message: "Phase not found in ToC phases list",
        phaseId,
      });
      return null;
    } catch (error) {
      console.warn({
        message: "Could not fetch reporting_year from ToC phases API",
        phaseId,
        error,
      });
      return null;
    }
  }

  private async fetchPhaseIdByReportingYear(
    reportingYear: number
  ): Promise<string | null> {
    try {
      const listBody = await this.fetchPhasesListBody();
      for (const phase of this.listPhasesFromResponse(listBody)) {
        if (
          typeof phase.id === "string" &&
          this.parseReportingYear(phase.reporting_year) === reportingYear
        ) {
          return phase.id;
        }
      }
    } catch (error) {
      console.warn({
        message: "Could not resolve phase id from ToC phases API",
        reportingYear,
        error,
      });
    }

    return resolvePhaseIdFromReportingYear(reportingYear);
  }

  private createReadFilterError(
    message: string,
    statusCode: number
  ): Error & { statusCode: number } {
    const error = new Error(message) as Error & { statusCode: number };
    error.statusCode = statusCode;
    return error;
  }

  async resolveReadFilters(
    filters: TocResultsReadFilters = {}
  ): Promise<TocResultsReadMeta> {
    const reportingYear = filters.year ?? DEFAULT_REPORTING_YEAR;
    const explicitPhaseId =
      typeof filters.phaseId === "string" ? filters.phaseId.trim() : "";

    if (explicitPhaseId) {
      const yearFromPhase = await this.fetchReportingYear(explicitPhaseId);
      const resolvedYear = yearFromPhase ?? reportingYear;

      if (
        filters.year != null &&
        yearFromPhase != null &&
        filters.year !== yearFromPhase
      ) {
        throw this.createReadFilterError(
          `Query parameters 'year' (${filters.year}) and 'phase' (${explicitPhaseId}) refer to different reporting years (${yearFromPhase}).`,
          400
        );
      }

      return {
        year: resolvedYear,
        phase: explicitPhaseId,
      };
    }

    const phaseId = await this.fetchPhaseIdByReportingYear(reportingYear);
    if (!phaseId) {
      throw this.createReadFilterError(
        `No ToC phase found for reporting year ${reportingYear}.`,
        404
      );
    }

    return {
      year: reportingYear,
      phase: phaseId,
    };
  }

  private findPhaseInPhasesResponse(
    body: unknown,
    phaseId: string
  ): { id?: string; reporting_year?: unknown } | null {
    if (!body || typeof body !== "object") {
      return null;
    }

    const record = body as Record<string, unknown>;

    if (record.id === phaseId) {
      return record as { id?: string; reporting_year?: unknown };
    }

    const candidates: unknown[] = [];
    if (Array.isArray(record.data)) {
      candidates.push(...record.data);
    }
    if (Array.isArray(body)) {
      candidates.push(...body);
    }

    for (const item of candidates) {
      if (
        item &&
        typeof item === "object" &&
        (item as { id?: string }).id === phaseId
      ) {
        return item as { id?: string; reporting_year?: unknown };
      }
    }

    return null;
  }

  private parseReportingYear(value: unknown): number | null {
    if (typeof value === "number") {
      return value;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async avisaSplitInformation() {
    let metaForNotif: { phase: string | null; original_id: string | null } = {
      phase: null,
      original_id: 'SGP-02',
    };

    const startedAt = Date.now();
    console.info({ message: "Start splitting information AVISA" });

    try {
      const tocHost = `https://toc.mel.cgiar.org/api/toc/a993d3ff-fd7d-4d27-a646-9c6b42dc8da3`;
      console.info({ message: "Fetching data from ToC", tocHost });

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
        const { data, phase, original_id, version_id } = response.data || {};
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
              : 'SGP-02',
          version_id:
            typeof response.data.version_id === "string" ||
              typeof response.data.version_id === "number"
              ? String(version_id)
              : null,
          official_code: 'SGP-02',
        };
        metaForNotif = meta;

        const sdgV2 = await this.tocSdgResults.createTocSdgResultsV2(
          data,
          meta
        );

        const impactAreasV2 =
          await this.tocImpactAreas.saveImpactAreaTocResultV2(data, meta);

        const workPackagesV2 = await this.workPackages.saveWorkPackagesV2(
          data,
          meta
        );

        const resultsV2 = await this.resultsToc.saveTocResultsV2(
          data,
          meta,
          sdgV2.sdgResults,
          impactAreasV2.listImpactAreaResults
        );

        this.InformationSaving = {
          ...sdgV2,
          ...impactAreasV2,
          ...workPackagesV2,
          ...resultsV2,
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
          workPackages: workPackagesV2?.workPackages?.length ?? 0,
          results: resultsV2?.listResultsToc?.length ?? 0,
        };
        const durationMs = Date.now() - startedAt;

        sendSlackNotification(
          ":check1:",
          'SGP-02',
          `*Synchronization with the new ToC Integration was successful*\nTime=${durationMs}ms\nSDGs Results=${counts.sdgResults
          } | SDGs Targets=${counts.sdgTargets} | SDGs Indicators=${counts.sdgIndicators
          }\nImpact Areas=${counts.impactAreas} | IA Global Targets=${counts.impactAreaGlobalTargets
          } | IA Indicators=${counts.impactAreaIndicators}
          \nWPs (AOW)=${counts.workPackages}
          \nResults=${counts.results}
          \nPhase=${metaForNotif.phase ?? "null"}\nEntity ID=${metaForNotif.original_id ?? "null"
          }`
        );

        console.info({ message: "Finished saving ToC results" });
        return {
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
        'SGP-02',
        `*A problem occurred while synchronizing with the new ToC Integration*\nTime=${durationMs}ms\nPhase=${metaForNotif.phase ?? "null"
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

  async getTocResultsByCategoryAndCode(
    category: string,
    officialCode: string,
    filters: TocResultsReadFilters = {}
  ): Promise<{ meta: TocResultsReadMeta; results: any[] }> {
    const readMeta = await this.resolveReadFilters(filters);
    const dataSource: DataSource = await Database.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      let queryResults = `
        SELECT DISTINCT
          tr.id AS id,
          tr.toc_result_id AS toc_internal_id,
          tr.result_title AS title,
          tr.result_description AS description,
          tr.result_type AS toc_type_id,
          tr.result_type AS toc_level_id,
          tr.official_code AS official_code,
          tr.wp_id AS work_package_id,
          wp.acronym AS wp_short_name,
          tr.phase AS phase,
          tr.version_id AS version_id,
          tr.related_node_id AS related_node_id
        FROM toc_results tr
        LEFT JOIN toc_work_packages wp ON wp.toc_id = tr.wp_id
          AND (
            (wp.phase IS NOT NULL AND wp.phase = tr.phase)
            OR (wp.phase IS NULL AND wp.year = ?)
          )
        WHERE tr.is_active = 1
          AND tr.category = ?
          AND tr.official_code = ?
          AND tr.phase = ?
      `;
      const paramsResults: any[] = [
        readMeta.year,
        category.toUpperCase(),
        officialCode,
        readMeta.phase,
      ];

      queryResults += ` ORDER BY wp.acronym, tr.result_title ASC`;

      const results = await queryRunner.query(queryResults, paramsResults);

      if (!results || !results.length) {
        return { meta: readMeta, results: [] };
      }

      const tocResultIds = results.map((r: any) => r.id);

      const placeholders = tocResultIds.map(() => "?").join(", ");
      const queryIndicators = `
        SELECT
          tri.toc_results_id AS toc_results_id,
          tri.id AS indicator_id,
          tri.toc_result_indicator_id,
          tri.related_node_id,
          tri.indicator_description,
          tri.unit_messurament,
          tri.type_value,
          tri.type_name,
          tri.location,
          trit.target_value,
          trit.target_date
        FROM toc_results_indicators tri
        LEFT JOIN toc_result_indicator_target trit
          ON trit.id_indicator = tri.id
        WHERE tri.toc_results_id IN (${placeholders})
          AND tri.is_active = 1
      `;

      const indicatorRows = await queryRunner.query(queryIndicators, tocResultIds);

      const indicatorMap = new Map<number, any[]>();

      for (const row of indicatorRows) {
        const tocResultId = Number(row.toc_results_id);
        if (!indicatorMap.has(tocResultId)) {
          indicatorMap.set(tocResultId, []);
        }

        const list = indicatorMap.get(tocResultId)!;

        let indicator = list.find((ind: any) => ind.indicator_id === Number(row.indicator_id));

        if (!indicator) {
          indicator = {
            indicator_id: Number(row.indicator_id),
            toc_result_indicator_id: row.toc_result_indicator_id ?? null,
            related_node_id: row.related_node_id ?? null,
            indicator_description: row.indicator_description ?? null,
            unit_messurament: row.unit_messurament ?? null,
            type_value: row.type_value ?? null,
            type_name: row.type_name ?? null,
            location: row.location ?? null,
            targets: []
          };
          list.push(indicator);
        }

        if (row.target_value !== null && row.target_value !== undefined) {
          const targetExists = indicator.targets.some((t: any) => t.target_value === row.target_value && t.target_date === row.target_date);
          if (!targetExists) {
            indicator.targets.push({
              target_value: row.target_value,
              target_date: row.target_date ?? null
            });
          }
        }
      }

      const tocResultIdsForSynergy = results.map((r: { id: number }) => r.id);
      const synergyMap = new Map<number, any[]>();

      if (tocResultIdsForSynergy.length) {
        const synergyPlaceholders = tocResultIdsForSynergy.map(() => "?").join(", ");
        const synergyRows = await queryRunner.query(
          `SELECT
            toc_results_id,
            toc_result_id_toc,
            synergy_id,
            related_node_id,
            flow_id,
            description,
            creation_date,
            updating_date,
            main,
            flow_toc_id,
            initiative_id,
            flow_title,
            flow_type,
            wp_type,
            flow_status,
            status_reason,
            project_state,
            cgiar_project,
            approved,
            archive,
            organization_id,
            diagram_image,
            flow_creation_date,
            flow_version,
            flow_main,
            flow_last_update
          FROM toc_result_synergy_programs
          WHERE toc_results_id IN (${synergyPlaceholders})
             OR (
               toc_results_id IS NULL
               AND toc_result_id_toc IN (
                 SELECT related_node_id
                 FROM toc_results
                 WHERE id IN (${synergyPlaceholders})
               )
             )`,
          [...tocResultIdsForSynergy, ...tocResultIdsForSynergy]
        );

        const relatedNodeIdByResultId = new Map<number, string>(
          results
            .filter(
              (r: { id: number; related_node_id?: string }) =>
                typeof r.related_node_id === "string" && r.related_node_id.length > 0
            )
            .map((r: { id: number; related_node_id: string }) => [
              r.id,
              r.related_node_id,
            ])
        );

        for (const row of synergyRows) {
          const key =
            typeof row.toc_results_id === "number"
              ? Number(row.toc_results_id)
              : Array.from(relatedNodeIdByResultId.entries()).find(
                  ([, relatedNodeId]) => relatedNodeId === row.toc_result_id_toc
                )?.[0];

          if (key == null) continue;

          if (!synergyMap.has(key)) {
            synergyMap.set(key, []);
          }
          synergyMap.get(key)!.push({
            synergy_id: row.synergy_id ?? null,
            related_node_id: row.related_node_id ?? null,
            flow_id: row.flow_id ?? null,
            description: row.description ?? null,
            creation_date: row.creation_date ?? null,
            updating_date: row.updating_date ?? null,
            main: row.main ?? null,
            flow: {
              id: row.flow_toc_id ?? null,
              initiative_id: row.initiative_id ?? null,
              title: row.flow_title ?? null,
              type: row.flow_type ?? null,
              wp_type: row.wp_type ?? null,
              status: row.flow_status ?? null,
              status_reason: row.status_reason ?? null,
              project_state: row.project_state ?? null,
              cgiar_project: row.cgiar_project ?? null,
              approved: row.approved ?? null,
              archive: row.archive ?? null,
              organization_id: row.organization_id ?? null,
              diagram_image: row.diagram_image ?? null,
              creation_date: row.flow_creation_date ?? null,
              version: row.flow_version ?? null,
              main: row.flow_main ?? null,
              last_update: row.flow_last_update ?? null,
            },
          });
        }
      }

      const enrichedResults = results.map((row: any) => {
        return {
          toc_result_id: row.id,
          toc_internal_id: row.toc_internal_id,
          title: row.title,
          description: row.description,
          toc_type_id: row.toc_type_id,
          toc_level_id: row.toc_level_id,
          official_code: row.official_code,
          work_package_id: row.work_package_id,
          wp_short_name: row.wp_short_name,
          phase: row.phase,
          version_id: row.version_id,
          related_node_id: row.related_node_id ?? null,
          synergy_programs: synergyMap.get(row.id) ?? [],
          indicators: indicatorMap.get(row.id) ?? []
        };
      });

      return { meta: readMeta, results: enrichedResults };
    } finally {
      await queryRunner.release();
    }
  }
}

