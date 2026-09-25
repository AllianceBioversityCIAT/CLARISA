import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiReferenceComponent } from './api-reference.component';
import { ApiReferenceRoutingModule } from './api-reference-routing.module';

@NgModule({
  declarations: [ApiReferenceComponent],
  imports: [CommonModule, ApiReferenceRoutingModule],
})
export class ApiReferenceModule {}
