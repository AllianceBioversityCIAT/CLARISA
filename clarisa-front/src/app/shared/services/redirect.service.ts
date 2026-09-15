import { Injectable } from '@angular/core';
import { routedClarisaLegacy } from './routes-clarisa-legacy';

@Injectable({
  providedIn: 'root',
})
export class RedirectService {
  constructor() {}

  findRedirectTo(urlActive: any, origin: any) {
    let findUrl = '';
    let returnUrl = '';
    for (let i of routedClarisaLegacy) {
      findUrl = origin + '/' + i.routeLegacy;

      if (findUrl == urlActive) {
        returnUrl = origin + '/' + i.routeClarisa;
        break;
      }
    }

    return returnUrl;
  }
}
