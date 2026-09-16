import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Validators, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/shared/services/auth.service';
import { UserAuth } from '../../../shared/interfaces/user-auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  /**
   * Si la contraseña se ve o no. Empieza oculta: mostrarla es una decisión de
   * quien escribe, no el estado por defecto — puede haber alguien mirando.
   */
  showPassword = false;

  /**
   * `true` mientras el API responde. El formulario se bloquea y el botón se
   * convierte en su propia barra de progreso — sin diálogo encima, sin GIF.
   *
   * 🛑 Dura lo que tarde la petición, ni un milisegundo más: no hay temporizador
   * que lo alargue para que la espera «se vea».
   */
  signingIn = false;

  /**
   * Lo que se puede hacer una vez dentro, en frases de una línea. El formulario
   * de acceso es la única pantalla donde alguien se detiene sin saber todavía
   * qué hay al otro lado; el carrusel lo cuenta sin ocupar sitio.
   *
   * 🛑 Provisional: el copy del producto lo decide Yeck.
   */
  readonly claims = [
    'Request a new partner institution and follow its review',
    'Keep the glossary the CGIAR reporting systems read',
    'Manage the lifecycle of the 10,630 institutions in the registry',
    'Issue and revoke the API keys other platforms sign with'
  ];

  claim = 0;
  private rotator?: ReturnType<typeof setInterval>;
  private typing?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.authService.inLogin = true;
    if (!!this.authService.localStorageUser) {
      //change this route when the new component is ready
      //this.router.navigate(['/admin']);
    }
  }

  loginForm: FormGroup;
  successLogin = false;

  /**
   * Lo que salió mal en el último intento, o cadena vacía.
   *
   * 🛑 El componente ya lo rellenaba; lo que faltaba era pintarlo: el rediseño
   * del formulario se llevó por delante el único sitio donde se mostraba, así
   * que una contraseña incorrecta devolvía el botón a su sitio y ni una palabra
   * más (Yeck, 16-sep-2026). Un formulario que no dice que falló se lee como un
   * formulario que no hizo nada.
   */
  menssageValidate = '';

  displayConfirm = false;
  ngOnInit() {
    this.loginForm = new FormGroup({
      login: new FormControl('', Validators.required),
      password: new FormControl('', Validators.required)
    });

    // 2,8 s por frase: a 4,5 s se hacía lento y la gente ya había dejado de
    // mirar (lección de alohados, 15-sep-2026).
    this.rotator = setInterval(() => (this.claim = (this.claim + 1) % this.claims.length), 2800);

    // Al escribir de nuevo, el error anterior se va: dejarlo puesto mientras se
    // corrige la contraseña hace creer que el intento nuevo también falló.
    this.typing = this.loginForm.valueChanges.subscribe(() => {
      if (this.menssageValidate) {
        this.menssageValidate = '';
      }
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.rotator);
    this.typing?.unsubscribe();
  }

  onSubmit() {
    if (this.loginForm.invalid || this.signingIn) {
      return;
    }

    const authData: UserAuth = { ...this.loginForm.value };

    this.signingIn = true;
    this.menssageValidate = '';

    this.authService.userAuth(authData).subscribe({
      next: resp => {
        const { access_token, user } = resp;
        this.authService.localStorageToken = access_token;
        this.authService.localStorageUser = user;
        this.successLogin = true;
        this.router.navigate(['/clarisa-panel/manage/partner-request']);
      },
      error: (error: unknown) => {
        // El formulario vuelve de inmediato: nadie debería esperar para
        // enterarse de que se equivocó de contraseña.
        this.signingIn = false;
        this.menssageValidate = LoginComponent.describe(error);
      }
    });
  }

  /**
   * El fallo, en una frase que se pueda leer sin abrir la consola.
   *
   * Se distingue la credencial de todo lo demás a propósito: decirle «usuario o
   * contraseña incorrectos» a quien en realidad tiene el servicio caído lo manda
   * a probar contraseñas que no fallan. Y al revés, culpar al servicio de una
   * contraseña mal escrita deja a la persona esperando a que «se arregle solo».
   *
   * 🛑 Por eso NO basta con mirar el código HTTP. Medido contra clarisatest el
   * 16-sep-2026: un usuario que no existe devuelve **401**, pero un usuario real
   * con la contraseña equivocada devuelve **500** con
   * `{"response":{"name":"SERVER_NOT_FOUND","description":"There was an internal
   * server error: Invalid Credentials"}}`. El caso más común de todos llega,
   * pues, como error de servidor. El texto del cuerpo es lo único que los separa,
   * así que se lee. El 500 del back es un defecto suyo —debería ser 401— y está
   * reportado; mientras tanto, la pantalla no puede mentirle a quien la usa.
   */
  private static describe(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403 || LoginComponent.saysInvalidCredentials(error)) {
        return 'Username or password is incorrect. Check them and try again.';
      }

      if (error.status === 0) {
        return 'Could not reach the sign-in service. Check your connection (or the VPN) and try again.';
      }

      if (error.status >= 500) {
        return `The sign-in service answered ${error.status}. It is not you — try again in a moment.`;
      }

      return `The sign-in request failed (${error.status}). Try again, and tell the CLARISA team if it persists.`;
    }

    return 'Something went wrong while signing in. Try again.';
  }

  /**
   * Si el cuerpo del error dice «invalid credentials», venga donde venga. Se
   * recorre el objeto entero en vez de leer una ruta fija porque el back usa dos
   * formas distintas para el mismo caso (`message` en el 401, `response.description`
   * en el 500), y una ruta fija se rompe con la tercera.
   */
  private static saysInvalidCredentials(error: HttpErrorResponse): boolean {
    const body = error.error;

    if (!body) {
      return false;
    }

    const text = typeof body === 'string' ? body : JSON.stringify(body);
    return text.toLowerCase().includes('invalid credentials');
  }
}
