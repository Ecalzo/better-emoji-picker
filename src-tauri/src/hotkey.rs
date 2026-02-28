use crate::focus::{self, FocusState};
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

/// Register the global hotkey to toggle the emoji picker.
pub fn register_hotkey(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let shortcut: Shortcut = "ctrl+super+e".parse()?;

    app.global_shortcut().on_shortcut(shortcut, move |app_handle, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            if let Some(window) = app_handle.get_webview_window("main") {
                let focus_state = app_handle.state::<FocusState>();
                let is_visible = window.is_visible().unwrap_or(false);

                if is_visible {
                    let _ = window.hide();
                } else {
                    // Capture focus before showing
                    focus::capture_focus(&focus_state);
                    let _ = window.show();
                    let _ = window.set_focus();
                    // Tell frontend to focus the search bar
                    let _ = window.emit("picker-opened", ());
                }
            }
        }
    })?;

    eprintln!("[emoji-picker] Global hotkey registered: Ctrl+Super+E");
    Ok(())
}
