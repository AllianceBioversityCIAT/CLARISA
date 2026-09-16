import { Component, OnInit } from '@angular/core';
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
    const authData: UserAuth = { ...this.loginForm.value };

    this.authService.userAuth(authData).subscribe({
      next: resp => {
        this.menssageValidate = '';
        const { access_token, user } = resp;
        this.authService.localStorageToken = access_token;
        this.authService.localStorageUser = user;
        this.successLogin = true;

        setTimeout(() => {
          //change this route when the new component is ready
          this.router.navigate(['/clarisa-panel/manage/partner-request']);
        }, 1000);
      },
      error: err => {
        //show alert
        this.menssageValidate = 'Username or password is incorrect please validate it';
        setTimeout(() => {
          //change this route when the new component is ready
          this.displayConfirm = false;
        }, 1000);
      }
    });
  }
}
