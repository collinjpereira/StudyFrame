//! Reading a course curriculum from a link.
//!
//! A Udemy course page carries only its first ten sections; after them sits a
//! "35 more sections" button. The rest are not hidden in the markup — clicking
//! that button fetches them. So scraping the page alone can never yield the
//! full curriculum, and this calls the same public endpoint the button does.
//!
//! This lives in Rust because a webview cannot: udemy.com sends no CORS headers
//! for another origin, so the fetch fails before it starts.

use regex::Regex;
use serde::{Deserialize, Serialize};

const UA: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";

#[derive(Serialize)]
pub struct Lecture {
    pub title: String,
    pub mins: u32,
}

#[derive(Serialize)]
pub struct Section {
    pub title: String,
    pub lectures: Vec<Lecture>,
}

#[derive(Serialize, Clone)]
pub struct Expected {
    pub sections: u32,
    pub lectures: u32,
    pub length: String,
}

#[derive(Serialize)]
pub struct Curriculum {
    pub secs: Vec<Section>,
    pub title: String,
    /// What the page's own header claims, so the UI can report coverage honestly.
    pub expected: Option<Expected>,
}

#[derive(Deserialize)]
struct Asset {
    #[serde(default)]
    length: Option<f64>,
}

#[derive(Deserialize)]
struct Item {
    #[serde(rename = "_class")]
    class: String,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    asset: Option<Asset>,
}

#[derive(Deserialize)]
struct Feed {
    #[serde(default)]
    results: Vec<Item>,
}

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(UA)
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("could not start an HTTP client: {e}"))
}

fn page_title(html: &str) -> String {
    let Ok(re) = Regex::new(r"(?is)<title[^>]*>(.*?)</title>") else {
        return String::new();
    };
    let Some(caps) = re.captures(html) else {
        return String::new();
    };
    let raw = caps.get(1).map(|m| m.as_str()).unwrap_or("");
    let cleaned = Regex::new(r"(?i)\s*[|-]\s*Udemy.*$")
        .map(|r| r.replace(raw, "").to_string())
        .unwrap_or_else(|_| raw.to_string());
    cleaned.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Reads the "45 sections • 323 lectures • 51h 40m total length" row.
fn expected_totals(html: &str) -> Option<Expected> {
    let re = Regex::new(
        r"(?i)(\d+)\s*sections?\s*[•\u{00b7}]\s*([\d,]+)\s*lectures?(?:\s*[•\u{00b7}]\s*([^•\u{00b7}<]{1,40}?)\s*total)?",
    )
    .ok()?;
    let text = Regex::new(r"(?s)<[^>]+>")
        .ok()?
        .replace_all(html, " ")
        .to_string();
    let caps = re.captures(&text)?;
    Some(Expected {
        sections: caps.get(1)?.as_str().parse().ok()?,
        lectures: caps.get(2)?.as_str().replace(',', "").parse().ok()?,
        length: caps
            .get(3)
            .map(|m| m.as_str().split_whitespace().collect::<Vec<_>>().join(" "))
            .unwrap_or_default(),
    })
}

fn course_id(html: &str) -> Option<String> {
    if let Some(caps) = Regex::new(r#"data-clp-course-id="(\d+)""#).ok()?.captures(html) {
        return Some(caps.get(1)?.as_str().to_string());
    }
    // Older markup only carries the id inside an image path.
    let caps = Regex::new(r"course/\d+x\d+/(\d+)_").ok()?.captures(html)?;
    Some(caps.get(1)?.as_str().to_string())
}

#[tauri::command]
pub async fn fetch_curriculum(url: String) -> Result<Curriculum, String> {
    let client = client()?;

    let page = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("could not reach that page: {e}"))?
        .text()
        .await
        .map_err(|e| format!("could not read that page: {e}"))?;

    let title = page_title(&page);
    let expected = expected_totals(&page);
    let id = course_id(&page).ok_or_else(|| {
        "could not find the course id on that page — it may not be a course page".to_string()
    })?;

    let api = format!(
        "https://www.udemy.com/api-2.0/courses/{id}/public-curriculum-items/\
         ?page_size=1400&fields[lecture]=title,asset&fields[chapter]=title&fields[asset]=length"
    );
    let feed: Feed = client
        .get(&api)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("could not reach the curriculum feed: {e}"))?
        .json()
        .await
        .map_err(|e| format!("the curriculum feed was not readable: {e}"))?;

    let mut secs: Vec<Section> = Vec::new();
    for item in feed.results {
        match item.class.as_str() {
            "chapter" => secs.push(Section {
                title: item.title.unwrap_or_else(|| "Untitled section".into()),
                lectures: Vec::new(),
            }),
            "lecture" => {
                if secs.is_empty() {
                    secs.push(Section {
                        title: "Section 1".into(),
                        lectures: Vec::new(),
                    });
                }
                let seconds = item.asset.and_then(|a| a.length).unwrap_or(0.0);
                // Round up to at least a minute: a zero-length row would drop
                // out of every total and make the coverage count disagree.
                let mins = ((seconds / 60.0).round() as u32).max(1);
                let title = item.title.unwrap_or_else(|| "Untitled lecture".into());
                if let Some(last) = secs.last_mut() {
                    last.lectures.push(Lecture { title, mins });
                }
            }
            // Quizzes and practice tests carry no runtime; they are skipped.
            _ => {}
        }
    }

    secs.retain(|s| !s.lectures.is_empty());
    if secs.is_empty() {
        return Err("that course page returned no lectures".into());
    }

    Ok(Curriculum {
        secs,
        title,
        expected,
    })
}
