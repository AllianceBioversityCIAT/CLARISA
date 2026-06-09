import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MicroservicesAdminRoutingModule } from './microservices-admin-routing.module';
import { MicroservicesAdminComponent } from './microservices-admin.component';
import { AdminSidebarComponent } from './components/admin-sidebar/admin-sidebar.component';
import { ApiKeysPanelComponent } from './components/api-keys-panel/api-keys-panel.component';
import { ApiKeyUsageDashboardComponent } from './components/api-key-usage-dashboard/api-key-usage-dashboard.component';
import { MisesPanelComponent } from './components/mises-panel/mises-panel.component';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';
import { ConfirmationService, MessageService } from 'primeng/api';

@NgModule({
  declarations: [
    MicroservicesAdminComponent,
    AdminSidebarComponent,
    ApiKeysPanelComponent,
    ApiKeyUsageDashboardComponent,
    MisesPanelComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    MicroservicesAdminRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    ToastModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    CalendarModule,
    MultiSelectModule,
    ChartModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService, ConfirmationService],
})
export class MicroservicesAdminModule {}
