import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiReferenceComponent } from './api-reference.component';
import { ApiReferenceRoutingModule } from './api-reference-routing.module';
import { DocumentationHorizontalMenuModule } from '../documentation/components/horizontal-menu/horizontal-menu.module';

@NgModule({
  declarations: [ApiReferenceComponent],
  imports: [
    CommonModule,
    ApiReferenceRoutingModule,
    DocumentationHorizontalMenuModule,
  ],
})
export class ApiReferenceModule {}
