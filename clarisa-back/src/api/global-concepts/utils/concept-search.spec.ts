import {
  editDistance,
  matchConcept,
  queryWords,
  searchConcepts,
  SearchDoc,
  similarity,
} from './concept-search';

const doc = (
  id: number,
  label: string,
  definition = '',
  alts: string[] = [],
): SearchDoc => ({
  id,
  order: id,
  texts: [
    { field: 'preferred_label', text: label },
    ...alts.map((a) => ({ field: 'alternative_labels' as const, text: a })),
    { field: 'definition', text: definition },
  ],
});

describe('concept search', () => {
  describe('edit distance and similarity', () => {
    it('counts a swap of two neighbours as one edit', () => {
      expect(editDistance('ia', 'ai')).toBe(1);
      expect(editDistance('ere', 'here')).toBe(1);
      expect(editDistance('evaluation', 'evaluation')).toBe(0);
    });

    it('matches two-letter words only by swapping, never by replacing', () => {
      expect(similarity('ia', 'ai')).toBeGreaterThan(0);
      expect(similarity('ia', 'in')).toBe(0);
    });

    it('accepts a missing letter and a typo in a cut word', () => {
      expect(similarity('ola', 'hola')).toBeCloseTo(0.75);
      expect(similarity('evlau', 'evaluation')).toBeGreaterThan(0.7);
      expect(similarity('climate', 'outcome')).toBe(0);
    });
  });

  it('ignores accents and case in the query and in the text', () => {
    expect(queryWords('  Evaluación  RÁPIDA ')).toEqual([
      'evaluacion',
      'rapida',
    ]);
    const m = matchConcept(doc(1, 'Evaluación'), queryWords('evaluacion'));
    expect(m?.tier).toBe('exact');
  });

  it('tier 1: the words together and in order, the last one may be cut', () => {
    const m = matchConcept(
      doc(1, 'Impact assessment', 'An impact assessment measures change.'),
      queryWords('impact assess'),
    );
    expect(m?.tier).toBe('exact');
    expect(m?.highlights).toEqual([
      { field: 'preferred_label', ranges: [[0, 17]] },
      { field: 'definition', ranges: [[3, 20]] },
    ]);
  });

  it('tier 2: every word somewhere, in any order, each one highlighted', () => {
    const text = 'Hello AI, I am a good person here.';
    const m = matchConcept(doc(1, 'Greeting', text), queryWords('here ai'));
    expect(m?.tier).toBe('words');
    const ranges = m?.highlights[0].ranges ?? [];
    expect(ranges.map(([a, b]) => text.slice(a, b))).toEqual(['AI', 'here']);
  });

  it('tier 3: close words by similarity ("ere ia" finds "here" and "AI")', () => {
    const text = 'Hello AI, I am a good person here.';
    const m = matchConcept(doc(1, 'Greeting', text), queryWords('ere ia'));
    expect(m?.tier).toBe('similar');
    expect(m?.score).toBeGreaterThanOrEqual(0.7);
    expect(
      (m?.highlights[0].ranges ?? []).map(([a, b]) => text.slice(a, b)),
    ).toEqual(['AI', 'here']);
  });

  it('keeps offsets on the original text when it has accents', () => {
    const text = 'Una evaluación rápida';
    const m = matchConcept(doc(1, 'X', text), queryWords('rapida'));
    const [a, b] = m?.highlights[0].ranges[0] ?? [0, 0];
    expect(text.slice(a, b)).toBe('rápida');
  });

  it('does not match a word hidden inside another ("ia" in "social")', () => {
    expect(matchConcept(doc(1, 'Social science'), queryWords('ia'))).toBeNull();
  });

  it('returns nothing when a word is too far away', () => {
    expect(matchConcept(doc(1, 'Outcome'), queryWords('climate'))).toBeNull();
    expect(searchConcepts([doc(1, 'Outcome')], '   ')).toEqual([]);
  });

  it('ranks: exact before words before similar; the acronym label first', () => {
    const docs = [
      doc(1, 'Activity', 'Work that uses ia methods'),
      doc(2, 'Impact assessment', 'Assessment of long-term effects', ['IA']),
      doc(3, 'Adoption', 'Hello ai'),
    ];
    expect(searchConcepts(docs, 'IA').map((h) => h.id)).toEqual([2, 1, 3]);
    expect(searchConcepts(docs, 'IA')[2].match.tier).toBe('similar');
  });

  it('ranks a label hit above a definition hit of the same tier', () => {
    const docs = [
      doc(1, 'Monitoring', 'Tracks the evaluation plan'),
      doc(2, 'Evaluation', 'Systematic assessment'),
    ];
    expect(searchConcepts(docs, 'evalu').map((h) => h.id)).toEqual([2, 1]);
  });

  it('caps a pasted paragraph at 8 words', () => {
    expect(
      queryWords('one two three four five six seven eight nine ten'),
    ).toHaveLength(8);
  });

  describe('review findings (2026-09-28)', () => {
    const full = (
      id: number,
      label: string,
      short = '',
      definition = '',
      hidden: string[] = [],
    ): SearchDoc => ({
      id,
      order: id,
      texts: [
        { field: 'term_id', text: String(2400 + id) },
        { field: 'preferred_label', text: label },
        ...hidden.map((h) => ({ field: 'hidden_labels' as const, text: h })),
        { field: 'short_definition', text: short },
        { field: 'definition', text: definition },
      ],
    });

    it('keeps the result while the last word is still being typed ("impact a")', () => {
      expect(
        searchConcepts([full(3, 'Impact assessment')], 'impact a').map(
          (h) => h.id,
        ),
      ).toEqual([3]);
    });

    it('finds a concept by its TERM ID and by its short definition', () => {
      expect(
        searchConcepts(
          [full(3, 'Impact assessment'), full(4, 'Outcome')],
          '2404',
        ).map((h) => h.id),
      ).toEqual([4]);
      expect(
        searchConcepts(
          [full(4, 'Outcome', 'A change in behaviour')],
          'behaviour',
        ).map((h) => h.id),
      ).toEqual([4]);
    });

    it('does not match a lone two-letter word by prefix ("an" is not "and")', () => {
      expect(
        searchConcepts([full(1, 'Activity', '', 'Work and resources')], 'an'),
      ).toEqual([]);
    });

    it('treats a decomposed accent (NFD) as part of the word', () => {
      const nfd = 'Evaluacio\u0301n';
      const m = matchConcept(full(1, nfd), queryWords('evaluacion'));
      expect(m?.tier).toBe('exact');
      expect(m?.highlights[0].ranges).toEqual([[0, nfd.length]]);
    });

    it('matches hidden labels without showing them', () => {
      const m = matchConcept(
        full(1, 'Evaluation', '', '', ['evalution']),
        queryWords('evalution'),
      );
      expect(m?.tier).toBe('exact');
      expect(m?.highlights).toEqual([]);
    });

    it('ignores lone letters in the middle of a long query', () => {
      expect(queryWords('a b c impact')).toEqual(['impact']);
      expect(
        searchConcepts(
          [full(3, 'Impact assessment')],
          'a b c d e f g h impact',
        ).map((h) => h.id),
      ).toEqual([3]);
    });
  });
});
