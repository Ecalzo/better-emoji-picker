use crate::focus::{self, FocusState};
use std::thread;
use std::time::Duration;

/// Type an emoji into the previously focused application.
pub fn type_emoji(
    emoji: &str,
    window: &tauri::WebviewWindow,
    focus_state: &FocusState,
) -> Result<(), String> {
    // 1. Hide our window (compositor restores focus to previous app)
    window.hide().map_err(|e| e.to_string())?;

    // 2. Explicitly restore focus
    focus::restore_focus(focus_state);

    // 3. Always copy to clipboard via wl-copy (guaranteed to work)
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("wl-copy")
            .arg("--")
            .arg(emoji)
            .status();
    }

    // 4. Delay for focus to settle
    thread::sleep(Duration::from_millis(250));

    // 5. Try to type directly (best-effort — clipboard is the fallback)
    if let Err(e) = type_text(emoji) {
        eprintln!("[emoji-picker] Auto-type failed, emoji is on clipboard: {}", e);
    }

    Ok(())
}

fn type_text(text: &str) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    return type_text_linux(text);

    #[cfg(target_os = "macos")]
    return type_text_macos(text);

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    Err("Unsupported platform".to_string())
}

#[cfg(target_os = "linux")]
fn type_text_linux(text: &str) -> Result<(), String> {
    let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok();

    if is_wayland {
        // wtype can directly type Unicode text — no clipboard needed
        let output = std::process::Command::new("wtype")
            .arg("--")
            .arg(text)
            .output()
            .map_err(|e| format!("Failed to run wtype: {}. Install: sudo pacman -S wtype", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("wtype failed: {}", stderr));
        }
    } else {
        // xdotool can type Unicode directly too
        let output = std::process::Command::new("xdotool")
            .args(["type", "--clearmodifiers", "--", text])
            .output()
            .map_err(|e| format!("Failed to run xdotool: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("xdotool failed: {}", stderr));
        }
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn type_text_macos(text: &str) -> Result<(), String> {
    use arboard::Clipboard;
    use enigo::{Enigo, Key, Keyboard, Settings};
    use enigo::Direction::Click;

    // macOS: clipboard + Cmd+V (most reliable for emoji)
    let mut clip = Clipboard::new().map_err(|e| e.to_string())?;
    clip.set_text(text).map_err(|e| e.to_string())?;

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    enigo.key(Key::Meta, enigo::Direction::Press).map_err(|e| e.to_string())?;
    enigo.key(Key::Unicode('v'), Click).map_err(|e| e.to_string())?;
    enigo.key(Key::Meta, enigo::Direction::Release).map_err(|e| e.to_string())?;
    Ok(())
}
