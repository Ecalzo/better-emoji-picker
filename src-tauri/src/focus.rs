use std::sync::Mutex;

/// Stores information about the previously focused window so we can
/// restore focus after the user picks an emoji.
pub struct FocusState {
    /// On Linux X11: the window ID from xdotool
    /// On macOS: unused (we use NSRunningApplication pid)
    pub window_id: Mutex<Option<String>>,
    /// On macOS: the pid of the previously focused app
    #[cfg(target_os = "macos")]
    pub prev_app_pid: Mutex<Option<i32>>,
}

impl FocusState {
    pub fn new() -> Self {
        Self {
            window_id: Mutex::new(None),
            #[cfg(target_os = "macos")]
            prev_app_pid: Mutex::new(None),
        }
    }
}

/// Capture the currently focused window before showing our picker.
pub fn capture_focus(state: &FocusState) {
    #[cfg(target_os = "linux")]
    capture_focus_linux(state);

    #[cfg(target_os = "macos")]
    capture_focus_macos(state);
}

#[cfg(target_os = "linux")]
fn capture_focus_linux(state: &FocusState) {
    // Try xdotool first (X11), fall back to nothing on Wayland
    // (Wayland compositors typically restore focus when our window hides)
    if let Ok(output) = std::process::Command::new("xdotool")
        .arg("getactivewindow")
        .output()
    {
        if output.status.success() {
            let id = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !id.is_empty() {
                *state.window_id.lock().unwrap() = Some(id);
                return;
            }
        }
    }
    log::debug!("Could not capture focus via xdotool (probably on Wayland)");
}

#[cfg(target_os = "macos")]
fn capture_focus_macos(state: &FocusState) {
    use objc2_app_kit::NSWorkspace;

    unsafe {
        let workspace = NSWorkspace::sharedWorkspace();
        if let Some(app) = workspace.frontmostApplication() {
            let pid = app.processIdentifier();
            *state.prev_app_pid.lock().unwrap() = Some(pid);
        }
    }
}

/// Restore focus to the previously captured window.
pub fn restore_focus(state: &FocusState) {
    #[cfg(target_os = "linux")]
    restore_focus_linux(state);

    #[cfg(target_os = "macos")]
    restore_focus_macos(state);
}

#[cfg(target_os = "linux")]
fn restore_focus_linux(state: &FocusState) {
    let id = state.window_id.lock().unwrap().clone();
    if let Some(wid) = id {
        // Try xdotool (X11)
        let _ = std::process::Command::new("xdotool")
            .args(["windowfocus", "--sync", &wid])
            .status();
    }
    // On Wayland, focus restores automatically when our window hides
}

#[cfg(target_os = "macos")]
fn restore_focus_macos(state: &FocusState) {
    use objc2_app_kit::{NSApplicationActivationOptions, NSRunningApplication};

    let pid = state.prev_app_pid.lock().unwrap().clone();
    if let Some(pid) = pid {
        unsafe {
            if let Some(app) = NSRunningApplication::runningApplicationWithProcessIdentifier(pid) {
                app.activateWithOptions(
                    NSApplicationActivationOptions::NSApplicationActivateIgnoringOtherApps,
                );
            }
        }
    }
}
