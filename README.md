# Better Emoji Picker

A fast, cross-platform emoji picker with great search. Press a global hotkey, find your emoji, and it auto-types into the previously focused app.

## Features

- **Instant search** — sub-millisecond inverted index over emoji names, tags, and shortcodes
- **Global hotkey** — `Super+.` toggles the picker from anywhere
- **Auto-type** — selected emoji is pasted into the previously focused application
- **Skin tone support** — persistent skin tone preference
- **Recent emojis** — tracks your most-used emojis
- **Keyboard navigation** — arrow keys, Enter to select, Escape to close, Tab to switch categories
- **Cross-platform** — macOS and Linux (X11 + Wayland)

## Installation

### Prerequisites

**Linux (Arch):**
```bash
sudo pacman -S webkit2gtk-4.1 xdotool wtype wl-clipboard
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install libwebkit2gtk-4.1-dev libxdo-dev xdotool wtype wl-clipboard
```

**macOS:**
No additional dependencies needed.

### Build from source

```bash
# Install Rust: https://rustup.rs
# Install Node.js: https://nodejs.org

git clone https://github.com/ecalzo/better-emoji-picker.git
cd better-emoji-picker
npm install
npm run tauri dev    # development mode
npm run tauri build  # production build
```

Built binaries will be in `src-tauri/target/release/bundle/`.

## Usage

1. Launch the app (it starts hidden in the system tray area)
2. Press `Super+.` to open the emoji picker
3. Type to search, use arrow keys to navigate, Enter to select
4. The selected emoji is automatically pasted into the previously focused app
5. Press Escape to close without selecting

## Tech Stack

- [Tauri v2](https://tauri.app) — Rust backend + web frontend
- Vanilla HTML/CSS/JS — no framework, keeps it fast and tiny
- [Emojibase](https://emojibase.dev/) — emoji dataset
- Custom inverted index — fast prefix-matching search

## License

MIT
