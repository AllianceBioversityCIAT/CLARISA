import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AdminSection } from '../../microservices-admin.component';

@Component({
  selector: 'app-admin-sidebar',
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.scss'],
})
export class AdminSidebarComponent {
  @Input() activeSection: AdminSection = 'api-keys';
  @Output() sectionChange = new EventEmitter<AdminSection>();

  readonly navItems: { id: AdminSection; label: string; hint: string }[] = [
    {
      id: 'api-keys',
      label: 'API Keys',
      hint: 'Create, rotate, and revoke keys',
    },
    {
      id: 'mises',
      label: 'MIS Registry',
      hint: 'Manage microservice identities',
    },
  ];

  select(section: AdminSection): void {
    this.sectionChange.emit(section);
  }
}
