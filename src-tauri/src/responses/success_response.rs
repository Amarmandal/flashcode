use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct SuccessResponse<T> {
    pub success: bool,
    pub message: String,
    pub data: T,
}

impl<T> SuccessResponse<T> {
    pub fn new(message: String, data: T) -> Self {
        SuccessResponse {
            success: true,
            message,
            data,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct StateCountResponse {
    pub new: i64,
    pub learning: i64,
    pub to_review: i64,
}

impl StateCountResponse {
    pub fn new(new: i64, learning: i64, to_review: i64) -> Self {
        Self {
            new,
            learning,
            to_review,
        }
    }
}
