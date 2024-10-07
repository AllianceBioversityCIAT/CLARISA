import { Component } from '@angular/core';

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
  ];
}
