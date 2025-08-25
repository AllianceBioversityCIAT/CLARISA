import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicTableFiltersComponent } from './dynamic-table-filters.component';

describe('DynamicTableFiltersComponent', () => {
  let component: DynamicTableFiltersComponent;
  let fixture: ComponentFixture<DynamicTableFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DynamicTableFiltersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicTableFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
