import { Component } from '@angular/core';

export type GlossarySection = 'terms' | 'bulk';

@Component({
  selector: 'app-glossary-admin',
  templateUrl: './glossary-admin.component.html',
  styleUrls: ['./glossary-admin.component.scss']
})
export class GlossaryAdminComponent {
  activeSection: GlossarySection = 'terms';

  /** Bumped after a bulk import so the terms table reloads when reopened. */
  termsReloadToken = 0;

  setSection(section: GlossarySection): void {
    this.activeSection = section;
  }

  onImported(): void {
    this.termsReloadToken++;
    this.activeSection = 'terms';
  }
}
