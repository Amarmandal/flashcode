#![allow(dead_code)]
use std::{
    collections::VecDeque,
    time::{SystemTime, UNIX_EPOCH},
};

use crate::{seconds_to_days, Flashcode};

pub struct CardQueues {
    new: VecDeque<Flashcode>,
    learning: VecDeque<Flashcode>,
    review: VecDeque<Flashcode>,
}

impl CardQueues {
    fn new() -> Self {
        CardQueues {
            new: VecDeque::new(),
            learning: VecDeque::new(),
            review: VecDeque::new(),
        }
    }

    pub fn counts(&self) -> (usize, usize, usize) {
        (self.new.len(), self.learning.len(), self.review.len())
    }

    pub fn add_new_card(&mut self, card: Flashcode) {
        self.new.push_back(card);
    }

    pub fn add_learning_card(&mut self, card: Flashcode) {
        self.learning.push_back(card);
    }

    pub fn add_review_card(&mut self, card: Flashcode) {
        self.review.push_back(card);
    }
}

pub fn build_queues(cards: Vec<Flashcode>) -> CardQueues {
    let mut queues = CardQueues::new();
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backward");
    let timestamp = now.as_secs();
    let today = seconds_to_days(timestamp);

    for card in cards {
        match card.repetitions {
            0 => {
                queues.add_new_card(card);
            }
            1 => {
                queues.add_learning_card(card);
            }
            _ => {
                if card.due_date <= today {
                    queues.add_review_card(card);
                }
            }
        }
    }

    queues
        .new
        .make_contiguous()
        .sort_by_key(|card| card.repetitions);
    queues
        .learning
        .make_contiguous()
        .sort_by_key(|card| card.due_date);
    queues
        .review
        .make_contiguous()
        .sort_by_key(|card| card.due_date);

    queues
}

pub fn merge_queues(queue: CardQueues) -> Vec<Flashcode> {
    let mut merged = Vec::new();

    let mut new_iter = queue.new.into_iter();
    let mut learning_iter = queue.learning.into_iter();
    let review_iter = queue.review.into_iter();

    while let (Some(new_card), Some(learning_card)) = (new_iter.next(), learning_iter.next()) {
        merged.push(new_card);
        merged.push(learning_card);
    }

    merged.extend(new_iter);
    merged.extend(learning_iter);
    merged.extend(review_iter);
    merged
}
