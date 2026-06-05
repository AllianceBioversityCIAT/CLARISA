import { Component } from '@angular/core';

export type AdminSection = 'api-keys' | 'usage' | 'mises';

@Component({
  selector: 'app-microservices-admin',
  templateUrl: './microservices-admin.component.html',
  styleUrls: ['./microservices-admin.component.scss'],
})
export class MicroservicesAdminComponent {
  activeSection: AdminSection = 'api-keys';

  setSection(section: AdminSection): void {
    this.activeSection = section;
  }
}
