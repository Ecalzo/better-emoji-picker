import {
  loadEmojiData, getData, getByGroup, getSkinVariant,
  CATEGORIES, SKIN_TONES,
  getRecent, addRecent, getSkinTone, setSkinTone
} from './emoji-data.js';
import { buildIndex, search } from './search.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

// DOM elements
const searchInput = document.getElementById('search-input');
const categoryBar = document.getElementById('category-bar');
const emojiGrid = document.getElementById('emoji-grid');
const preview = document.getElementById('preview');
const skinToneBtn = document.getElementById('skin-tone-btn');
const skinToneMenu = document.getElementById('skin-tone-menu');

let allEmojis = [];
let currentCategory = -1; // -1 = recent
let currentSkinTone = 0;
let selectedIndex = -1;
let displayedEmojis = []; // currently rendered emojis [{emoji, index}]

// ── Initialization ──────────────────────────────────────────────

async function init() {
  allEmojis = await loadEmojiData();
  buildIndex(allEmojis);
  currentSkinTone = getSkinTone();

  renderCategoryBar();
  renderSkinToneButton();
  showRecent();
  setupListeners();

  searchInput.focus();
}

// ── Category Bar ────────────────────────────────────────────────

function renderCategoryBar() {
  // Recent tab
  const recentTab = document.createElement('button');
  recentTab.className = 'cat-tab active';
  recentTab.textContent = '🕐';
  recentTab.title = 'Recent';
  recentTab.dataset.group = '-1';
  recentTab.addEventListener('click', () => selectCategory(-1));
  categoryBar.appendChild(recentTab);

  for (const cat of CATEGORIES) {
    const btn = document.createElement('button');
    btn.className = 'cat-tab';
    btn.textContent = cat.icon;
    btn.title = cat.name;
    btn.dataset.group = String(cat.id);
    btn.addEventListener('click', () => selectCategory(cat.id));
    categoryBar.appendChild(btn);
  }
}

function selectCategory(groupId) {
  if (searchInput.value.trim()) {
    searchInput.value = '';
  }
  currentCategory = groupId;

  // Update active tab
  for (const tab of categoryBar.children) {
    tab.classList.toggle('active', parseInt(tab.dataset.group) === groupId);
  }

  if (groupId === -1) {
    showRecent();
  } else {
    const emojis = getByGroup(groupId);
    renderEmojis(emojis);
  }

  selectedIndex = -1;
  updateSelection();
}

// ── Emoji Grid Rendering ────────────────────────────────────────

function renderEmojis(emojis) {
  displayedEmojis = emojis;
  emojiGrid.innerHTML = '';

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < emojis.length; i++) {
    const emoji = emojis[i];
    const variant = getSkinVariant(emoji, currentSkinTone);
    const btn = document.createElement('button');
    btn.className = 'emoji-btn';
    btn.textContent = variant.unicode;
    btn.title = emoji.label;
    btn.dataset.idx = String(i);
    btn.addEventListener('click', () => onEmojiClick(emoji));
    btn.addEventListener('mouseenter', () => showPreview(emoji));
    btn.addEventListener('mouseleave', clearPreview);
    fragment.appendChild(btn);
  }
  emojiGrid.appendChild(fragment);
}

function showRecent() {
  const recent = getRecent();
  if (recent.length === 0) {
    // Show first category instead
    const firstCat = CATEGORIES[0];
    const emojis = getByGroup(firstCat.id);
    renderEmojis(emojis);
    return;
  }
  // Map recent entries back to full emoji objects
  const recentEmojis = recent.map(r => {
    const full = allEmojis.find(e => e.hexcode === r.hexcode);
    return full || r;
  }).filter(Boolean);
  renderEmojis(recentEmojis);
}

// ── Search ──────────────────────────────────────────────────────

function onSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    selectCategory(currentCategory);
    return;
  }

  // Clear active category highlight
  for (const tab of categoryBar.children) {
    tab.classList.remove('active');
  }

  const indices = search(query, 80);
  const results = indices.map(i => allEmojis[i]);
  renderEmojis(results);

  selectedIndex = results.length > 0 ? 0 : -1;
  updateSelection();
}

// ── Emoji Selection ─────────────────────────────────────────────

async function onEmojiClick(emoji) {
  const variant = getSkinVariant(emoji, currentSkinTone);
  addRecent(emoji);

  try {
    await invoke('select_emoji', { emoji: variant.unicode });
  } catch (e) {
    console.error('Failed to type emoji:', e);
  }
}

// ── Preview ─────────────────────────────────────────────────────

function showPreview(emoji) {
  const variant = getSkinVariant(emoji, currentSkinTone);
  preview.textContent = `${variant.unicode} ${emoji.label}`;
}

function clearPreview() {
  preview.textContent = '';
}

// ── Skin Tone ───────────────────────────────────────────────────

function renderSkinToneButton() {
  skinToneBtn.textContent = currentSkinTone === 0 ? '✋' : SKIN_TONES[currentSkinTone].unicode;

  // Build menu
  skinToneMenu.innerHTML = '';
  for (let i = 0; i < SKIN_TONES.length; i++) {
    const tone = SKIN_TONES[i];
    const btn = document.createElement('button');
    btn.className = 'skin-option' + (i === currentSkinTone ? ' active' : '');
    btn.textContent = i === 0 ? '✋' : tone.unicode;
    btn.title = tone.name;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentSkinTone = i;
      setSkinTone(i);
      renderSkinToneButton();
      skinToneMenu.classList.add('hidden');
      // Re-render current view
      onSearch();
    });
    skinToneMenu.appendChild(btn);
  }
}

// ── Keyboard Navigation ─────────────────────────────────────────

function handleKeyDown(e) {
  const cols = Math.floor(emojiGrid.offsetWidth / 40); // ~40px per emoji button
  const count = displayedEmojis.length;

  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, count - 1);
      updateSelection();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection();
      break;
    case 'ArrowDown':
      e.preventDefault();
      if (selectedIndex + cols < count) selectedIndex += cols;
      updateSelection();
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (selectedIndex - cols >= 0) selectedIndex -= cols;
      else searchInput.focus();
      updateSelection();
      break;
    case 'Enter':
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < count) {
        onEmojiClick(displayedEmojis[selectedIndex]);
      }
      break;
    case 'Escape':
      e.preventDefault();
      invoke('hide_window');
      break;
    case 'Tab':
      e.preventDefault();
      // Move to next category
      const catIds = [-1, ...CATEGORIES.map(c => c.id)];
      const curIdx = catIds.indexOf(currentCategory);
      const nextIdx = e.shiftKey
        ? (curIdx - 1 + catIds.length) % catIds.length
        : (curIdx + 1) % catIds.length;
      selectCategory(catIds[nextIdx]);
      break;
  }
}

function updateSelection() {
  const buttons = emojiGrid.querySelectorAll('.emoji-btn');
  buttons.forEach((btn, i) => {
    btn.classList.toggle('selected', i === selectedIndex);
  });

  // Scroll selected into view
  if (selectedIndex >= 0 && buttons[selectedIndex]) {
    buttons[selectedIndex].scrollIntoView({ block: 'nearest' });
    showPreview(displayedEmojis[selectedIndex]);
  }
}

// ── Event Listeners ─────────────────────────────────────────────

function setupListeners() {
  searchInput.addEventListener('input', onSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'Enter', 'Escape', 'Tab'].includes(e.key)) {
      handleKeyDown(e);
    }
  });

  emojiGrid.addEventListener('keydown', handleKeyDown);

  // Skin tone toggle
  skinToneBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    skinToneMenu.classList.toggle('hidden');
  });

  // Close skin tone menu on outside click
  document.addEventListener('click', () => {
    skinToneMenu.classList.add('hidden');
  });

  // Listen for picker-opened event from Rust
  listen('picker-opened', () => {
    searchInput.value = '';
    searchInput.focus();
    selectedIndex = -1;
    showRecent();
    // Reset to recent tab
    currentCategory = -1;
    for (const tab of categoryBar.children) {
      tab.classList.toggle('active', tab.dataset.group === '-1');
    }
  });

  // Global escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      invoke('hide_window');
    }
  });
}

// ── Start ───────────────────────────────────────────────────────
init();
