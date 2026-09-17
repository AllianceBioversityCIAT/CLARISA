import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';
import { HeaderComponent } from './sections/header/header.component';

/**
 * 🛑 Aquí se declaraban además `AboutUs`, `Indicators`, `CardIndicator`,
 * `PartnersCollaborators`, `Publications`, `CardPublication` e
 * `InfoDashboardsApiServices`. Su contenido vive desde el revamp dentro de
 * `sections/header/header.component.html`, ninguna plantilla los invocaba y
 * ninguna ruta los cargaba: eran siete componentes que Angular compilaba en
 * cada build para no pintarlos nunca. Si alguna vez hacen falta, están en el
 * historial de git — borrarlos no pierde nada, mantenerlos sí costaba.
 */
@NgModule({
  declarations: [HomeComponent, HeaderComponent],
  imports: [CommonModule, HomeRoutingModule]
})
export class HomeModule {}
