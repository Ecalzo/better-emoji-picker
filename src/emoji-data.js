/**
 * Emoji data loader and utilities.
 */

/** @type {Array} full emoji dataset */
let emojiData = [];

/** Group ID → category info mapping (emojibase group numbers) */
export const CATEGORIES = [
  { id: 0, name: 'Smileys & Emotion', icon: '😀' },
  { id: 1, name: 'People & Body', icon: '👋' },
  { id: 3, name: 'Animals & Nature', icon: '🐶' },
  { id: 4, name: 'Food & Drink', icon: '🍔' },
  { id: 5, name: 'Travel & Places', icon: '✈️' },
  { id: 6, name: 'Activities', icon: '⚽' },
  { id: 7, name: 'Objects', icon: '💡' },
  { id: 8, name: 'Symbols', icon: '❤️' },
  { id: 9, name: 'Flags', icon: '🏁' },
];

// Skin tone modifiers
export const SKIN_TONES = [
  { name: 'Default', modifier: '' },
  { name: 'Light', modifier: '1F3FB', unicode: '🏻' },
  { name: 'Medium-Light', modifier: '1F3FC', unicode: '🏼' },
  { name: 'Medium', modifier: '1F3FD', unicode: '🏽' },
  { name: 'Medium-Dark', modifier: '1F3FE', unicode: '🏾' },
  { name: 'Dark', modifier: '1F3FF', unicode: '🏿' },
];

/**
 * Load the emoji dataset.
 * @returns {Promise<Array>}
 */
export async function loadEmojiData() {
  const resp = await fetch('./data/emoji-compact.json');
  emojiData = await resp.json();
  return emojiData;
}

/**
 * Get all emojis, optionally filtered by category.
 */
export function getData() {
  return emojiData;
}

/**
 * Get emojis for a specific category group.
 * @param {number} groupId
 * @returns {Array}
 */
export function getByGroup(groupId) {
  return emojiData
    .map((e, i) => ({ ...e, _idx: i }))
    .filter(e => e.group === groupId)
    .sort((a, b) => (a.order || 9999) - (b.order || 9999));
}

/**
 * Get the skin-toned variant of an emoji, if available.
 * @param {Object} emoji - emoji entry
 * @param {number} skinToneIndex - 0=default, 1-5=skin tones
 * @returns {Object} the emoji variant to display
 */
export function getSkinVariant(emoji, skinToneIndex) {
  if (skinToneIndex === 0 || !emoji.skins) return emoji;
  const variant = emoji.skins[skinToneIndex - 1];
  return variant || emoji;
}

// Recent emojis management
const RECENT_KEY = 'emoji-picker-recent';
const MAX_RECENT = 30;

export function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addRecent(emoji) {
  const recent = getRecent().filter(e => e.unicode !== emoji.unicode);
  recent.unshift({ unicode: emoji.unicode, label: emoji.label, hexcode: emoji.hexcode });
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

// Skin tone preference
const SKIN_KEY = 'emoji-picker-skin-tone';

export function getSkinTone() {
  return parseInt(localStorage.getItem(SKIN_KEY) || '0', 10);
}

export function setSkinTone(index) {
  localStorage.setItem(SKIN_KEY, String(index));
}
