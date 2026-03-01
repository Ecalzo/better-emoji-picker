import { describe, it, expect, beforeEach } from 'vitest';
import { buildIndex, search } from './search.js';

const testEmojis = [
  { label: 'grinning face', tags: ['happy', 'smile'], shortcodes: ['grinning'], order: 1 },
  { label: 'grinning face with big eyes', tags: ['happy'], shortcodes: ['grinning_big_eyes'], order: 2 },
  { label: 'face with tears of joy', tags: ['laugh', 'cry'], shortcodes: ['joy'], order: 3 },
  { label: 'red heart', tags: ['love'], shortcodes: ['heart'], order: 100 },
  { label: 'broken heart', tags: ['sad', 'love'], shortcodes: ['broken_heart'], order: 101 },
];

describe('buildIndex + search', () => {
  beforeEach(() => {
    buildIndex(testEmojis);
  });

  it('returns matching indices for a single-word query', () => {
    const results = search('heart');
    expect(results).toEqual([3, 4]);
  });

  it('supports prefix matching', () => {
    const results = search('gri');
    expect(results).toEqual([0, 1]);
  });

  it('uses AND logic for multi-word queries', () => {
    const results = search('happy grinning');
    expect(results).toEqual([0, 1]);
  });

  it('returns empty array for empty query', () => {
    expect(search('')).toEqual([]);
  });

  it('returns empty array for whitespace-only query', () => {
    expect(search('   ')).toEqual([]);
  });

  it('respects the limit parameter', () => {
    const results = search('face', 2);
    expect(results).toHaveLength(2);
  });

  it('returns empty array when nothing matches', () => {
    expect(search('zzzznotfound')).toEqual([]);
  });

  it('matches tags', () => {
    const results = search('laugh');
    expect(results).toEqual([2]);
  });

  it('matches shortcodes', () => {
    const results = search('joy');
    expect(results).toEqual([2]);
  });

  it('is case-insensitive', () => {
    const results = search('HEART');
    expect(results).toEqual([3, 4]);
  });

  it('multi-word AND narrows results', () => {
    const results = search('love sad');
    expect(results).toEqual([4]);
  });

  it('results are sorted by order field', () => {
    const results = search('face');
    expect(results).toEqual([0, 1, 2]);
  });
});
