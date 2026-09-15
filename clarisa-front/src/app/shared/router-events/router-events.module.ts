import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterEventsComponent } from './router-events.component';
import { GoogleAnalyticsComponent } from './components/google-analytics/google-analytics.component';



@NgModule({
  declarations: [
    RouterEventsComponent,
    GoogleAnalyticsComponent
  ],
  exports: [
    RouterEventsComponent
  ],
  imports: [
    CommonModule
  ]

})
export class RouterEventsModule { }
