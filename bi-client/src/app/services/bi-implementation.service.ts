import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as pbi from 'powerbi-client';
import { ExportTablesService } from './export-tables.service';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { IBDGoogleAnalytics } from 'ibdevkit';
import { VariablesService } from './variables.service';
import { ActivatedRoute } from '@angular/router';
import { BiFilter } from '../shared/bi.interface';
import { GetBiReport, GetBiReports, Resp } from '../shared/api.interface';

@Injectable({
  providedIn: 'root'
})
export class BiImplementationService {
  constructor(
    public http: HttpClient,
    private exportTablesSE: ExportTablesService,
    private variablesSE: VariablesService,
    private activatedRoute: ActivatedRoute
  ) {}

  apiBaseUrl = environment.apiBaseUrl + 'result-dashboard-bi';
  report: pbi.Report = {} as pbi.Report;
  showExportSpinner = false;
  currentReportName = '';
  showGlobalLoader = true;

  getBiReports() {
    return this.http.get<Resp<GetBiReports>>(`${this.apiBaseUrl}/bi-reports`).pipe(
      map(resp => {
        return resp?.response;
      })
    );
  }

  getBiReportWithCredentialsById(reportId: string) {
    return this.http.get(`${this.apiBaseUrl}/bi-reports/report/${reportId}`);
  }

  getBiReportWithCredentialsByreportName(body: {
    report_name: string;
    subpage_id: number | string;
  }) {
    return this.http.post<GetBiReport>(`${this.apiBaseUrl}/bi-reports/reportName`, body);
  }

  renderReport(
    { token, report }: GetBiReport,
    reportName: string,
    pageName?: string
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const embedUrl = report.embed_url;
      const embedReportId = report.report_id;
      const config = {
        type: 'report',
        tokenType: pbi.models.TokenType.Embed,
        accessToken: token,
        embedUrl: embedUrl,
        id: embedReportId,
        permissions: pbi.models.Permissions.All,
        settings: {
          filterPaneEnabled: false,
          navContentPaneEnabled: false
        },
        fullscreen: {
          enabled: true // Enables fullscreen mode
        },
        pageName
      };
      const embedContainer: HTMLElement = document.getElementById('reportContainer') as HTMLElement;
      const powerbi = new pbi.service.Service(
        pbi.factories.hpmFactory,
        pbi.factories.wpmpFactory,
        pbi.factories.routerFactory
      );
      this.report = powerbi.embed(embedContainer, config) as pbi.Report;
      console.log(this.report);

      this.report.off('loaded');
      this.report.on('loaded', () => {
        this.variablesSE.processes[3].works = true;
        this.showGlobalLoader = false;
      });

      this.report.on(
        'pageChanged',
        (event: pbi.service.ICustomEvent<{ newPage: { displayName: string } }>) => {
          const page = event.detail.newPage;
          IBDGoogleAnalytics().trackPageView(this.convertNameToTitle(page.displayName));
        }
      );

      this.report.on('error', (err: pbi.service.ICustomEvent<{ e: string }>) => {
        console.log('Error');
        console.error(err);
        this.variablesSE.processes[3].works = false;
        reject(new Error(err.detail.e)); // Pass the error message as the argument
      });
      this.exportButton(this.report);
    });
  }

  convertVariableToList(variables: string, param_type: string) {
    const varsList = variables?.split(',');
    return param_type === 'int' ? varsList.map((v: string) => parseInt(v)) : varsList;
  }

  applyFilters(filters: BiFilter[]) {
    filters.forEach((filter: BiFilter) => {
      const variables = this.activatedRoute.snapshot.queryParams[filter?.variablename];
      console.log(filter);
      console.log(this.convertVariableToList(variables, filter?.param_type));
      const filterConfig: pbi.models.IBasicFilter = {
        $schema: 'https://powerbi.com/product/schema#basic',
        target: {
          table: filter?.table,
          column: filter?.column
        },
        operator: filter?.operator as pbi.models.BasicFilterOperators,
        values: this.convertVariableToList(variables, filter?.param_type),
        filterType: pbi.models.FilterType.Basic
      };

      console.log(JSON?.stringify(filterConfig));
      // Replace report's filters with the same target data field.
      try {
        this.report.updateFilters(pbi.models.FiltersOperations.Replace, [filterConfig]);
      } catch (errors) {
        console.error(errors);
      }
    });
  }

  convertNameToTitle = (reportPageName: string) => {
    const ttile = `${this.currentReportName} (${reportPageName})`;
    return ttile.replace(/-/g, ' ')?.charAt(0)?.toUpperCase() + ttile?.slice(1);
  };

  getReportName(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.report
        .getPages()
        .then((pages: pbi.Page[]) => {
          const activePage = pages.find(page => page.isActive);

          if (activePage) {
            resolve(activePage.displayName);
          } else {
            reject(new Error('No se pudo obtener el nombre de la página activa.'));
          }
        })
        .catch(error => {
          reject(new Error(error));
        });
    });
  }

  exportButton(report: pbi.Report) {
    // Insert here the code you want to run after the report is rendered
    // report.off removes all event handlers for a specific event
    report.off('bookmarkApplied');
    // report.on will add an event listener.
    report.on(
      'bookmarkApplied',
      async (event: pbi.service.ICustomEvent<{ bookmarkName: number }>) => {
        const bookmarkNameFound = await this.getBookmarkName(report, event.detail.bookmarkName);
        this.detectButtonAndTable(report, bookmarkNameFound);
      }
    );
  }

  async getBookmarkName(report: pbi.Report, bookmarkId: number) {
    const bookmarks = await report.bookmarksManager.getBookmarks();
    const bookmarkFound = bookmarks.find(
      (bm: pbi.models.IReportBookmark) => bm.name == String(bookmarkId)
    );
    return bookmarkFound?.displayName;
  }

  async detectButtonAndTable(report: pbi.Report, bookmarkName: string | undefined) {
    if (!bookmarkName || bookmarkName.search('export_data') < 0) return;
    console.log('Exporting data...\n');
    this.showExportSpinner = true;
    try {
      const pages = await report.getPages();
      const page = pages.filter(page => {
        return page.isActive;
      })[0];

      const visuals = await page.getVisuals();

      const visual = visuals.find(vv => vv.title.search('export_data_table') >= 0);

      const result = await visual?.exportData(pbi.models.ExportDataType.Summarized);

      const dateCETTime = new Date().toLocaleString('en-US', {
        timeZone: 'Europe/Madrid',
        hour12: false
      });

      const dateCET =
        new Date().getFullYear() +
        ('0' + new Date().getDate().toLocaleString('es-ES')).slice(-2) +
        ('0' + (new Date().getMonth() + 1)).slice(-2);

      const dateText1 = dateCETTime.split(',');
      const dateTime = dateText1[1].split(':').join('');

      await this.exportTablesSE.exportExcel(
        result?.data || '',
        `export_data_table_results_${dateCET}_${dateTime.trim()}CET`
      );
      IBDGoogleAnalytics().trackEvent('download xlsx', 'file name');
    } catch (errors) {
      console.error(errors);
    }

    this.showExportSpinner = false;
  }
}
