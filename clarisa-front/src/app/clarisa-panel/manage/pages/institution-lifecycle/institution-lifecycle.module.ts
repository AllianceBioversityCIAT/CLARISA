import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InstitutionLifecycleRoutingModule } from './institution-lifecycle-routing.module';
import { InstitutionLifecycleComponent } from './institution-lifecycle.component';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CalendarModule } from 'primeng/calendar';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

@NgModule({
  declarations: [InstitutionLifecycleComponent],
  imports: [
    CommonModule,
    RouterModule,
    InstitutionLifecycleRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    CalendarModule,
    ToastModule,
    TagModule,
    TooltipModule,
  ],
  providers: [MessageService],
})
export class InstitutionLifecycleModule {}
