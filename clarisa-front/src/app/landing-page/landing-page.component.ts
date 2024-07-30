import { Component } from '@angular/core';
import { AuthService } from '../shared/services/auth.service';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss'],
})
export class LandingPageComponent {
  changesStyles: any = document.querySelector('#style-css');
  changesBoostrap: any = document.querySelector('#boostrap');
  changesFont: any = document.querySelector('#font');
  changesFontIcon: any = document.querySelector('#font-icon');
  changesAditional: any = document.querySelector('#aditional');
  changesAditionalTwo: any = document.querySelector('#aditionalTwo');
  changesAditionalThree: any = document.querySelector('#aditional-three');
  changesAditinalFour: any = document.querySelector('#aditional-four');
  url = `./assets/css/style-landing.css`;
  urlBoostrap = `./assets/bootstrap/css/bootstrap.min.css`;
  urlFont = `./assets/font-awesome/css/font-awesome.min.css`;
  urlFontIcon = `./assets/linear-icons/css/icon-font.min.css`;
  urlAditional = `./assets/owl-carousel/css/owl.carousel.css`;
  urlAditionalTwo = `./assets/owl-carousel/css/owl.theme.css`;
  urlAditionalThree = `./assets/css/ionicons.min.css`;
  urlAditinalFour = `./assets/css/magnific-popup.css`;
  loadingStyles = true;
  title = 'clarisa-front';
  urls: any;

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    this.authService.inLogin = false;
    this.changesStyles.setAttribute('href', this.url);
    this.changesBoostrap.setAttribute('href', this.urlBoostrap);
    this.changesFont.setAttribute('href', this.urlFont);
    this.changesFontIcon.setAttribute('href', this.urlFontIcon);
    this.changesAditional.setAttribute('href', this.urlAditional);
    this.changesAditionalTwo.setAttribute('href', this.urlAditionalTwo);
    this.changesAditionalThree.setAttribute('href', this.urlAditionalThree);
    this.changesAditinalFour.setAttribute('href', this.urlAditinalFour);

    setTimeout(() => {
      this.loadingStyles = false;
    }, 100);
  }
}
