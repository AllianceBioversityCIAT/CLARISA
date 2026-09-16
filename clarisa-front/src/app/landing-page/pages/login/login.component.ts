import { Component, OnDestroy, OnInit } from '@angular/core';
import { Validators, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
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
  }

  ngOnDestroy(): void {
    clearInterval(this.rotator);
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
      error: () => {
        // El formulario vuelve de inmediato: nadie debería esperar para
        // enterarse de que se equivocó de contraseña.
        this.signingIn = false;
        this.menssageValidate = 'Username or password is incorrect please validate it';
      }
    });
  }
}
