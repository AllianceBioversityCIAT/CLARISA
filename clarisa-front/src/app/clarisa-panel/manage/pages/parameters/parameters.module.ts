import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ParametersRoutingModule } from './parameters-routing.module';
import { ParametersComponent } from './parameters.component';

@NgModule({
  declarations: [ParametersComponent],
  imports: [CommonModule, FormsModule, InputSwitchModule, ToastModule, ParametersRoutingModule],
  providers: [MessageService]
})
export class ParametersModule {}
