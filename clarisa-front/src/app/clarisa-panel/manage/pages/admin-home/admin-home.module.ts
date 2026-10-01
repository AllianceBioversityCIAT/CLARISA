import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AdminHomeComponent } from './admin-home.component';

@NgModule({
  declarations: [AdminHomeComponent],
  imports: [CommonModule, ButtonModule, RouterModule.forChild([{ path: '', component: AdminHomeComponent }])]
})
export class AdminHomeModule {}
