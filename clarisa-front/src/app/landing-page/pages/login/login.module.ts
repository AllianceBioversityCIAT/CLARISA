import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { LoginComponent } from './login.component';
import { LoginRoutingModule } from './login.routing.module';
import { InputTextModule } from 'primeng/inputtext';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GeneralInterceptorService } from '../../../shared/interceptors/auth-interceptor.service';
@NgModule({
  declarations: [LoginComponent],
  imports: [
    // 🛑 Sin `CommonModule` no hay `*ngIf`: el módulo nunca lo había necesitado
    // porque la plantilla no tenía ni una directiva estructural, y al añadir la
    // pantalla de entrada Angular avisó con NG0303 — el `*ngIf` se ignoraba en
    // silencio y la pantalla no aparecía nunca.
    CommonModule,
    LoginRoutingModule,
    InputTextModule,
    PanelModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: []
})
export class LoginModule {}
