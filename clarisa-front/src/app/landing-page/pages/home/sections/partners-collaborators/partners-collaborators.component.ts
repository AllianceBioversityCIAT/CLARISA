import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-partners-collaborators',
  templateUrl: './partners-collaborators.component.html',
  styleUrls: ['./partners-collaborators.component.scss']
})
export class PartnersCollaboratorsComponent implements OnInit {
  slides: any[] = new Array(3).fill({id: -1, src: '', title: '', subtitle: ''});

  constructor() { }

  ngOnInit(): void {
    this.slides[0] = {
      src: './assets/img/angular.jpg',
    };
    this.slides[1] = {
      src: './assets/img/react.jpg',
    }
    this.slides[2] = {
      src: './assets/img/vue.jpg',
    }
  }

  onItemChange($event: any): void {
    console.log('Carousel onItemChange', $event);
  }

}
