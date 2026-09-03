//! Durable storage for the library.
//!
//! The single hard requirement: a user must never lose their library. Progress,
//! notes and cards exist nowhere else — there is no server copy to restore from.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

const KEEP_BACKUPS: usize = 14;

#[derive(Serialize)]
pub struct LoadResult {
    pub json: Option<String>,
    /// Set when library.json could not be used and something else was. The UI
    /// says so out loud — starting empty in silence looks like data loss.
    pub recovered: Option<String>,
}

#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub maximized: Option<bool>,
    pub last_workspace: Option<String>,
}

/// `%APPDATA%\StudyFrame\` on Windows. Per user, and it survives a reinstall —
/// the install directory needs admin rights and gets wiped by uninstallers.
pub fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("no application data directory: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("could not create {}: {e}", dir.display()))?;
    let backups = dir.join("backups");
    fs::create_dir_all(&backups)
        .map_err(|e| format!("could not create {}: {e}", backups.display()))?;
    Ok(dir)
}

fn library_path(dir: &Path) -> PathBuf {
    dir.join("library.json")
}

fn backup_path(dir: &Path) -> PathBuf {
    dir.join("library.json.bak")
}

fn backups_dir(dir: &Path) -> PathBuf {
    dir.join("backups")
}

fn parses(text: &str) -> bool {
    serde_json::from_str::<serde_json::Value>(text).is_ok()
}

fn read_if_valid(path: &Path) -> Option<String> {
    let text = fs::read_to_string(path).ok()?;
    if parses(&text) {
        Some(text)
    } else {
        None
    }
}

/// Newest file in `backups\`, so a recovery gets the least-stale snapshot.
fn newest_backup(dir: &Path) -> Option<(PathBuf, String)> {
    let mut entries: Vec<(PathBuf, std::time::SystemTime)> = fs::read_dir(backups_dir(dir))
        .ok()?
        .flatten()
        .filter(|e| e.path().extension().is_some_and(|x| x == "json"))
        .filter_map(|e| {
            let modified = e.metadata().ok()?.modified().ok()?;
            Some((e.path(), modified))
        })
        .collect();
    entries.sort_by_key(|(_, t)| *t);
    for (path, _) in entries.into_iter().rev() {
        if let Some(text) = read_if_valid(&path) {
            return Some((path, text));
        }
    }
    None
}

/// Read with fallback: library.json, then .bak, then the newest snapshot.
pub fn load(app: &AppHandle) -> Result<LoadResult, String> {
    let dir = data_dir(app)?;
    let live = library_path(&dir);

    if let Some(text) = read_if_valid(&live) {
        snapshot_once_daily(&dir, &text);
        return Ok(LoadResult {
            json: Some(text),
            recovered: None,
        });
    }

    // Nothing there at all is a first run, not a failure.
    let existed = live.exists();

    if let Some(text) = read_if_valid(&backup_path(&dir)) {
        snapshot_once_daily(&dir, &text);
        return Ok(LoadResult {
            json: Some(text),
            recovered: Some(
                "Your library file was unreadable, so StudyFrame recovered the previous saved \
                 version (library.json.bak). Check that recent work is present."
                    .into(),
            ),
        });
    }

    if let Some((path, text)) = newest_backup(&dir) {
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "a daily snapshot".into());
        snapshot_once_daily(&dir, &text);
        return Ok(LoadResult {
            json: Some(text),
            recovered: Some(format!(
                "Your library file and its backup were both unreadable, so StudyFrame recovered \
                 the daily snapshot {name}. Anything after that snapshot may be missing."
            )),
        });
    }

    Ok(LoadResult {
        json: None,
        recovered: if existed {
            Some(
                "Your library file could not be read and no backup was found. StudyFrame has \
                 started a new library and left the old files in place — do not delete them."
                    .into(),
            )
        } else {
            None
        },
    })
}

/// One snapshot per day, pruned to the last fourteen.
fn snapshot_once_daily(dir: &Path, contents: &str) {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let target = backups_dir(dir).join(format!("{today}.json"));
    if target.exists() {
        return;
    }
    let _ = fs::write(&target, contents);
    prune_backups(dir);
}

fn prune_backups(dir: &Path) {
    let Ok(entries) = fs::read_dir(backups_dir(dir)) else {
        return;
    };
    let mut daily: Vec<PathBuf> = entries
        .flatten()
        .map(|e| e.path())
        .filter(|p| {
            // Pre-upgrade copies are kept forever; only the dated ones rotate.
            p.file_name()
                .map(|n| n.to_string_lossy().chars().next().is_some_and(|c| c.is_ascii_digit()))
                .unwrap_or(false)
        })
        .collect();
    daily.sort();
    while daily.len() > KEEP_BACKUPS {
        let oldest = daily.remove(0);
        let _ = fs::remove_file(oldest);
    }
}

/// Copies the library aside before a schema migration touches it.
pub fn snapshot_before_upgrade(app: &AppHandle, version: &str) -> Result<(), String> {
    let dir = data_dir(app)?;
    let Some(text) = read_if_valid(&library_path(&dir)) else {
        return Ok(());
    };
    let target = backups_dir(&dir).join(format!("pre-upgrade-{version}.json"));
    if target.exists() {
        return Ok(());
    }
    fs::write(&target, text).map_err(|e| format!("could not write the pre-upgrade copy: {e}"))
}

/// Atomic write. A rename is atomic on NTFS, so a crash mid-write can never
/// leave a half-written library: the worst case is the previous good version.
pub fn save(app: &AppHandle, json: &str, allow_shrink: bool) -> Result<(), String> {
    if !parses(json) {
        return Err("refused to write a library that is not valid JSON".into());
    }

    let dir = data_dir(app)?;
    let live = library_path(&dir);

    // A bug that empties the library should fail loudly, not overwrite good data.
    if !allow_shrink {
        if let Ok(meta) = fs::metadata(&live) {
            let previous = meta.len();
            if previous > 0 && (json.len() as u64) < previous / 2 {
                return Err(format!(
                    "refused to write a library less than half the size of the last good save \
                     ({} bytes against {previous}). Nothing was changed.",
                    json.len()
                ));
            }
        }
    }

    let tmp = dir.join("library.json.tmp");
    {
        let mut file =
            fs::File::create(&tmp).map_err(|e| format!("could not open the temp file: {e}"))?;
        file.write_all(json.as_bytes())
            .map_err(|e| format!("could not write the temp file: {e}"))?;
        // Flush and fsync before the rename, or the rename can land ahead of the data.
        file.flush().map_err(|e| format!("could not flush: {e}"))?;
        file.sync_all().map_err(|e| format!("could not fsync: {e}"))?;
    }

    if live.exists() {
        let bak = backup_path(&dir);
        let _ = fs::remove_file(&bak);
        fs::rename(&live, &bak).map_err(|e| format!("could not roll the previous version: {e}"))?;
    }
    fs::rename(&tmp, &live).map_err(|e| format!("could not move the new library into place: {e}"))
}

pub fn load_settings(app: &AppHandle) -> Settings {
    let Ok(dir) = data_dir(app) else {
        return Settings::default();
    };
    fs::read_to_string(dir.join("settings.json"))
        .ok()
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

pub fn save_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let dir = data_dir(app)?;
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(dir.join("settings.json"), json).map_err(|e| e.to_string())
}
