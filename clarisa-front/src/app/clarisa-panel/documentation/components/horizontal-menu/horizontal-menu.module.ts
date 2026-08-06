import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HorizontalMenuComponent } from './horizontal-menu.component';

/**
 * Wraps the public documentation navbar so it can be reused outside
 * `DocumentationModule` — the API Reference page needs it too, and importing
 * the whole documentation module just for the menu would pull in its tables,
 * jsPDF and jQuery dependencies (~1 MB) for nothing.
 */
@NgModule({
  declarations: [HorizontalMenuComponent],
  imports: [CommonModule, RouterModule],
  exports: [HorizontalMenuComponent],
})
export class DocumentationHorizontalMenuModule {}
