import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-clarisa-panel',
  templateUrl: './clarisa-panel.component.html',
  styleUrls: ['./clarisa-panel.component.scss'],
})
export class ClarisaPanelComponent implements OnInit {
  changesStyles: any = document.querySelector('#style-css');
  changesBoostrap: any = document.querySelector('#boostrap');
  changesFont: any = document.querySelector('#font');
  changesFontIcon: any = document.querySelector('#font-icon');
  changesAditional: any = document.querySelector('#aditional');
  changesAditionalTwo: any = document.querySelector('#aditionalTwo');
  changesAditionalThree: any = document.querySelector('#aditional-three');
  url = `./assets/css/style.css`;
  urlBoostrap = `./assets/plugins/bootstrap/css/bootstrap.min.css`;
  urlFont = `./assets/css/icons.css`;
  urlFontIcon = `./assets/colors/color1.css`;
  urlAditional = `./assets/css/dark-style.css`;
  urlAditionalTwo = `./assets/css/transparent-style.css`;
  urlAditionalThree = `./assets/css/skin-modes.css`;
  estado = true;

  ngOnInit(): void {
    this.changesStyles.setAttribute('href', this.url);
    this.changesBoostrap.setAttribute('href', this.urlBoostrap);
    this.changesFont.setAttribute('href', this.urlFont);
    this.changesFontIcon.setAttribute('href', this.urlFontIcon);
    this.changesAditional.setAttribute('href', this.urlAditional);
    this.changesAditionalTwo.setAttribute('href', this.urlAditionalTwo);
    this.changesAditionalThree.setAttribute('href', this.urlAditionalThree);
    setTimeout(() => {
      this.estado = false;
    }, 1000);
  }
}
