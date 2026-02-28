use crate::clipboard::ClipboardManager;
use crate::focus::{self, FocusState};
use std::thread;
use std::time::Duration;

/// Type an emoji into the previously focused application.
/// Strategy: hide window → restore focus → clipboard paste → restore clipboard.
pub fn type_emoji(
    emoji: &str,
    window: &tauri::WebviewWindow,
    focus_state: &FocusState,
    clipboard: &ClipboardManager,
) -> Result<(), String> {
    // 1. Save current clipboard
    clipboard.save();

    // 2. Set emoji to clipboard
    clipboard.set_emoji(emoji)?;

    // 3. Hide our window
    window.hide().map_err(|e| e.to_string())?;

    // 4. Restore focus to previous app
    focus::restore_focus(focus_state);

    // 5. Small delay for focus to settle
    thread::sleep(Duration::from_millis(150));

    // 6. Simulate paste
    simulate_paste()?;

    // 7. Small delay then restore clipboard
    thread::sleep(Duration::from_millis(100));
    clipboard.restore();

    Ok(())
}

/// Simulate Cmd+V (macOS) or Ctrl+V (Linux) paste keystroke.
fn simulate_paste() -> Result<(), String> {
    #[cfg(target_os = "linux")]
    return simulate_paste_linux();

    #[cfg(target_os = "macos")]
    return simulate_paste_macos();

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    Err("Unsupported platform".to_string())
}

#[cfg(target_os = "linux")]
fn simulate_paste_linux() -> Result<(), String> {
    // Check if we're on Wayland
    let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok();

    if is_wayland {
        // Use wtype for Wayland
        let status = std::process::Command::new("wtype")
            .args(["-M", "ctrl", "v", "-m", "ctrl"])
            .status()
            .map_err(|e| format!("Failed to run wtype: {}. Install with: sudo pacman -S wtype", e))?;
        if !status.success() {
            return Err("wtype command failed".to_string());
        }
    } else {
        // Use xdotool for X11
        let status = std::process::Command::new("xdotool")
            .args(["key", "--clearmodifiers", "ctrl+v"])
            .status()
            .map_err(|e| format!("Failed to run xdotool: {}", e))?;
        if !status.success() {
            return Err("xdotool command failed".to_string());
        }
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn simulate_paste_macos() -> Result<(), String> {
    use enigo::{Enigo, Key, Keyboard, Settings};
    use enigo::Direction::{Click};

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    enigo.key(Key::Meta, enigo::Direction::Press).map_err(|e| e.to_string())?;
    enigo.key(Key::Unicode('v'), Click).map_err(|e| e.to_string())?;
    enigo.key(Key::Meta, enigo::Direction::Release).map_err(|e| e.to_string())?;
    Ok(())
}
