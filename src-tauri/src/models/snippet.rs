use chrono::{DateTime, Utc};

use rusqlite::{params, Error};
use serde::{Deserialize, Serialize};

use crate::database::DatabaseConnection;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Snippet {
    pub id: i64,
    pub title: String,
    pub code: String,
    pub language: String,
    pub description: Option<String>,
    pub tags: Option<String>, // JSON string of tags array
    pub is_favorite: bool,
    pub folder_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnippetFolder {
    pub id: i64,
    pub name: String,
    pub parent_id: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnippetQueryParams {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub language: Option<String>,
    pub is_favorite: Option<String>,
    pub folder_id: Option<i64>,
    pub search: Option<String>,
    pub sort_by: Option<String>, // "name", "date_created", "date_modified", "language"
    pub sort_order: Option<String>, // "asc", "desc"
}

impl Snippet {
    pub fn create(
        db: &DatabaseConnection,
        title: &str,
        code: &str,
        language: &str,
        description: Option<&str>,
        tags: Option<&str>,
        folder_id: Option<i64>,
    ) -> Result<Self, Error> {
        let conn = db.get_connection();
        let now_iso: DateTime<Utc> = Utc::now();
        let timestamp = now_iso.to_rfc3339();

        conn.execute(
            "INSERT INTO snippets (
                title,
                code, 
                language,
                description,
                tags,
                folder_id,
                created_at,
                updated_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
            )",
            params![
                title,
                code,
                language,
                description,
                tags,
                folder_id,
                timestamp,
                timestamp,
            ],
        )?;

        let id = conn.last_insert_rowid();
        
        Ok(Snippet {
            id,
            title: title.to_string(),
            code: code.to_string(),
            language: language.to_string(),
            description: description.map(|s| s.to_string()),
            tags: tags.map(|s| s.to_string()),
            is_favorite: false,
            folder_id,
            created_at: timestamp.clone(),
            updated_at: timestamp,
        })
    }

    pub fn get(db: &DatabaseConnection, id: i64) -> Result<Self, Error> {
        let conn = db.get_connection();
        conn.query_row(
            "SELECT 
                id, 
                title, 
                code, 
                language, 
                description,
                tags,
                is_favorite,
                folder_id,
                created_at, 
                updated_at
            FROM snippets WHERE id = ?1",
            params![id],
            |row| {
                Ok(Snippet {
                    id: row.get("id")?,
                    title: row.get("title")?,
                    code: row.get("code")?,
                    language: row.get("language")?,
                    description: row.get("description")?,
                    tags: row.get("tags")?,
                    is_favorite: row.get("is_favorite")?,
                    folder_id: row.get("folder_id")?,
                    created_at: row.get("created_at")?,
                    updated_at: row.get("updated_at")?,
                })
            },
        )
    }

    pub fn get_all(
        db: &DatabaseConnection,
        query_params: SnippetQueryParams,
    ) -> Result<(Vec<Self>, usize), Error> {
        let mut query = "SELECT id, title, code, language, description, tags, is_favorite, folder_id, created_at, updated_at FROM snippets".to_string();
        let mut where_clauses = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        // Add WHERE clauses based on query parameters
        if let Some(language) = &query_params.language {
            where_clauses.push("language = ?".to_string());
            params_vec.push(Box::new(language.clone()));
        }

        if let Some(is_favorite_str) = &query_params.is_favorite {
            let val: Option<i32> = match is_favorite_str.as_str() {
                "true" => Some(1),
                "false" => Some(0),
                _ => None,
            };

            if let Some(db_val) = val {
                where_clauses.push("is_favorite = ?".to_string());
                params_vec.push(Box::new(db_val));
            }
        }

        if let Some(folder_id) = query_params.folder_id {
            where_clauses.push("folder_id = ?".to_string());
            params_vec.push(Box::new(folder_id));
        }

        if let Some(search) = &query_params.search {
            where_clauses.push("(title LIKE ? OR code LIKE ? OR description LIKE ?)".to_string());
            let search_pattern = format!("%{}%", search);
            params_vec.push(Box::new(search_pattern.clone()));
            params_vec.push(Box::new(search_pattern.clone()));
            params_vec.push(Box::new(search_pattern));
        }

        if !where_clauses.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&where_clauses.join(" AND "));
        }

        // Add ORDER BY clause
        let sort_by = query_params.sort_by.as_deref().unwrap_or("updated_at");
        let sort_order = query_params.sort_order.as_deref().unwrap_or("desc");
        
        let order_field = match sort_by {
            "name" => "title",
            "date_created" => "created_at",
            "date_modified" => "updated_at",
            "language" => "language",
            _ => "updated_at",
        };

        query.push_str(&format!(" ORDER BY {} {}", order_field, sort_order.to_uppercase()));

        let limit = query_params.limit.unwrap_or(20);
        let page = query_params.page.unwrap_or(1);
        let offset = (page - 1) * limit;

        query.push_str(" LIMIT ? OFFSET ?");
        params_vec.push(Box::new(limit as i32));
        params_vec.push(Box::new(offset as i32));

        let params: Vec<&dyn rusqlite::types::ToSql> = params_vec
            .iter()
            .map(|x| x.as_ref())
            .collect();

        let conn = db.get_connection();
        let total_count = conn.query_row("SELECT COUNT(*) FROM snippets", params![], |row| row.get(0))?;
        let mut stmt = conn.prepare(&query)?;

        let snippets = stmt.query_map(params.as_slice(), |row| {
            Ok(Snippet {
                id: row.get("id")?,
                title: row.get("title")?,
                code: row.get("code")?,
                language: row.get("language")?,
                description: row.get("description")?,
                tags: row.get("tags")?,
                is_favorite: row.get("is_favorite")?,
                folder_id: row.get("folder_id")?,
                created_at: row.get("created_at")?,
                updated_at: row.get("updated_at")?,
            })
        })?;

        let mut results: Vec<Snippet> = Vec::new();
        for snippet in snippets {
            results.push(snippet?);
        }

        Ok((results, total_count))
    }

    pub fn update(&self, db: &DatabaseConnection) -> Result<String, Error> {
        let conn = db.get_connection();
        let now_iso: DateTime<Utc> = Utc::now();
        let timestamp = now_iso.to_rfc3339();

        conn.execute(
            "UPDATE snippets SET 
                title = ?1, 
                code = ?2, 
                language = ?3,
                description = ?4,
                tags = ?5,
                is_favorite = ?6,
                folder_id = ?7,
                updated_at = ?8
            WHERE id = ?9",
            params![
                &self.title,
                &self.code,
                &self.language,
                &self.description,
                &self.tags,
                &self.is_favorite,
                &self.folder_id,
                timestamp,
                &self.id
            ],
        )?;

        Ok("Snippet has been updated successfully".to_string())
    }

    pub fn delete_by_id(db: &DatabaseConnection, id: i64) -> Result<String, Error> {
        let conn = db.get_connection();
        conn.execute("DELETE FROM snippets WHERE id = ?1", params![id])?;
        Ok("Snippet has been deleted successfully".to_string())
    }

    pub fn search(db: &DatabaseConnection, keyword: String) -> Result<Vec<Self>, Error> {
        let conn = db.get_connection();
        let search_pattern = format!("%{}%", keyword);
        
        let mut stmt = conn.prepare(
            "SELECT id, title, code, language, description, tags, is_favorite, folder_id, created_at, updated_at 
             FROM snippets 
             WHERE title LIKE ?1 OR code LIKE ?1 OR description LIKE ?1 OR tags LIKE ?1
             ORDER BY updated_at DESC"
        )?;

        let snippet_iter = stmt.query_map([search_pattern], |row| {
            Ok(Snippet {
                id: row.get("id")?,
                title: row.get("title")?,
                code: row.get("code")?,
                language: row.get("language")?,
                description: row.get("description")?,
                tags: row.get("tags")?,
                is_favorite: row.get("is_favorite")?,
                folder_id: row.get("folder_id")?,
                created_at: row.get("created_at")?,
                updated_at: row.get("updated_at")?,
            })
        })?;

        let mut snippets = Vec::new();
        for snippet in snippet_iter {
            snippets.push(snippet?);
        }

        Ok(snippets)
    }
}

impl SnippetFolder {
    pub fn create(
        db: &DatabaseConnection,
        name: &str,
        parent_id: Option<i64>,
    ) -> Result<Self, Error> {
        let conn = db.get_connection();
        let now_iso: DateTime<Utc> = Utc::now();
        let timestamp = now_iso.to_rfc3339();

        conn.execute(
            "INSERT INTO snippet_folders (name, parent_id, created_at) VALUES (?1, ?2, ?3)",
            params![name, parent_id, timestamp],
        )?;

        let id = conn.last_insert_rowid();
        
        Ok(SnippetFolder {
            id,
            name: name.to_string(),
            parent_id,
            created_at: timestamp,
        })
    }

    pub fn get_all(db: &DatabaseConnection) -> Result<Vec<Self>, Error> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, name, parent_id, created_at FROM snippet_folders ORDER BY name ASC"
        )?;

        let folder_iter = stmt.query_map([], |row| {
            Ok(SnippetFolder {
                id: row.get("id")?,
                name: row.get("name")?,
                parent_id: row.get("parent_id")?,
                created_at: row.get("created_at")?,
            })
        })?;

        let mut folders = Vec::new();
        for folder in folder_iter {
            folders.push(folder?);
        }

        Ok(folders)
    }

    pub fn delete_by_id(db: &DatabaseConnection, id: i64) -> Result<String, Error> {
        let conn = db.get_connection();
        
        // First, move any snippets in this folder to no folder
        conn.execute(
            "UPDATE snippets SET folder_id = NULL WHERE folder_id = ?1",
            params![id]
        )?;
        
        // Delete the folder
        conn.execute("DELETE FROM snippet_folders WHERE id = ?1", params![id])?;
        
        Ok("Folder has been deleted successfully".to_string())
    }
}
