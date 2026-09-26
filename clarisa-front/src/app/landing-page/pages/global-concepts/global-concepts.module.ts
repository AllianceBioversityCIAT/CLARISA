import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { GlobalConceptsRoutingModule } from './global-concepts-routing.module';
import { GcBannerComponent } from './sections/gc-banner/gc-banner.component';
import { CheckTextComponent } from './sections/check-text/check-text.component';
import { ProposeFormComponent } from './sections/propose-form/propose-form.component';
import { ConceptListComponent } from './pages/concept-list/concept-list.component';
import { ConceptDetailComponent } from './pages/concept-detail/concept-detail.component';
import { RequestVerifyComponent } from './pages/request-verify/request-verify.component';
import { RequestFollowComponent } from './pages/request-follow/request-follow.component';

@NgModule({
  declarations: [
    GcBannerComponent,
    CheckTextComponent,
    ProposeFormComponent,
    ConceptListComponent,
    ConceptDetailComponent,
    RequestVerifyComponent,
    RequestFollowComponent
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GlobalConceptsRoutingModule]
})
export class GlobalConceptsModule {}
