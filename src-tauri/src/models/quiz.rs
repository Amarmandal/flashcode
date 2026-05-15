use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Quiz {
    pub id: i64,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizQuestion {
    pub id: i64,
    pub quiz_id: i64,
    pub question_type: String,
    pub question_text: String,
    pub order_index: i64,
    pub options: Vec<QuizOption>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizOption {
    pub id: i64,
    pub question_id: i64,
    pub option_id: String,
    pub option_text: String,
    pub is_correct: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuizWithQuestions {
    pub quiz: Quiz,
    pub questions: Vec<QuizQuestion>,
}

impl Quiz {
    pub fn create(conn: &Connection, title: &str) -> Result<Self, String> {
        conn.execute("INSERT INTO quizzes (title) VALUES (?1)", params![title])
            .map_err(|e| format!("Failed to create quiz: {}", e))?;

        let id = conn.last_insert_rowid();

        Self::get(conn, id)
    }

    pub fn get(conn: &Connection, id: i64) -> Result<Self, String> {
        conn.query_row(
            "SELECT id, title, created_at, updated_at FROM quizzes WHERE id = ?1",
            params![id],
            |row| {
                Ok(Quiz {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    created_at: row.get(2)?,
                    updated_at: row.get(3)?,
                })
            },
        )
        .map_err(|e| format!("Failed to get quiz: {}", e))
    }

    pub fn get_all(conn: &Connection) -> Result<Vec<Self>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, title, created_at, updated_at FROM quizzes ORDER BY created_at DESC",
            )
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let quizzes = stmt
            .query_map([], |row| {
                Ok(Quiz {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    created_at: row.get(2)?,
                    updated_at: row.get(3)?,
                })
            })
            .map_err(|e| format!("Failed to query quizzes: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect quizzes: {}", e))?;

        Ok(quizzes)
    }

    pub fn update(&self, conn: &Connection) -> Result<String, String> {
        conn.execute(
            "UPDATE quizzes SET title = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![self.title, self.id],
        )
        .map_err(|e| format!("Failed to update quiz: {}", e))?;

        Ok("Quiz updated successfully".to_string())
    }

    pub fn delete(conn: &Connection, id: i64) -> Result<String, String> {
        conn.execute("DELETE FROM quizzes WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete quiz: {}", e))?;

        Ok("Quiz deleted successfully".to_string())
    }
}

impl QuizQuestion {
    pub fn create(
        conn: &Connection,
        quiz_id: i64,
        question_type: &str,
        question_text: &str,
        order_index: i64,
    ) -> Result<Self, String> {
        conn.execute(
            "INSERT INTO quiz_questions (quiz_id, question_type, question_text, order_index) VALUES (?1, ?2, ?3, ?4)",
            params![quiz_id, question_type, question_text, order_index],
        )
        .map_err(|e| format!("Failed to create question: {}", e))?;

        let id = conn.last_insert_rowid();

        Self::get(conn, id)
    }

    pub fn get(conn: &Connection, id: i64) -> Result<Self, String> {
        let question = conn
            .query_row(
                "SELECT id, quiz_id, question_type, question_text, order_index FROM quiz_questions WHERE id = ?1",
                params![id],
                |row| {
                    Ok(QuizQuestion {
                        id: row.get(0)?,
                        quiz_id: row.get(1)?,
                        question_type: row.get(2)?,
                        question_text: row.get(3)?,
                        order_index: row.get(4)?,
                        options: Vec::new(),
                    })
                },
            )
            .map_err(|e| format!("Failed to get question: {}", e))?;

        let options = QuizOption::get_by_question_id(conn, question.id)?;

        Ok(QuizQuestion {
            options,
            ..question
        })
    }

    pub fn get_by_quiz_id(conn: &Connection, quiz_id: i64) -> Result<Vec<Self>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, quiz_id, question_type, question_text, order_index
                 FROM quiz_questions
                 WHERE quiz_id = ?1
                 ORDER BY order_index ASC",
            )
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let questions = stmt
            .query_map(params![quiz_id], |row| {
                Ok(QuizQuestion {
                    id: row.get(0)?,
                    quiz_id: row.get(1)?,
                    question_type: row.get(2)?,
                    question_text: row.get(3)?,
                    order_index: row.get(4)?,
                    options: Vec::new(),
                })
            })
            .map_err(|e| format!("Failed to query questions: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect questions: {}", e))?;

        let mut questions_with_options = Vec::new();
        for question in questions {
            let options = QuizOption::get_by_question_id(conn, question.id)?;
            questions_with_options.push(QuizQuestion {
                options,
                ..question
            });
        }

        Ok(questions_with_options)
    }

    pub fn delete(conn: &Connection, id: i64) -> Result<String, String> {
        conn.execute("DELETE FROM quiz_questions WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete question: {}", e))?;

        Ok("Question deleted successfully".to_string())
    }
}

impl QuizOption {
    pub fn create(
        conn: &Connection,
        question_id: i64,
        option_id: &str,
        option_text: &str,
        is_correct: bool,
    ) -> Result<Self, String> {
        conn.execute(
            "INSERT INTO quiz_options (question_id, option_id, option_text, is_correct) VALUES (?1, ?2, ?3, ?4)",
            params![question_id, option_id, option_text, is_correct],
        )
        .map_err(|e| format!("Failed to create option: {}", e))?;

        let id = conn.last_insert_rowid();

        Self::get(conn, id)
    }

    pub fn get(conn: &Connection, id: i64) -> Result<Self, String> {
        conn.query_row(
            "SELECT id, question_id, option_id, option_text, is_correct FROM quiz_options WHERE id = ?1",
            params![id],
            |row| {
                Ok(QuizOption {
                    id: row.get(0)?,
                    question_id: row.get(1)?,
                    option_id: row.get(2)?,
                    option_text: row.get(3)?,
                    is_correct: row.get(4)?,
                })
            },
        )
        .map_err(|e| format!("Failed to get option: {}", e))
    }

    pub fn get_by_question_id(conn: &Connection, question_id: i64) -> Result<Vec<Self>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, question_id, option_id, option_text, is_correct
                 FROM quiz_options
                 WHERE question_id = ?1
                 ORDER BY id ASC",
            )
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let options = stmt
            .query_map(params![question_id], |row| {
                Ok(QuizOption {
                    id: row.get(0)?,
                    question_id: row.get(1)?,
                    option_id: row.get(2)?,
                    option_text: row.get(3)?,
                    is_correct: row.get(4)?,
                })
            })
            .map_err(|e| format!("Failed to query options: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect options: {}", e))?;

        Ok(options)
    }

    pub fn delete_by_question_id(conn: &Connection, question_id: i64) -> Result<String, String> {
        conn.execute(
            "DELETE FROM quiz_options WHERE question_id = ?1",
            params![question_id],
        )
        .map_err(|e| format!("Failed to delete options: {}", e))?;

        Ok("Options deleted successfully".to_string())
    }
}
