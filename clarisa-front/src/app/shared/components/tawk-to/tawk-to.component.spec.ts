import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { TawkToComponent } from './tawk-to.component';

describe('TawkToComponent', () => {
  let component: TawkToComponent;
  let fixture: ComponentFixture<TawkToComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TawkToComponent],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(TawkToComponent, {
        set: { template: '<div class="Tawk_API_container"></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TawkToComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getUserInfo', () => {
    afterEach(() => localStorage.clear());

    it('should return parsed user from localStorage', () => {
      const user = { email: 'test@test.com', name: 'Test' };
      localStorage.setItem('user', JSON.stringify(user));
      expect(component.getUserInfo).toEqual(user);
    });

    it('should return null when no user in localStorage', () => {
      localStorage.removeItem('user');
      expect(component.getUserInfo).toBeNull();
    });
  });

  describe('openChat', () => {
    it('should call Tawk_API.maximize when available', () => {
      const maximizeMock = jest.fn();
      (window as any)['Tawk_API'] = { maximize: maximizeMock };

      component.openChat();

      expect(maximizeMock).toHaveBeenCalled();
      delete (window as any)['Tawk_API'];
    });

    it('should not throw when Tawk_API is not available', () => {
      delete (window as any)['Tawk_API'];
      expect(() => component.openChat()).not.toThrow();
    });

    it('should not throw when Tawk_API exists but has no maximize', () => {
      (window as any)['Tawk_API'] = {};
      expect(() => component.openChat()).not.toThrow();
      delete (window as any)['Tawk_API'];
    });
  });
});
