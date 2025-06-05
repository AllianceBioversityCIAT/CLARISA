import { Component } from '@angular/core';
import { TrackingToolsService } from './shared/services/tracking-tools.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(public trackingToolsService: TrackingToolsService) {}
}
