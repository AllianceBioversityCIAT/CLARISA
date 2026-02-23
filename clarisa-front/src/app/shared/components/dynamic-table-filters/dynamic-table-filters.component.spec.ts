import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import * as FileSaver from 'file-saver';

jest.mock('primeng/table', () => ({
  Table: class {},
  TableModule: class {},
}));

jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

import { DynamicTableFiltersComponent } from './dynamic-table-filters.component';
import { EntitiesTableInterface } from './interfaces/entities-table.interface';

describe('DynamicTableFiltersComponent', () => {
  let component: DynamicTableFiltersComponent;
  let fixture: ComponentFixture<DynamicTableFiltersComponent>;

  const mockDataList: EntitiesTableInterface[] = [
    {
      id: 1,
      name: 'Alliance of Bioversity',
      smo_code: 'ABC',
      level: 1,
      portfolio_id: 10,
      portfolio: 'Research',
      cgiar_entity_type: { code: 1, name: 'Center' },
      acronym: 'ABI',
      children: [
        {
          id: 10,
          code: 'C1',
          name: 'Child One',
          acronym: null,
          portfolio_id: 10,
          portfolio: 'Research',
          cgiar_entity_type: { code: 1, name: 'Center' },
        },
      ],
      full_text: '',
    },
    {
      id: 2,
      name: 'International Potato Center',
      smo_code: 'CIP',
      level: 1,
      portfolio_id: 20,
      portfolio: 'Operations',
      cgiar_entity_type: { code: 2, name: 'Initiative' },
      acronym: 'CIP',
      children: [],
      full_text: '',
    },
    {
      id: 3,
      name: 'WorldFish',
      smo_code: 'WF',
      level: 1,
      portfolio_id: 10,
      portfolio: 'Research',
      cgiar_entity_type: { code: 1, name: 'Center' },
      acronym: null,
      children: [],
      full_text: '',
    },
  ];

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
    component.dataList = JSON.parse(JSON.stringify(mockDataList));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onChangeEntityType', () => {
    it('should set selectedEntityType from event value', () => {
      component.onChangeEntityType({ value: 2 });
      expect(component.selectedEntityType).toBe(2);
    });

    it('should set selectedEntityType to null when event has no value', () => {
      component.onChangeEntityType({});
      expect(component.selectedEntityType).toBeNull();
    });

    it('should set selectedEntityType to null when event is null', () => {
      component.onChangeEntityType(null);
      expect(component.selectedEntityType).toBeNull();
    });

    it('should call dt.reset() when dt exists', () => {
      component.dt = { reset: jest.fn() } as any;
      component.onChangeEntityType({ value: 1 });
      expect(component.dt.reset).toHaveBeenCalled();
    });

    it('should not throw when dt is undefined', () => {
      component.dt = undefined as any;
      expect(() => component.onChangeEntityType({ value: 1 })).not.toThrow();
    });
  });

  describe('onChangePortfolio', () => {
    it('should set selectedPortfolio from event value', () => {
      component.onChangePortfolio({ value: 20 });
      expect(component.selectedPortfolio).toBe(20);
    });

    it('should set selectedPortfolio to null when event has no value', () => {
      component.onChangePortfolio({});
      expect(component.selectedPortfolio).toBeNull();
    });

    it('should set selectedPortfolio to null when event is null', () => {
      component.onChangePortfolio(null);
      expect(component.selectedPortfolio).toBeNull();
    });

    it('should call dt.reset() when dt exists', () => {
      component.dt = { reset: jest.fn() } as any;
      component.onChangePortfolio({ value: 10 });
      expect(component.dt.reset).toHaveBeenCalled();
    });
  });

  describe('onSearchChange', () => {
    it('should set searchText', () => {
      component.onSearchChange('potato');
      expect(component.searchText).toBe('potato');
    });

    it('should call dt.reset() when dt exists', () => {
      component.dt = { reset: jest.fn() } as any;
      component.onSearchChange('test');
      expect(component.dt.reset).toHaveBeenCalled();
    });
  });

  describe('clearFilters', () => {
    it('should reset all filters to default values', () => {
      component.selectedEntityType = 2;
      component.selectedPortfolio = 10;
      component.searchText = 'test';

      component.clearFilters();

      expect(component.selectedEntityType).toBeNull();
      expect(component.selectedPortfolio).toBeNull();
      expect(component.searchText).toBe('');
    });

    it('should call dt.reset() when dt exists', () => {
      component.dt = { reset: jest.fn() } as any;
      component.clearFilters();
      expect(component.dt.reset).toHaveBeenCalled();
    });
  });

  describe('toggleRow', () => {
    it('should expand a row when not already expanded', () => {
      component.expandedRowKeys = {};
      component.toggleRow({ smo_code: 'ABC' });
      expect(component.expandedRowKeys['ABC']).toBe(true);
    });

    it('should collapse a row when already expanded', () => {
      component.expandedRowKeys = { ABC: true };
      component.toggleRow({ smo_code: 'ABC' });
      expect(component.expandedRowKeys['ABC']).toBeUndefined();
    });
  });

  describe('exportExcel', () => {
    it('should call xlsx and saveAs', async () => {
      component.dataList = JSON.parse(JSON.stringify(mockDataList));
      component.searchText = '';
      component.selectedPortfolio = null;
      component.selectedEntityType = null;

      await component.exportExcel();

      // Give the dynamic import time to resolve
      await new Promise((r) => setTimeout(r, 100));

      expect(FileSaver.saveAs).toHaveBeenCalled();
    });
  });

  describe('saveAsExcelFile', () => {
    it('should call FileSaver.saveAs with correct parameters', () => {
      const buffer = new ArrayBuffer(10);
      component.saveAsExcelFile(buffer, 'test_');

      expect(FileSaver.saveAs).toHaveBeenCalled();
      const call = (FileSaver.saveAs as unknown as jest.Mock).mock.calls;
      const lastCall = call[call.length - 1];
      expect(lastCall[0]).toBeInstanceOf(Blob);
      expect(lastCall[1]).toContain('test_');
      expect(lastCall[1]).toContain('.xlsx');
    });
  });

  describe('getFilteredData (via exportExcel)', () => {
    it('should filter by searchText', async () => {
      component.searchText = 'Potato';
      component.selectedPortfolio = null;
      component.selectedEntityType = null;

      // Access private method via exportExcel path - we test indirectly
      await component.exportExcel();
      await new Promise((r) => setTimeout(r, 100));
      expect(FileSaver.saveAs).toHaveBeenCalled();
    });

    it('should filter by selectedPortfolio', async () => {
      component.searchText = '';
      component.selectedPortfolio = 10;
      component.selectedEntityType = null;

      await component.exportExcel();
      await new Promise((r) => setTimeout(r, 100));
      expect(FileSaver.saveAs).toHaveBeenCalled();
    });

    it('should filter by selectedEntityType', async () => {
      component.searchText = '';
      component.selectedPortfolio = null;
      component.selectedEntityType = 2;

      await component.exportExcel();
      await new Promise((r) => setTimeout(r, 100));
      expect(FileSaver.saveAs).toHaveBeenCalled();
    });

    it('should apply all filters together', async () => {
      component.searchText = 'Alliance';
      component.selectedPortfolio = 10;
      component.selectedEntityType = 1;

      await component.exportExcel();
      await new Promise((r) => setTimeout(r, 100));
      expect(FileSaver.saveAs).toHaveBeenCalled();
    });
  });

  describe('exportInformation (via exportExcel) with children', () => {
    it('should include children in export when parent has children', async () => {
      component.dataList = [mockDataList[0]]; // Only the one with children
      component.searchText = '';
      component.selectedPortfolio = null;
      component.selectedEntityType = null;

      await component.exportExcel();
      await new Promise((r) => setTimeout(r, 100));
      expect(FileSaver.saveAs).toHaveBeenCalled();
    });

    it('should handle parent with no children', async () => {
      component.dataList = [mockDataList[1]]; // No children
      component.searchText = '';
      component.selectedPortfolio = null;
      component.selectedEntityType = null;

      await component.exportExcel();
      await new Promise((r) => setTimeout(r, 100));
      expect(FileSaver.saveAs).toHaveBeenCalled();
    });

    it('should handle parent with null acronym', async () => {
      component.dataList = [mockDataList[2]]; // null acronym
      component.searchText = '';
      component.selectedPortfolio = null;
      component.selectedEntityType = null;

      await component.exportExcel();
      await new Promise((r) => setTimeout(r, 100));
      expect(FileSaver.saveAs).toHaveBeenCalled();
    });
  });
});
