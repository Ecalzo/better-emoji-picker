/**
 * Fast emoji search engine using an inverted index with prefix matching.
 */

/** @type {Map<string, number[]>} token → array of emoji indices */
let index = new Map();

/** @type {Array} the emoji dataset */
let emojis = [];

/**
 * Build the inverted index from the emoji dataset.
 * @param {Array} data - emojibase compact dataset
 */
export function buildIndex(data) {
  emojis = data;
  index = new Map();

  for (let i = 0; i < data.length; i++) {
    const emoji = data[i];
    const tokens = extractTokens(emoji);
    for (const token of tokens) {
      let list = index.get(token);
      if (!list) {
        list = [];
        index.set(token, list);
      }
      list.push(i);
    }
  }
}

/**
 * Extract searchable tokens from an emoji entry.
 */
function extractTokens(emoji) {
  const tokens = new Set();

  // From label (annotation)
  if (emoji.label) {
    for (const word of emoji.label.toLowerCase().split(/[\s:,\-_&]+/)) {
      if (word.length > 0) tokens.add(word);
    }
  }

  // From tags
  if (emoji.tags) {
    for (const tag of emoji.tags) {
      for (const word of tag.toLowerCase().split(/[\s_\-]+/)) {
        if (word.length > 0) tokens.add(word);
      }
    }
  }

  // From shortcodes
  if (emoji.shortcodes) {
    for (const sc of emoji.shortcodes) {
      for (const word of sc.toLowerCase().split(/[_\-]+/)) {
        if (word.length > 0) tokens.add(word);
      }
    }
  }

  return tokens;
}

/**
 * Search emojis by query string. Returns array of emoji indices.
 * Multi-word queries use AND logic (all tokens must match).
 * @param {string} query
 * @param {number} limit
 * @returns {number[]} indices into the emoji array
 */
export function search(query, limit = 50) {
  const queryTokens = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
  if (queryTokens.length === 0) return [];

  // For each query token, find all emoji indices that prefix-match
  const matchSets = queryTokens.map(qt => {
    const matched = new Set();
    for (const [token, indices] of index) {
      if (token.startsWith(qt)) {
        for (const idx of indices) {
          matched.add(idx);
        }
      }
    }
    return matched;
  });

  // Intersect all match sets (AND logic)
  let result = matchSets[0];
  for (let i = 1; i < matchSets.length; i++) {
    const next = new Set();
    for (const idx of result) {
      if (matchSets[i].has(idx)) next.add(idx);
    }
    result = next;
  }

  // Sort by order field (official Unicode ordering) and limit
  const arr = [...result];
  arr.sort((a, b) => (emojis[a].order || 9999) - (emojis[b].order || 9999));
  return arr.slice(0, limit);
}
