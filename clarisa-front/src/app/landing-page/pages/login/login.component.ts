import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Validators, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/shared/services/auth.service';
import { UserAuth } from '../../../shared/interfaces/user-auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  /**
   * Si la contraseña se ve o no. Empieza oculta: mostrarla es una decisión de
   * quien escribe, no el estado por defecto — puede haber alguien mirando.
   */
  showPassword = false;

  /**
   * En qué punto va la entrada.
   *
   *   idle     · el formulario, sin nada encima
   *   loading  · el bucle con viento y «Loading CLARISA», MIENTRAS el API responde
   *   leaving  · el API ya contestó: el zoom entra en una letra y funde a negro
   *
   * 🛑 `loading` dura lo que tarde la petición, ni un milisegundo más. La
   * animación no se espera a sí misma: si el API contesta en 300 ms, se ven
   * 300 ms. Lo único que se reserva tiempo es `leaving`, y porque ahí ya no se
   * está esperando a nadie — es el cierre.
   */
  phase: 'idle' | 'loading' | 'leaving' = 'idle';

  @ViewChild('zoom') zoom?: ElementRef<HTMLVideoElement>;

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
  }

  onSubmit() {
    if (this.loginForm.invalid || this.phase !== 'idle') {
      return;
    }

    const authData: UserAuth = { ...this.loginForm.value };

    // La pantalla entra ANTES de la petición, no después: es lo que hace que el
    // tiempo de espera sea el de la animación y no uno añadido encima.
    this.phase = 'loading';
    this.menssageValidate = '';

    this.authService.userAuth(authData).subscribe({
      next: resp => {
        const { access_token, user } = resp;
        this.authService.localStorageToken = access_token;
        this.authService.localStorageUser = user;
        this.successLogin = true;
        this.leave();
      },
      error: () => {
        // Un error devuelve el formulario de inmediato: nadie espera una
        // animación para enterarse de que se equivocó de contraseña.
        this.phase = 'idle';
        this.menssageValidate = 'Username or password is incorrect please validate it';
      }
    });
  }

  /**
   * El cierre: el zoom entra en una letra, la pantalla se va a negro y de ahí
   * arranca el panel. La navegación ocurre CON la pantalla ya negra, así que el
   * cambio de vista no se ve.
   */
  private leave(): void {
    this.phase = 'leaving';

    const video = this.zoom?.nativeElement;
    if (video) {
      video.currentTime = 0;
      void video.play();
    }

    setTimeout(() => this.router.navigate(['/clarisa-panel/manage/partner-request']), 2600);
  }
}
