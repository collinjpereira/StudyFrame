mod curriculum;
mod storage;

use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, WindowEvent};

/// A `.studyframe.json` opened from Explorer arrives as a launch argument. The
/// frontend collects it once it is ready.
#[derive(Default)]
struct PendingImport(Mutex<Option<String>>);

#[tauri::command]
fn load_library(app: AppHandle) -> Result<storage::LoadResult, String> {
    storage::load(&app)
}

#[tauri::command]
fn save_library(app: AppHandle, json: String, allow_shrink: bool) -> Result<(), String> {
    storage::save(&app, &json, allow_shrink)
}

#[tauri::command]
fn snapshot_before_upgrade(app: AppHandle, version: String) -> Result<(), String> {
    storage::snapshot_before_upgrade(&app, &version)
}

#[tauri::command]
fn load_settings(app: AppHandle) -> storage::Settings {
    storage::load_settings(&app)
}

#[tauri::command]
fn save_settings(app: AppHandle, settings: storage::Settings) -> Result<(), String> {
    storage::save_settings(&app, &settings)
}

/// Reads a file the user picked in a native dialog. Doing this here rather than
/// through the fs plugin keeps the app from needing a broad filesystem scope.
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("could not read {path}: {e}"))
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| format!("could not write {path}: {e}"))
}

/// Reopening on the workspace the user left is the whole point of storing it.
#[tauri::command]
fn set_last_workspace(app: AppHandle, id: String) -> Result<(), String> {
    let mut settings = storage::load_settings(&app);
    settings.last_workspace = Some(id);
    storage::save_settings(&app, &settings)
}

/// The file the app was launched with, if any. Cleared once handed over.
#[tauri::command]
fn take_pending_import(app: AppHandle) -> Option<String> {
    let state = app.state::<PendingImport>();
    let mut slot = state.0.lock().ok()?;
    slot.take()
}

/// Destroying the window is not enough to end the process: the single-instance
/// plugin keeps listening for a relaunch for as long as the app is alive, so an
/// explicit exit is required once the library has been flushed.
#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

fn import_arg_from(args: &[String]) -> Option<String> {
    args.iter()
        .skip(1)
        .find(|a| a.to_lowercase().ends_with(".json"))
        .cloned()
}

fn restore_window(app: &AppHandle) {
    let settings = storage::load_settings(app);
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if let (Some(w), Some(h)) = (settings.width, settings.height) {
        let _ = window.set_size(tauri::LogicalSize::new(w, h));
    }
    if let (Some(x), Some(y)) = (settings.x, settings.y) {
        let _ = window.set_position(tauri::LogicalPosition::new(x, y));
    }
    if settings.maximized.unwrap_or(false) {
        let _ = window.maximize();
    }
}

fn remember_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let mut settings = storage::load_settings(app);
    let scale = window.scale_factor().unwrap_or(1.0);
    settings.maximized = window.is_maximized().ok();
    // Only record geometry while restored; a maximized frame is not what we
    // want to come back to at its original size.
    if !settings.maximized.unwrap_or(false) {
        if let Ok(size) = window.inner_size() {
            let logical = size.to_logical::<f64>(scale);
            settings.width = Some(logical.width);
            settings.height = Some(logical.height);
        }
        if let Ok(pos) = window.outer_position() {
            let logical = pos.to_logical::<f64>(scale);
            settings.x = Some(logical.x);
            settings.y = Some(logical.y);
        }
    }
    let _ = storage::save_settings(app, &settings);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // A second launch focuses the window that is already open, and hands it
        // any file that launch was carrying.
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
            if let Some(path) = import_arg_from(&args) {
                if let Ok(mut slot) = app.state::<PendingImport>().0.lock() {
                    *slot = Some(path);
                }
                let _ = app.emit_to("main", "studyframe://pending-import", ());
            }
        }));
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(PendingImport::default())
        .invoke_handler(tauri::generate_handler![
            load_library,
            save_library,
            snapshot_before_upgrade,
            load_settings,
            save_settings,
            take_pending_import,
            quit_app,
            set_last_workspace,
            read_text_file,
            write_text_file,
            curriculum::fetch_curriculum,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            restore_window(&handle);
            if let Some(path) = import_arg_from(&std::env::args().collect::<Vec<_>>()) {
                if let Ok(mut slot) = app.state::<PendingImport>().0.lock() {
                    *slot = Some(path);
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::CloseRequested { .. }) {
                let handle = window.app_handle().clone();
                remember_window(&handle);
            }
        })
        .run(tauri::generate_context!())
        .expect("StudyFrame failed to start");
}
