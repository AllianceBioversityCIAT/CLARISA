import { PublicConcept } from '../../../shared/services/global-concepts/global-concepts-api.service';
import { excerpt, highlightPieces, resultView } from './search-highlight';

describe('search highlight', () => {
  it('splits a text by the ranges, marking only them', () => {
    expect(
      highlightPieces('Hello AI, here', [
        [6, 8],
        [10, 14]
      ])
    ).toEqual([
      { text: 'Hello ', hit: false },
      { text: 'AI', hit: true },
      { text: ', ', hit: false },
      { text: 'here', hit: true }
    ]);
  });

  it('survives odd ranges: out of bounds, empty, overlapping, unsorted', () => {
    expect(
      highlightPieces('abcdef', [
        [4, 99],
        [-3, 1],
        [2, 2],
        [0, 2]
      ])
    ).toEqual([
      { text: 'ab', hit: true },
      { text: 'cd', hit: false },
      { text: 'ef', hit: true }
    ]);
    expect(highlightPieces('', [[0, 3]])).toEqual([]);
    expect(highlightPieces('plain', null)).toEqual([{ text: 'plain', hit: false }]);
  });

  it('cuts a long definition so a late mark stays on screen', () => {
    const text = 'word '.repeat(60) + 'target end';
    const at = text.indexOf('target');
    const cut = excerpt(text, [[at, at + 6]]);
    expect(cut.text.startsWith('…')).toBe(true);
    const [a, b] = cut.ranges[0];
    expect(cut.text.slice(a, b)).toBe('target');
    expect(excerpt('short target', [[6, 12]]).text).toBe('short target');
  });

  const concept = {
    term_id: 1,
    preferred_label: 'Impact assessment',
    short_definition: 'Short.',
    definition: 'Assessment of long-term effects.',
    alternative_labels: []
  } as unknown as PublicConcept;

  it('shows the short definition without a definition match, the full one with it', () => {
    expect(resultView(concept, null).summary).toEqual([{ text: 'Short.', hit: false }]);
    const view = resultView(concept, {
      tier: 'words',
      score: 1,
      highlights: [
        {
          field: 'definition',
          ranges: [
            [14, 18],
            [24, 31]
          ]
        }
      ]
    });
    expect(view.summary.filter(p => p.hit).map(p => p.text)).toEqual(['long', 'effects']);
  });

  it('lists the alternative label that matched and flags a similar-spelling hit', () => {
    const view = resultView(concept, {
      tier: 'similar',
      score: 0.8,
      highlights: [{ field: 'alternative_labels', text: 'IA', ranges: [[0, 2]] }]
    });
    expect(view.alsoKnownAs).toEqual([[{ text: 'IA', hit: true }]]);
    expect(view.similar).toBe(true);
  });

  it('marks the short definition when that is where the words matched', () => {
    const view = resultView(concept, { tier: 'exact', score: 1, highlights: [{ field: 'short_definition', ranges: [[0, 5]] }] });
    expect(view.summary).toEqual([{ text: 'Short', hit: true }, { text: '.', hit: false }]);
  });
});
