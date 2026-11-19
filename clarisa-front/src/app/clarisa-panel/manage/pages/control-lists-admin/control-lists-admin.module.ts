import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { ControlListsAdminRoutingModule } from './control-lists-admin-routing.module';
import { ControlListsAdminComponent } from './control-lists-admin.component';
import { ListsScreenComponent } from './lists-screen/lists-screen.component';
import { ListWorkspaceComponent } from './list-workspace/list-workspace.component';
import { NewListDialogComponent } from './components/new-list-dialog/new-list-dialog.component';
import { FieldsTabComponent } from './components/fields-tab/fields-tab.component';
import { FieldAddDialogComponent } from './components/field-add-dialog/field-add-dialog.component';
import { FieldRenameDialogComponent } from './components/field-rename-dialog/field-rename-dialog.component';
import { FieldTypeDialogComponent } from './components/field-type-dialog/field-type-dialog.component';
import { FieldDeleteDialogComponent } from './components/field-delete-dialog/field-delete-dialog.component';
import { PublishDialogComponent } from './components/publish-dialog/publish-dialog.component';
import { DeleteListDialogComponent } from './components/delete-list-dialog/delete-list-dialog.component';
import { RecordsTabComponent } from './components/records-tab/records-tab.component';
import { RecordDialogComponent } from './components/record-dialog/record-dialog.component';
import { RecordStatusDialogComponent } from './components/record-status-dialog/record-status-dialog.component';
import { EndpointTabComponent } from './components/endpoint-tab/endpoint-tab.component';
import { ListPathComponent } from './components/list-path/list-path.component';
import { FieldTypePickerComponent } from './components/field-type-picker/field-type-picker.component';

@NgModule({
  declarations: [
    ControlListsAdminComponent,
    ListsScreenComponent,
    ListWorkspaceComponent,
    NewListDialogComponent,
    FieldsTabComponent,
    FieldAddDialogComponent,
    FieldRenameDialogComponent,
    FieldTypeDialogComponent,
    FieldDeleteDialogComponent,
    PublishDialogComponent,
    DeleteListDialogComponent,
    RecordsTabComponent,
    RecordDialogComponent,
    RecordStatusDialogComponent,
    EndpointTabComponent,
    ListPathComponent,
    FieldTypePickerComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ControlListsAdminRoutingModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    InputSwitchModule,
    InputTextModule,
    InputTextareaModule,
    TableModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService]
})
export class ControlListsAdminModule {}
