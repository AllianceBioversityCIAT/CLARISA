import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MultiSelectModule } from 'primeng/multiselect';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { GlobalConceptsAdminRoutingModule } from './global-concepts-admin-routing.module';
import { GlobalConceptsAdminComponent } from './global-concepts-admin.component';
import { GcConceptsPanelComponent } from './components/gc-concepts-panel/gc-concepts-panel.component';
import { GcRequestsPanelComponent } from './components/gc-requests-panel/gc-requests-panel.component';
import { GcImportPanelComponent } from './components/gc-import-panel/gc-import-panel.component';
import { GlossaryFileParserService } from '../glossary-admin/services/glossary-file-parser.service';

@NgModule({
  declarations: [GlobalConceptsAdminComponent, GcConceptsPanelComponent, GcRequestsPanelComponent, GcImportPanelComponent],
  imports: [
    CommonModule,
    FormsModule,
    GlobalConceptsAdminRoutingModule,
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    MultiSelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService, GlossaryFileParserService]
})
export class GlobalConceptsAdminModule {}
