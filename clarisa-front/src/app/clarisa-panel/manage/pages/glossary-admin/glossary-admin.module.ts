import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { GlossaryAdminRoutingModule } from './glossary-admin-routing.module';
import { GlossaryAdminComponent } from './glossary-admin.component';
import { GlossaryTermsPanelComponent } from './components/glossary-terms-panel/glossary-terms-panel.component';
import { GlossaryBulkPanelComponent } from './components/glossary-bulk-panel/glossary-bulk-panel.component';
import { GlossaryFileParserService } from './services/glossary-file-parser.service';

@NgModule({
  declarations: [GlossaryAdminComponent, GlossaryTermsPanelComponent, GlossaryBulkPanelComponent],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    GlossaryAdminRoutingModule,
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    MultiSelectModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService, GlossaryFileParserService]
})
export class GlossaryAdminModule {}
