import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage before importing the module
const store = {};
const localStorageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, value) => { store[key] = String(value); }),
  removeItem: vi.fn((key) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k in store) delete store[k]; }),
};
vi.stubGlobal('localStorage', localStorageMock);

const { getByGroup, getSkinVariant, getRecent, addRecent, getSkinTone, setSkinTone } =
  await import('./emoji-data.js');

// We need to inject test data into the module. loadEmojiData uses fetch, so
// we'll call getByGroup against the module-level emojiData. Since emojiData
// is private, we use loadEmojiData with a mocked fetch to populate it.

const testEmojis = [
  { unicode: '😀', label: 'grinning face', group: 0, order: 1 },
  { unicode: '😁', label: 'beaming face', group: 0, order: 2 },
  { unicode: '👋', label: 'waving hand', group: 1, order: 10 },
  { unicode: '🐶', label: 'dog face', group: 3, order: 20 },
  { unicode: '🍔', label: 'hamburger', group: 4, order: 30 },
];

// Populate the module's internal emojiData via loadEmojiData with mocked fetch
const { loadEmojiData } = await import('./emoji-data.js');
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({ json: () => Promise.resolve(testEmojis) })
));
await loadEmojiData();

describe('getByGroup', () => {
  it('filters emojis by group and sorts by order', () => {
    const result = getByGroup(0);
    expect(result).toHaveLength(2);
    expect(result[0].unicode).toBe('😀');
    expect(result[1].unicode).toBe('😁');
  });

  it('attaches _idx property with original index', () => {
    const result = getByGroup(0);
    expect(result[0]._idx).toBe(0);
    expect(result[1]._idx).toBe(1);
  });

  it('returns empty array for a group with no emojis', () => {
    expect(getByGroup(999)).toEqual([]);
  });
});

describe('getSkinVariant', () => {
  it('returns original emoji when skinToneIndex is 0', () => {
    const emoji = { unicode: '👋', skins: [{ unicode: '👋🏻' }] };
    expect(getSkinVariant(emoji, 0)).toBe(emoji);
  });

  it('returns original emoji when no skins array', () => {
    const emoji = { unicode: '😀' };
    expect(getSkinVariant(emoji, 3)).toBe(emoji);
  });

  it('returns the correct skin variant', () => {
    const emoji = {
      unicode: '👋',
      skins: [
        { unicode: '👋🏻' },
        { unicode: '👋🏼' },
        { unicode: '👋🏽' },
      ],
    };
    expect(getSkinVariant(emoji, 2)).toEqual({ unicode: '👋🏼' });
  });

  it('falls back to original when variant index is out of range', () => {
    const emoji = { unicode: '👋', skins: [{ unicode: '👋🏻' }] };
    expect(getSkinVariant(emoji, 5)).toBe(emoji);
  });
});

describe('getRecent / addRecent', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it('returns empty array when no recents stored', () => {
    expect(getRecent()).toEqual([]);
  });

  it('addRecent stores an emoji and getRecent retrieves it', () => {
    addRecent({ unicode: '😀', label: 'grinning face', hexcode: '1F600' });
    const recent = getRecent();
    expect(recent).toHaveLength(1);
    expect(recent[0].unicode).toBe('😀');
  });

  it('addRecent deduplicates by unicode', () => {
    addRecent({ unicode: '😀', label: 'grinning face', hexcode: '1F600' });
    addRecent({ unicode: '😁', label: 'beaming face', hexcode: '1F601' });
    addRecent({ unicode: '😀', label: 'grinning face', hexcode: '1F600' });
    const recent = getRecent();
    expect(recent).toHaveLength(2);
    expect(recent[0].unicode).toBe('😀');
  });

  it('addRecent caps list at 30', () => {
    for (let i = 0; i < 35; i++) {
      addRecent({ unicode: `emoji${i}`, label: `emoji ${i}`, hexcode: `code${i}` });
    }
    const recent = getRecent();
    expect(recent).toHaveLength(30);
  });
});

describe('getSkinTone / setSkinTone', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it('defaults to 0 when nothing stored', () => {
    expect(getSkinTone()).toBe(0);
  });

  it('persists and retrieves skin tone preference', () => {
    setSkinTone(3);
    expect(getSkinTone()).toBe(3);
  });
});
