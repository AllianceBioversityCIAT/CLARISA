import { AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';

/**
 * «Discard what you wrote?»: the inline question a dialog shows, above its
 * buttons, when it is closed with typed content. It exists only while it is
 * shown: it puts the keyboard on «Keep editing» and gives it back to what had
 * it before.
 */
@Component({
  selector: 'app-cl-discard-bar',
  templateUrl: './discard-bar.component.html',
  styleUrls: ['./discard-bar.component.scss']
})
export class DiscardBarComponent implements OnInit, AfterViewInit {
  @Output() keep = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @ViewChild('keepButton', { static: true }) private keepButton?: ElementRef<HTMLButtonElement>;

  private before: HTMLElement | null = null;

  ngOnInit(): void {
    this.before = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
  }

  ngAfterViewInit(): void {
    this.keepButton?.nativeElement.focus();
  }

  keepEditing(): void {
    // The bar is about to disappear with the focus on it: hand the keyboard back first.
    if (this.before && this.before !== document.body && document.contains(this.before)) this.before.focus();
    this.keep.emit();
  }
}
