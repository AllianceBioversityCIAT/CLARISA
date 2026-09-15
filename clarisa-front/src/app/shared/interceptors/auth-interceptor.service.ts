import { HttpErrorResponse, HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GeneralInterceptorService implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.authService?.localStorageToken && !req.url.indexOf(environment.apiUrl)) {
      return next.handle(req.clone());
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService?.localStorageToken}`
    });

    const reqClone = req.clone({
      headers
    });

    return next.handle(reqClone).pipe(
      catchError((error: HttpErrorResponse) => {
        if (this.isExpiredSession(req, error)) {
          this.authService.logout();
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * A 401 from the API on a request that carried a session means the session is
   * no longer valid, and the user has to be taken out: nothing did that before,
   * so an expired token left the panel open with every screen failing silently.
   *
   * The login call is excluded on purpose — its 401 means "wrong credentials"
   * and belongs to the form, which shows the message. Logging out there would
   * reload the page and wipe it.
   */
  private isExpiredSession(req: HttpRequest<unknown>, error: HttpErrorResponse): boolean {
    return error.status === 401 && req.url.startsWith(environment.apiUrl) && !req.url.includes('auth/login') && !!this.authService?.localStorageToken;
  }
}
