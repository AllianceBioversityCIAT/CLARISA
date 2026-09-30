import { AdminChartsModule } from '../microservices-admin/components/charts/admin-charts.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipsModule } from 'primeng/chips';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';
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
import { GcConceptDialogComponent } from './components/gc-concept-dialog/gc-concept-dialog.component';
import { GcConceptCreateDialogComponent } from './components/gc-concept-create-dialog/gc-concept-create-dialog.component';
import { GcConceptPickerComponent } from './components/gc-concept-picker/gc-concept-picker.component';
import { GcLabelsEditorComponent } from './components/gc-labels-editor/gc-labels-editor.component';
import { GcRelationsEditorComponent } from './components/gc-relations-editor/gc-relations-editor.component';
import { GcMappingsEditorComponent } from './components/gc-mappings-editor/gc-mappings-editor.component';
import { GcIconsEditorComponent } from './components/gc-icons-editor/gc-icons-editor.component';
import { GcCustomFieldsFormComponent } from './components/gc-custom-fields-form/gc-custom-fields-form.component';
import { GcSetupPanelComponent } from './components/gc-setup-panel/gc-setup-panel.component';
import { GcSetupFieldsComponent } from './components/gc-setup-fields/gc-setup-fields.component';
import { GcSetupListsComponent } from './components/gc-setup-lists/gc-setup-lists.component';
import { GcSetupCollectionsComponent } from './components/gc-setup-collections/gc-setup-collections.component';
import { GcUsagePanelComponent } from './components/gc-usage-panel/gc-usage-panel.component';
import { GcInfoModule } from './components/gc-info/gc-info.module';
import { GcConceptAssistantComponent } from './components/gc-concept-assistant/gc-concept-assistant.component';
import { GcAssistMarkComponent } from './components/gc-concept-assistant/gc-assist-mark.component';
import { GcAssistToggleComponent } from './components/gc-concept-assistant/gc-assist-toggle.component';
import { GlossaryFileParserService } from '../glossary-admin/services/glossary-file-parser.service';

@NgModule({
  declarations: [
    GlobalConceptsAdminComponent,
    GcConceptsPanelComponent,
    GcRequestsPanelComponent,
    GcImportPanelComponent,
    GcConceptDialogComponent,
    GcConceptCreateDialogComponent,
    GcConceptPickerComponent,
    GcLabelsEditorComponent,
    GcRelationsEditorComponent,
    GcMappingsEditorComponent,
    GcIconsEditorComponent,
    GcCustomFieldsFormComponent,
    GcSetupPanelComponent,
    GcSetupFieldsComponent,
    GcSetupListsComponent,
    GcSetupCollectionsComponent,
    GcUsagePanelComponent,
    GcConceptAssistantComponent,
    GcAssistMarkComponent,
    GcAssistToggleComponent
  ],
  imports: [
    CommonModule,
    AdminChartsModule,
    GcInfoModule,
    FormsModule,
    GlobalConceptsAdminRoutingModule,
    AutoCompleteModule,
    ButtonModule,
    CheckboxModule,
    ChipsModule,
    ConfirmDialogModule,
    DialogModule,
    DropdownModule,
    InputSwitchModule,
    InputTextModule,
    InputTextareaModule,
    MultiSelectModule,
    SelectButtonModule,
    SkeletonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService, GlossaryFileParserService]
})
export class GlobalConceptsAdminModule {}
