import { Component, Inject, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../../../environments/environment';
@Component({
  selector: 'app-tawk-to',
  templateUrl: './tawk-to.component.html',
  styleUrls: ['./tawk-to.component.scss']
})
export class TawkToComponent implements OnInit {
  @Input() id: string;
  script = this._renderer.createElement('script');
  isVisibleTawk = true;
  currentUser: any;
  config = environment;
  constructor(private _renderer: Renderer2, @Inject(DOCUMENT) private _document) {
    
  }
  ngOnInit() {
    setTimeout(() => {
      this.initializeTawkIo();
    }, 500);
  }
  initializeTawkIo(){
    // console.log("initializeTawkIo")
      // console.log("Tawk_API")
      this.script.text = `
      var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
      (()=>{
      var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
      s1.async=true;
      s1.src = 'https://embed.tawk.to/${this.config.tawkToId}';
      s1.charset='UTF-8';
      s1.setAttribute('crossorigin','*');
      s0.parentNode.insertBefore(s1,s0);
      })();
      `;
      this._renderer.appendChild(document.querySelector('.Tawk_API_container'), this.script);
  }
  get getUserInfo():{email,name}{
    return JSON.parse(localStorage.getItem('user'));
  }
  openChat() {
    if (window['Tawk_API']?.hasOwnProperty('maximize')) {
      window['Tawk_API'].maximize();
    }
  }
}