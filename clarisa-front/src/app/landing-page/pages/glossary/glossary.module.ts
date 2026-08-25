import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { GlossaryRoutingModule } from './glossary-routing.module';
import { GlossaryComponent } from './glossary.component';
import { BannerComponent } from './sections/banner/banner.component';

@NgModule({
  declarations: [GlossaryComponent, BannerComponent],
  imports: [CommonModule, FormsModule, GlossaryRoutingModule]
})
export class GlossaryModule {}
