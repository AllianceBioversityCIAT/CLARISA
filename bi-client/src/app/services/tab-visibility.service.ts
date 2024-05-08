import { Injectable, EventEmitter } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TabVisibilityService {
  public tabVisibilityChanged: EventEmitter<boolean> =
    new EventEmitter<boolean>();
  private lastTabChangeTime: number | undefined;

  constructor() {
    this.initializeVisibilityChange();
  }

  private initializeVisibilityChange(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.lastTabChangeTime = Date.now();
      } else {
        const timeSinceLastChange = Date.now() - this.lastTabChangeTime!;
        this.tabVisibilityChanged.emit(timeSinceLastChange > 600000);
      }
    });
  }
}
