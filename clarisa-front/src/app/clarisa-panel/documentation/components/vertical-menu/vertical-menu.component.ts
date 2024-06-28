import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import * as $ from 'jquery';
import { UrlParamsService } from 'src/app/clarisa-panel/services/url-params.service';

@Component({
  selector: 'app-vertical-menu',
  templateUrl: './vertical-menu.component.html',
  styleUrls: ['./vertical-menu.component.scss'],
})
export class VerticalMenuComponent {
  @Input() subCategories: any = [];
  @Input() urlParams: any;

  constructor(public router: Router, public _servicesUrl: UrlParamsService) {}

  ngOnChanges() {
    let isActive = this._servicesUrl.paramsUrl.nameEndpoint;
    let idUl = '#' + this._servicesUrl.paramsUrl.namesubcategory;
    $(function () {
      if (isActive != undefined) {
        $('.endpoints').removeClass('activeSubMenu');
        $('#' + isActive).addClass('activeSubMenu');
      }
      $('.slide').removeClass('is-expanded');
      $(idUl + 1)
        .addClass('is-expanded')
        .removeClass('hide');
    });
  }

  setUrl(serviceName: any, categoryName: any, subCategoryName?: any) {
    const mainUrl = `/clarisa-panel/documentation`;
    const serviceUrl = `${serviceName.name.split(' ').join('_')}`;
    const categoryUrl = `${categoryName.name.split(' ').join('_')}`;

    if (!subCategoryName) {
      return `${mainUrl}/${serviceUrl}/${categoryUrl}`;
    }

    const subCategoryUrl = `${subCategoryName.name.split(' ').join('_')}`;

    return `${mainUrl}/${serviceUrl}/${categoryUrl}/${subCategoryUrl}`;
  }

  clickMenu(idli: string) {
    const box = document.getElementById(`${idli}1`);

    if (box) {
      box.classList.toggle('is-expanded');
    }
  }
}
