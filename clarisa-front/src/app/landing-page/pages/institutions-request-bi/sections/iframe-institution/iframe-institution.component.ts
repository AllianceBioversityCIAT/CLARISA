import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-iframe-institution',
  templateUrl: './iframe-institution.component.html',
  styleUrls: ['./iframe-institution.component.scss'],
})
export class IframeInstituionComponent implements OnInit {
  // Sanitized URL for the Power BI iframe — must be SafeResourceUrl for Angular security
  powerBiUrl: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    // Bypass Angular's default URL sanitization since Power BI embed URLs are trusted
    // The URL is configured per environment (dev/staging/prod) via environment files
    this.powerBiUrl = this.sanitizer.bypassSecurityTrustResourceUrl(environment.powerBiInstitutionRequestUrl);
  }
}
