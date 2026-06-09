import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-iframe-institution',
  templateUrl: './iframe-institution.component.html',
  styleUrls: ['./iframe-institution.component.scss'],
})
export class IframeInstituionComponent implements OnInit {
  powerBiUrl: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.powerBiUrl = this.sanitizer.bypassSecurityTrustResourceUrl(environment.powerBiInstitutionRequestUrl);
  }
}
