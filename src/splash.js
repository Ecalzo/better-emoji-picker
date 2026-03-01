import { SKIN_TONES, getSkinTone, setSkinTone } from './emoji-data.js';

const { invoke } = window.__TAURI__.core;

const ONBOARDED_KEY = 'emoji-picker-onboarded';

/**
 * Show the first-launch splash wizard.
 * Calls onComplete when finished or skipped.
 * Returns immediately if already onboarded.
 */
export function showSplash(onComplete) {
  if (localStorage.getItem(ONBOARDED_KEY)) {
    onComplete();
    return;
  }

  let currentStep = 0;
  let selectedSkinTone = getSkinTone();
  let accessibilityPollId = null;

  const overlay = document.createElement('div');
  overlay.id = 'splash';

  function stopPolling() {
    if (accessibilityPollId) {
      clearInterval(accessibilityPollId);
      accessibilityPollId = null;
    }
  }

  function render() {
    stopPolling();
    overlay.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'splash-card';

    const content = document.createElement('div');
    content.className = 'splash-content';
    const steps = [buildWelcome, buildAccessibility, buildSkinTone];
    steps[currentStep](content);
    card.appendChild(content);

    // Navigation
    const nav = document.createElement('div');
    nav.className = 'splash-nav';

    // Back button (steps 1+)
    if (currentStep > 0) {
      const back = document.createElement('button');
      back.className = 'splash-btn';
      back.textContent = 'Back';
      back.addEventListener('click', () => { currentStep--; render(); });
      nav.appendChild(back);
    }

    // Dot indicators
    const dots = document.createElement('div');
    dots.className = 'splash-dots';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'splash-dot' + (i === currentStep ? ' active' : '');
      dots.appendChild(dot);
    }
    nav.appendChild(dots);

    // Next / Done button
    const next = document.createElement('button');
    next.className = 'splash-btn splash-btn-primary';
    if (currentStep === 0) {
      next.textContent = 'Get Started';
    } else if (currentStep === 2) {
      next.textContent = 'Done';
    } else {
      next.textContent = 'Next';
    }

    // Disable Next on accessibility step until permission is granted
    if (currentStep === 1) {
      next.disabled = true;
      next.classList.add('splash-btn-disabled');
      // Store reference so the poll can enable it
      overlay._nextBtn = next;
    }

    next.addEventListener('click', () => {
      if (next.disabled) return;
      if (currentStep < 2) {
        currentStep++;
        render();
      } else {
        finish();
      }
    });
    nav.appendChild(next);

    card.appendChild(nav);
    overlay.appendChild(card);
  }

  function buildWelcome(card) {
    const icon = document.createElement('div');
    icon.className = 'splash-icon';
    icon.textContent = '👋';
    card.appendChild(icon);

    const title = document.createElement('div');
    title.className = 'splash-title';
    title.textContent = 'Better Emoji Picker';
    card.appendChild(title);

    const tagline = document.createElement('div');
    tagline.className = 'splash-tagline';
    tagline.textContent = 'A fast emoji picker for your desktop';
    card.appendChild(tagline);
  }

  function buildAccessibility(card) {
    const icon = document.createElement('div');
    icon.className = 'splash-icon';
    icon.textContent = '🔐';
    card.appendChild(icon);

    const title = document.createElement('div');
    title.className = 'splash-title';
    title.textContent = 'Accessibility Permission';
    card.appendChild(title);

    const tagline = document.createElement('div');
    tagline.className = 'splash-tagline';
    tagline.textContent = 'Allow auto-typing emojis into other apps';
    card.appendChild(tagline);

    const instructions = document.createElement('div');
    instructions.className = 'splash-instructions';
    instructions.innerHTML =
      '<strong>System Settings</strong> → <strong>Privacy & Security</strong> → <strong>Accessibility</strong><br>' +
      'Enable <strong>Better Emoji Picker</strong> in the list.';
    card.appendChild(instructions);

    // Status indicator
    const status = document.createElement('div');
    status.className = 'splash-status splash-status-pending';
    status.textContent = 'Waiting for permission…';
    card.appendChild(status);

    const openBtn = document.createElement('button');
    openBtn.className = 'splash-btn';
    openBtn.textContent = 'Open System Settings';
    openBtn.addEventListener('click', () => {
      invoke('open_accessibility_settings').catch(e =>
        console.error('Failed to open settings:', e)
      );
    });
    card.appendChild(openBtn);


    // Poll for accessibility permission
    function checkAccess() {
      invoke('is_accessibility_enabled').then(enabled => {
        if (enabled) {
          status.className = 'splash-status splash-status-granted';
          status.textContent = 'Permission granted!';
          if (overlay._nextBtn) {
            overlay._nextBtn.disabled = false;
            overlay._nextBtn.classList.remove('splash-btn-disabled');
          }
          stopPolling();
        }
      }).catch(() => {});
    }

    // Check immediately, then poll every 1.5s
    checkAccess();
    accessibilityPollId = setInterval(checkAccess, 1500);
  }

  // Hand emoji with each skin tone applied
  const HAND_EMOJIS = ['\u270B', '\u270B\uD83C\uDFFB', '\u270B\uD83C\uDFFC', '\u270B\uD83C\uDFFD', '\u270B\uD83C\uDFFE', '\u270B\uD83C\uDFFF'];

  function buildSkinTone(card) {
    const icon = document.createElement('div');
    icon.className = 'splash-icon';
    icon.textContent = '\u270B';
    card.appendChild(icon);

    const title = document.createElement('div');
    title.className = 'splash-title';
    title.textContent = 'Choose Your Skin Tone';
    card.appendChild(title);

    const tagline = document.createElement('div');
    tagline.className = 'splash-tagline';
    tagline.textContent = 'You can change this anytime in the header';
    card.appendChild(tagline);

    const grid = document.createElement('div');
    grid.className = 'splash-skin-grid';

    for (let i = 0; i < SKIN_TONES.length; i++) {
      const tone = SKIN_TONES[i];

      const swatch = document.createElement('button');
      swatch.className = 'splash-skin-swatch' + (i === selectedSkinTone ? ' active' : '');
      swatch.textContent = HAND_EMOJIS[i];
      swatch.title = tone.name;
      swatch.addEventListener('click', () => {
        selectedSkinTone = i;
        setSkinTone(i);
        grid.querySelectorAll('.splash-skin-swatch').forEach((s, idx) => {
          s.classList.toggle('active', idx === i);
        });
      });
      grid.appendChild(swatch);
    }

    card.appendChild(grid);
  }

  function finish() {
    stopPolling();
    localStorage.setItem(ONBOARDED_KEY, '1');
    overlay.remove();
    onComplete();
  }

  document.body.appendChild(overlay);
  render();
}
