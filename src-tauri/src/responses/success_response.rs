use serde::Serialize;

use crate::models::{Deck, Flashcode};

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
pub struct TodayQueuesResponse {
    pub cards: Vec<Flashcode>,
    pub new: usize,
    pub learning: usize,
    pub to_review: usize,
}

impl TodayQueuesResponse {
    pub fn new(cards: Vec<Flashcode>, new: usize, learning: usize, to_review: usize) -> Self {
        Self {
            cards,
            new,
            learning,
            to_review,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckWithCount {
    pub deck: Deck,
    pub new_count: usize,
    pub learning_count: usize,
    pub review_count: usize,
}
