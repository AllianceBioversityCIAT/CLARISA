import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

jest.mock('primeng/table', () => ({
  Table: class {},
  TableModule: class {},
}));

import { DynamicTableFiltersComponent } from './dynamic-table-filters.component';

describe('DynamicTableFiltersComponent', () => {
  let component: DynamicTableFiltersComponent;
  let fixture: ComponentFixture<DynamicTableFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [DynamicTableFiltersComponent],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DynamicTableFiltersComponent, {
        set: { template: '<div></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DynamicTableFiltersComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
