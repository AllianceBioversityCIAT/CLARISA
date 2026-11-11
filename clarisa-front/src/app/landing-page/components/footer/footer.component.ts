import { Component } from '@angular/core';
import { MELIAF_TAXONOMY_HIDDEN } from '../../../shared/feature-flags/meliaf-taxonomy';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {
  quickLinks = [
    {
      name: 'Dashboard',
      link: '/landing-page/dashboards',
    },
    {
      name: 'Services',
      link: '/landing-page/api-services',
    },
    {
      name: 'Help',
      link: '/landing-page/faq',
    },
    {
      name: 'Glossary',
      link: '/landing-page/glossary',
    },
    // Hidden while MELIAF_TAXONOMY_HIDDEN is on.
    ...(MELIAF_TAXONOMY_HIDDEN
      ? []
      : [
          {
            name: 'MELIAF taxonomy',
            link: '/landing-page/concepts',
          },
        ]),
  ];
}
