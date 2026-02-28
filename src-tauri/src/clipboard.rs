use arboard::Clipboard;
use std::sync::Mutex;

/// Manages clipboard save/restore around emoji pasting.
pub struct ClipboardManager {
    saved_text: Mutex<Option<String>>,
}

impl ClipboardManager {
    pub fn new() -> Self {
        Self {
            saved_text: Mutex::new(None),
        }
    }

    /// Save the current clipboard content so we can restore it after pasting.
    pub fn save(&self) {
        if let Ok(mut clip) = Clipboard::new() {
            let text = clip.get_text().ok();
            *self.saved_text.lock().unwrap() = text;
        }
    }

    /// Set the clipboard to the given emoji text.
    pub fn set_emoji(&self, emoji: &str) -> Result<(), String> {
        let mut clip = Clipboard::new().map_err(|e| e.to_string())?;
        clip.set_text(emoji).map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Restore the previously saved clipboard content.
    pub fn restore(&self) {
        let saved = self.saved_text.lock().unwrap().take();
        if let Some(text) = saved {
            if let Ok(mut clip) = Clipboard::new() {
                let _ = clip.set_text(text);
            }
        }
    }
}
