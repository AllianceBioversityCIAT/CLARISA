import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BiImplementationService } from '../../services/bi-implementation.service';
import { Title } from '@angular/platform-browser';
import { IBDGoogleAnalytics } from 'ibdevkit';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { VariablesService } from '../../services/variables.service';
import { CommonModule } from '@angular/common';
import { TabVisibilityService } from '../../services/tab-visibility.service';
import { LoaderComponent } from '../../components/loader/loader.component';
import { GetBiReport } from '../../shared/api.interface';

@Component({
  selector: 'app-bi',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  templateUrl: './bi.component.html',
  styleUrl: './bi.component.scss'
})
export default class BiComponent implements OnInit {
  reportName = '';
  sectionNumber = '';
  reportDescription = '';
  isFullScreen = false;
  showFullScreen = false;
  wasInactive = false;
  showMonitorPanel = false;
  constructor(
    public biImplementationSE: BiImplementationService,
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    private tabVisibilityService: TabVisibilityService,
    public variablesSE: VariablesService
  ) {}

  async ngOnInit() {
    this.runEvents();
    this.getQueryParams();
    this.getBiReportWithCredentialsByreportName();
    this.tabVisibilityService.tabVisibilityChanged.subscribe(
      (isTabInactiveFor10Minutes: boolean) => {
        if (isTabInactiveFor10Minutes) {
          this.wasInactive = true;
        }
      }
    );
  }

  runEvents() {
    const eventName = this.activatedRoute.snapshot.paramMap.get('event') || '';
    if (eventName == 'monitor') {
      this.showMonitorPanel = true;
    }
  }

  reloadPage() {
    window.location.reload();
  }

  toggleFullScreen() {
    const fullscreenElement = this.getFullscreenElement();

    if (!fullscreenElement) {
      this.enterFullScreen();
    } else {
      this.exitFullScreen();
    }
  }

  getFullscreenElement(): Element | null | undefined {
    return (
      document.fullscreenElement ||
      (document as Document & { mozFullScreenElement: Element | undefined }).mozFullScreenElement ||
      (document as Document & { msFullscreenElement: Element | undefined }).msFullscreenElement ||
      (document as Document & { webkitFullscreenElement: Element | undefined })
        .webkitFullscreenElement
    );
  }

  enterFullScreen() {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else {
      this.requestFullScreenVendorSpecific(element);
    }
    this.isFullScreen = true;
  }

  requestFullScreenVendorSpecific(element: HTMLElement) {
    const mozRequestFullScreen = (
      element as HTMLElement & { mozRequestFullScreen?: () => Promise<void> }
    ).mozRequestFullScreen;
    const webkitRequestFullscreen = (
      element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
    ).webkitRequestFullscreen;
    const msRequestFullscreen = (
      element as HTMLElement & { msRequestFullscreen?: () => Promise<void> }
    ).msRequestFullscreen;

    if (mozRequestFullScreen) {
      mozRequestFullScreen();
    } else if (webkitRequestFullscreen) {
      (webkitRequestFullscreen as () => Promise<void>)();
    } else if (msRequestFullscreen) {
      msRequestFullscreen();
    }
  }

  exitFullScreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else {
      this.exitFullScreenVendorSpecific();
    }
    this.isFullScreen = false;
  }

  exitFullScreenVendorSpecific() {
    const mozCancelFullScreen = (
      document as Document & { mozCancelFullScreen?: () => Promise<void> }
    ).mozCancelFullScreen;
    const webkitExitFullscreen = (
      document as Document & { webkitExitFullscreen?: () => Promise<void> }
    ).webkitExitFullscreen;
    const msExitFullscreen = (document as Document & { msExitFullscreen?: () => Promise<void> })
      .msExitFullscreen;

    if (mozCancelFullScreen) {
      mozCancelFullScreen();
    } else if (webkitExitFullscreen) {
      (webkitExitFullscreen as () => Promise<void>)();
    } else if (msExitFullscreen) {
      msExitFullscreen();
    }
  }

  getQueryParams() {
    this.reportName = this.activatedRoute.snapshot.paramMap.get('reportName') || '';
    this.sectionNumber = this.activatedRoute.snapshot.queryParams['sectionNumber'];
  }

  biHeight() {
    const reportDescriptionHtml = document.getElementById('reportDescription');
    return `calc(100vh - 65px - ${reportDescriptionHtml?.clientHeight ?? 0}px)`;
  }

  validateBAckResponseProcess(reportData: { token: string; azureValidation: number }) {
    const { token, azureValidation } = reportData;
    if (token) this.variablesSE.processes[1].works = true;
    this.variablesSE.processes[2].works = true;
    switch (azureValidation) {
      case 1:
        this.variablesSE.processes[0].works = true;
        break;
      case 2:
        this.variablesSE.processes[0].works = 2;
        break;
      default:
        this.variablesSE.processes[0].works = false;
        break;
    }
  }

  async getBiReportWithCredentialsByreportName() {
    if (!this.reportName) return;

    try {
      const reportData: GetBiReport = await firstValueFrom(
        this.biImplementationSE.getBiReportWithCredentialsByreportName({
          report_name: this.reportName,
          subpage_id: this.sectionNumber
        })
      );

      const { report } = reportData;
      this.showFullScreen = Boolean(report.has_full_screen);
      this.validateBAckResponseProcess(reportData);

      this.reportDescription = report?.report_description;
      this.reportDescriptionInnerHtml();

      await this.biImplementationSE.renderReport(
        reportData,
        this.reportName,
        report?.mainPage == 'Record not found' ? '' : report?.mainPage
      );
      const reportPageName = await this.biImplementationSE.getReportName();
      this.biImplementationSE.currentReportName = report?.report_name;
      this.gATracking(reportPageName);
    } catch (error) {
      console.error(error);
      this.reportDescriptionInnerHtml();
      this.variablesSE.processes[2].works = false;
    }
  }

  gATracking(reportPageName: string) {
    this.titleService.setTitle(this.biImplementationSE.convertNameToTitle(reportPageName));
    IBDGoogleAnalytics().initialize(environment.googleAnalyticsId);
  }

  reportDescriptionInnerHtml() {
    const element: HTMLElement | null = document.getElementById('reportDescription');
    if (element) element.innerHTML = this.reportDescription;
  }
}
