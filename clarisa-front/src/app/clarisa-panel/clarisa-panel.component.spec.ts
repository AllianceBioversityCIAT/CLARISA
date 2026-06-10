import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ClarisaPanelComponent } from './clarisa-panel.component';

describe('ClarisaPanelComponent', () => {
  let component: ClarisaPanelComponent;
  let fixture: ComponentFixture<ClarisaPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ClarisaPanelComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ClarisaPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
