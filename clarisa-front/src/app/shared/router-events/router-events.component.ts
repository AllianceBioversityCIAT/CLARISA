import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import {
  NavigationStart,
  Router,
  Event as NavigationEvent,
} from '@angular/router';
declare let gtag: (property: string, value: any, configs: any) => {};

@Component({
  selector: 'app-router-events',
  templateUrl: './router-events.component.html',
  styleUrls: ['./router-events.component.scss']
})
export class RouterEventsComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.startgoogleanalytics();
    this.listenRoute();
  }

  listenRoute(){
    this.router.events.subscribe((event: NavigationEvent) => {
      if (event instanceof NavigationStart) {
               
        try {          
          gtag('config', environment.googleAnalyticsId, {
            page_path: event.url,
          });
        } catch (error) {
          console.log(error);
        }
      }
    });
  }

  startgoogleanalytics(){
    try {
      var script = document.createElement('script');
      script.onload = () => {
        // console.log("Script loaded and ready");
      };
      script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.googleAnalyticsId}`;
      document.getElementsByTagName('head')[0].appendChild(script);
      var script2 = document.createElement('script');
      script2.type = 'text/javascript';
      script2.text = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${environment.googleAnalyticsId}');
      `;
      document.getElementsByTagName('head')[0].appendChild(script2);
    } catch (error) {
      console.log(error)
    }
  }

}
