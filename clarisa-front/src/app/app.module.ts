import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RouterEventsModule } from './shared/router-events/router-events.module';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { GeneralInterceptorService } from './shared/interceptors/auth-interceptor.service';
import { TawkToModule } from './shared/components/tawk-to/tawk-to.module';
import { NgxPaginationModule } from 'ngx-pagination';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, BrowserAnimationsModule, AppRoutingModule, HttpClientModule, RouterEventsModule, TawkToModule, NgxPaginationModule],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: GeneralInterceptorService,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
