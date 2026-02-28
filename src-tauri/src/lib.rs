mod autotype;
mod focus;
mod hotkey;

use focus::FocusState;

/// Tauri command: type an emoji into the previously focused app.
#[tauri::command]
fn select_emoji(
    emoji: String,
    window: tauri::WebviewWindow,
    focus_state: tauri::State<'_, FocusState>,
) -> Result<(), String> {
    autotype::type_emoji(&emoji, &window, &focus_state)
}

/// Tauri command: hide the picker window (e.g. on Escape).
#[tauri::command]
fn hide_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(FocusState::new())
        .invoke_handler(tauri::generate_handler![select_emoji, hide_window])
        .setup(|app| {
            if let Err(e) = hotkey::register_hotkey(app) {
                eprintln!("[emoji-picker] ERROR: Failed to register global hotkey: {}", e);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
