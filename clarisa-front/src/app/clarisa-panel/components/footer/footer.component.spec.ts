import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [FooterComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('showIfRouteIsInList', () => {
    it('should return true and set isFloating for a floating route', () => {
      jest.spyOn(router, 'url', 'get').mockReturnValue('/result/result-detail/123');
      const result = component.showIfRouteIsInList();
      expect(result).toBe(true);
      expect(component.isFloating).toBe(true);
    });

    it('should return true and set isFloatingFix for a floatingFix route', () => {
      jest.spyOn(router, 'url', 'get').mockReturnValue('/login');
      const result = component.showIfRouteIsInList();
      expect(result).toBe(true);
      expect(component.isFloatingFix).toBe(true);
    });

    it('should return true without floating for a non-floating route', () => {
      jest.spyOn(router, 'url', 'get').mockReturnValue('/result/results-outlet/results-list');
      const result = component.showIfRouteIsInList();
      expect(result).toBe(true);
      expect(component.isFloating).toBeFalsy();
    });

    it('should return false when route is not in list', () => {
      jest.spyOn(router, 'url', 'get').mockReturnValue('/unknown/route');
      const result = component.showIfRouteIsInList();
      expect(result).toBe(false);
      expect(component.isFloating).toBe(false);
    });
  });

  describe('onMouseEnter / onMouseLeave', () => {
    it('should set isHover to true on mouse enter', () => {
      component.onMouseEnter();
      expect(component.isHover).toBe(true);
    });

    it('should set isHover to false on mouse leave', () => {
      component.isHover = true;
      component.onMouseLeave();
      expect(component.isHover).toBe(false);
    });
  });
});
