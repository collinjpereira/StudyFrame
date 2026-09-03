// The window draws its own title bar, so no console should appear behind it.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    studyframe_lib::run()
}
