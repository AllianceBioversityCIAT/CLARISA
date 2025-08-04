import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DocumentationRoutingModule } from './documentation-routing.module';
import { DocumentationComponent } from './documentation.component';
import { VerticalMenuComponent } from './components/vertical-menu/vertical-menu.component';
import { HorizontalMenuComponent } from './components/horizontal-menu/horizontal-menu.component';
import { ContentComponent } from './components/content/content.component';
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
import { DynamicTableFiltersComponent } from '../../shared/components/dynamic-table-filters/dynamic-table-filters.component';
import { FormsModule } from '@angular/forms';
@NgModule({
  declarations: [DocumentationComponent, VerticalMenuComponent, HorizontalMenuComponent, ContentComponent, DynamicTableFiltersComponent],
  imports: [
    CommonModule,
    DocumentationRoutingModule,
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
    FormsModule
  ]
})
export class DocumentationModule {}
