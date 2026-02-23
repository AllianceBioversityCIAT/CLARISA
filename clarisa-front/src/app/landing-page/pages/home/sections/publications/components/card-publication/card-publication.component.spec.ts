import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { CardPublicationComponent } from './card-publication.component';

describe('CardPublicationComponent', () => {
  let component: CardPublicationComponent;
  let fixture: ComponentFixture<CardPublicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CardPublicationComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CardPublicationComponent);
    component = fixture.componentInstance;
    component.metaDataCardpublications = { link: '', title: '', description: '' };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
