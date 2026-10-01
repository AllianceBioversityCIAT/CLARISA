import { NgModule } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

import { GcInfoComponent } from './gc-info.component';

/**
 * The "(i)" of a form label, on its own so every admin screen of the panel
 * (Concepts, Users, Roles) draws the same one instead of a copy.
 */
@NgModule({
  declarations: [GcInfoComponent],
  imports: [TooltipModule],
  exports: [GcInfoComponent]
})
export class GcInfoModule {}
