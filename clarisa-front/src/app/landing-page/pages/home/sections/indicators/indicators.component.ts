import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-indicators',
  templateUrl: './indicators.component.html',
  styleUrls: ['./indicators.component.scss'],
})
export class IndicatorsComponent implements OnInit {
  cardIndicator = [
    {
      name: 'Melia Studies',
      icon: 'fa fa-book',
      numberIndicator: '372',
    },
    {
      name: 'Policies',
      icon: 'fa fa-address-book',
      numberIndicator: '501',
    },
    {
      name: 'Innovations',
      icon: 'fa fa-lightbulb-o',
      numberIndicator: '6108',
    },
    {
      name: 'Initiatives',
      icon: 'fa fa-globe ',
      numberIndicator: '32',
    },

    {
      name: 'Workpackages',
      icon: 'fa fa-newspaper-o',
      numberIndicator: '156',
    },
    {
      name: 'Institutions',
      icon: 'fa fa-university',
      numberIndicator: '7060',
    },
  ];
  constructor() {}

  ngOnInit(): void {}
}
