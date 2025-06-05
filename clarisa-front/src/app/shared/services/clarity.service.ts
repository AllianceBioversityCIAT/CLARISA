import { Injectable } from '@angular/core';
import clarity from '@microsoft/clarity';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClarityService {

  private readonly CLARITY_PROJECT_ID = environment.clarityProjectId;
  private initialized = false;

  public init(): void {
    if (this.initialized) return;

    try {
      this.initClarity();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Clarity:', error);
    }
  }

  private initClarity(): void {
    try {
      clarity.init(this.CLARITY_PROJECT_ID);
      clarity.consent(); // Enable cookie consent by default
    } catch (error) {
      console.error('Error initializing Clarity:', error);
      throw error;
    }
  }

  updateState(url: string) {
    try {
      clarity.setTag('page', url);
    } catch (error) {
      console.error('Error updating Clarity state:', error);
    }
  }

  public trackEvent(name: string, data?: Record<string, unknown>): void {
    try {
      clarity.event(name);
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          clarity.setTag(key, String(value));
        });
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }


}
