import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { SharedModule } from 'primeng/api';
import { SidebarModule } from 'primeng/sidebar';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { GcInfoModule } from '../../pages/global-concepts-admin/components/gc-info/gc-info.module';
import { JustificationDialogComponent } from './justification-dialog/justification-dialog.component';
import { UserPickerComponent } from './user-picker/user-picker.component';
import { AccessSkinComponent } from './access-skin.component';

const PRIME = [
  AutoCompleteModule,
  ButtonModule,
  CheckboxModule,
  DialogModule,
  DropdownModule,
  InputSwitchModule,
  InputTextModule,
  InputTextareaModule,
  SharedModule,
  SidebarModule,
  TableModule,
  ToastModule,
  TooltipModule
];

/**
 * What the Users and Roles screens share: the justification confirm, the
 * people search, the (i) of the MELIAF admin, and the PrimeNG pieces both use.
 * The form skin comes from `app-access-skin`; the page pieces from
 * `_access-page.scss`, included by each page.
 */
@NgModule({
  declarations: [JustificationDialogComponent, UserPickerComponent, AccessSkinComponent],
  imports: [CommonModule, FormsModule, GcInfoModule, ...PRIME],
  exports: [CommonModule, FormsModule, GcInfoModule, JustificationDialogComponent, UserPickerComponent, AccessSkinComponent, ...PRIME]
})
export class AccessSharedModule {}
