import { Component } from '@angular/core';
import { AuthService } from '../../../../shared/services/auth.service';
@Component({
  selector: 'app-horizontal-menu',
  templateUrl: './horizontal-menu.component.html',
  styleUrls: ['./horizontal-menu.component.scss'],
})
export class HorizontalMenuComponent {
  constructor(private authService: AuthService) {}

  onLogOut() {
    this.authService.logout();
  }
}
