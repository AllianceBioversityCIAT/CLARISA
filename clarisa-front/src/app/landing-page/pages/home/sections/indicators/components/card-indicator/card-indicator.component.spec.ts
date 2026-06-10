import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { CardIndicatorComponent } from './card-indicator.component';

describe('CardIndicatorComponent', () => {
  let component: CardIndicatorComponent;
  let fixture: ComponentFixture<CardIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CardIndicatorComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CardIndicatorComponent);
    component = fixture.componentInstance;
    component.metaDataCard = { icon: '', title: '', value: '' };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
