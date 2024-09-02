import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PartnerRequestRoutingModule } from './partner-request-routing.module';
import { PartnerRequestComponent } from './partner-request.component';
import { VerticalMenuComponent } from './components/vertical-menu/vertical-menu.component';
import { ContentPartnerComponent } from './components/content-partner/content-partner.component';
import { ListInstitutionComponent } from './components/content-partner/section/list-institution/list-institution.component';
import { FormNewInstitutionComponent } from './components/content-partner/section/form-new-institution/form-new-institution.component';
import { TableModule } from 'primeng/table';
import { CalendarModule } from 'primeng/calendar';
import { SliderModule } from 'primeng/slider';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { ContextMenuModule } from 'primeng/contextmenu';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { DropdownModule } from 'primeng/dropdown';
import { FileUploadModule } from 'primeng/fileupload';
import { ToolbarModule } from 'primeng/toolbar';
import { RatingModule } from 'primeng/rating';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { BadgeModule } from 'primeng/badge';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { FormCountryOfficeComponent } from './components/content-partner/section/form-country-office/form-country-office.component';
import { RequestInstitutionsFormComponent } from './components/content-partner/section/request-institutions-form/request-institutions-form.component';
import { MessagesModule } from 'primeng/messages';
import { ConfirmationService, MessageService } from 'primeng/api';
import { GeneralInterceptorService } from '../../../../shared/interceptors/auth-interceptor.service';
import { NgxPaginationModule } from 'ngx-pagination';
import { MessageModule } from 'primeng/message';
import { EditRequestComponent } from './components/content-partner/section/request-institutions-form/section/edit-request/edit-request.component';
import { PartnerBulkComponent } from './components/content-partner/section/partner-bulk/partner-bulk.component';
import { RippleModule } from 'primeng/ripple';

@NgModule({
  declarations: [
    PartnerRequestComponent,
    VerticalMenuComponent,
    ContentPartnerComponent,
    ListInstitutionComponent,
    FormNewInstitutionComponent,
    FormCountryOfficeComponent,
    RequestInstitutionsFormComponent,
    EditRequestComponent,
    PartnerBulkComponent,
  ],
  imports: [
    CommonModule,
    PartnerRequestRoutingModule,
    TableModule,
    CalendarModule,
    SliderModule,
    DialogModule,
    MultiSelectModule,
    ContextMenuModule,
    DropdownModule,
    ButtonModule,
    ToastModule,
    InputTextModule,
    ProgressBarModule,
    FileUploadModule,
    ToolbarModule,
    RatingModule,
    FormsModule,
    RadioButtonModule,
    InputNumberModule,
    ConfirmDialogModule,
    InputTextareaModule,
    DynamicDialogModule,
    ReactiveFormsModule,
    MessagesModule,
    MessageModule,
    NgxPaginationModule,
    BadgeModule,
    RippleModule,
  ],
  providers: [ConfirmationService, MessageService],
})
export class PartnerRequestModule {}
