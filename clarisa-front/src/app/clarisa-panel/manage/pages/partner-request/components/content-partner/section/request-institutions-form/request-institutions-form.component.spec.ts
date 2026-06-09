import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';

import { RequestInstitutionsFormComponent } from './request-institutions-form.component';

describe('RequestInstitutionsFormComponent', () => {
  let component: RequestInstitutionsFormComponent;
  let fixture: ComponentFixture<RequestInstitutionsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ReactiveFormsModule],
      declarations: [RequestInstitutionsFormComponent],
      providers: [ConfirmationService, MessageService],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(RequestInstitutionsFormComponent, {
        set: { template: '<div></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(RequestInstitutionsFormComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
