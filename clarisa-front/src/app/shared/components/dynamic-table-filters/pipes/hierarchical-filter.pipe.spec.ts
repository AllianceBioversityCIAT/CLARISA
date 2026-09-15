import { HierarchicalFilterPipe } from './hierarchical-filter.pipe';
import { EntitiesTableInterface } from '../interfaces/entities-table.interface';

describe('HierarchicalFilterPipe', () => {
  let pipe: HierarchicalFilterPipe;

  const mockList: EntitiesTableInterface[] = [
    {
      id: 1,
      name: 'Alliance of Bioversity International',
      smo_code: 'ABC',
      level: 1,
      portfolio_id: 10,
      portfolio: 'Research',
      cgiar_entity_type: { code: 1, name: 'Center' },
      acronym: 'ABI',
      children: [],
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
      acronym: 'WF',
      children: [],
      full_text: '',
    },
  ];

  beforeEach(() => {
    pipe = new HierarchicalFilterPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty array when list is empty', () => {
    const result = pipe.transform([], '', null, null);
    expect(result).toEqual([]);
  });

  it('should return all items when no filters are applied', () => {
    const result = pipe.transform(mockList, '', null, null);
    expect(result.length).toBe(3);
  });

  describe('searchText filter', () => {
    it('should filter by name text', () => {
      const result = pipe.transform(mockList, 'Potato', null, null);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('International Potato Center');
    });

    it('should filter by acronym text', () => {
      const result = pipe.transform(mockList, 'ABI', null, null);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });

    it('should filter by smo_code text', () => {
      const result = pipe.transform(mockList, 'WF', null, null);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(3);
    });

    it('should be case-insensitive', () => {
      const result = pipe.transform(mockList, 'potato', null, null);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('International Potato Center');
    });
  });

  describe('selectedPortfolio filter', () => {
    it('should filter by portfolio_id', () => {
      const result = pipe.transform(mockList, '', 10, null);
      expect(result.length).toBe(2);
      expect(result.every((item) => item.portfolio_id === 10)).toBe(true);
    });

    it('should return empty when no items match portfolio', () => {
      const result = pipe.transform(mockList, '', 999, null);
      expect(result.length).toBe(0);
    });
  });

  describe('selectedEntityType filter', () => {
    it('should filter by entity type code', () => {
      const result = pipe.transform(mockList, '', null, 2);
      expect(result.length).toBe(1);
      expect(result[0].cgiar_entity_type.code).toBe(2);
    });

    it('should return empty when no items match entity type', () => {
      const result = pipe.transform(mockList, '', null, 999);
      expect(result.length).toBe(0);
    });
  });

  describe('combined filters', () => {
    it('should apply searchText and selectedPortfolio together', () => {
      const result = pipe.transform(mockList, 'WorldFish', 10, null);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(3);
    });

    it('should apply all three filters together', () => {
      const result = pipe.transform(mockList, 'WorldFish', 10, 1);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(3);
    });

    it('should return empty when combined filters exclude all items', () => {
      const result = pipe.transform(mockList, 'Potato', 10, null);
      expect(result.length).toBe(0);
    });
  });

  describe('textMatch', () => {
    it('should return false when searchText is empty', () => {
      expect(pipe.textMatch('', 'some text')).toBe(false);
    });

    it('should return true when text contains searchText', () => {
      expect(pipe.textMatch('hello', 'say hello world')).toBe(true);
    });

    it('should return false when text does not contain searchText', () => {
      expect(pipe.textMatch('xyz', 'say hello world')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(pipe.textMatch('HELLO', 'say hello world')).toBe(true);
      expect(pipe.textMatch('hello', 'say HELLO world')).toBe(true);
    });
  });
});
