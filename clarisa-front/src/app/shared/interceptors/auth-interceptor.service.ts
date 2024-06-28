import {
  HttpEvent,
  HttpHandler,
  HttpHeaders,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class GeneralInterceptorService implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (
      !this.authService?.localStorageToken &&
      !req.url.indexOf(environment.apiUrl)
    ) {
      return next.handle(req.clone());
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService?.localStorageToken}`,
    });

    const reqClone = req.clone({
      headers,
    });

    return next.handle(reqClone);
  }
}
