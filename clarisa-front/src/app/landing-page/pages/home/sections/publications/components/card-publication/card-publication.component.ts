import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card-publication',
  templateUrl: './card-publication.component.html',
  styleUrls: ['./card-publication.component.scss'],
})
export class CardPublicationComponent {
  @Input() metaDataCardpublications: any;
}
