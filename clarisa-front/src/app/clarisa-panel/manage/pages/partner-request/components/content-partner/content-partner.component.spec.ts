import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ContentPartnerComponent } from './content-partner.component';

describe('ContentPartnerComponent', () => {
  let component: ContentPartnerComponent;
  let fixture: ComponentFixture<ContentPartnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [ContentPartnerComponent],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ContentPartnerComponent, {
        set: { template: '<div></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ContentPartnerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
