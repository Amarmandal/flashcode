use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub enum Answer {
    Again,
    Hard,
    Good,
    Easy,
}

#[derive(Debug)]
pub struct SM2Result {
    pub interval: u32,
    pub ease_factor: f32,
    pub repetitions: u32,
}

// Helper function to calculate the new ease factor
fn update_ease_factor(current_ease_factor: f32, quality: f32) -> f32 {
    let new_ease_factor =
        current_ease_factor + (0.1 - (5.0 - quality) * (0.08 + (5.0 - quality) * 0.02));
    ((new_ease_factor * 10000.0).round() / 10000.0).max(1.3)
}

pub fn calculate_sm2(
    previous_interval: u32,
    ease_factor: f32,
    repetitions: u32,
    feedback: Answer,
) -> SM2Result {
    let mut new_interval = previous_interval;
    let mut new_ease_factor = ease_factor;
    let mut new_repetitions = repetitions;

    // Map Answer to quality values
    let quality = match feedback {
        Answer::Again => 1.5,
        Answer::Hard => 3.0,
        Answer::Good => 4.5,
        Answer::Easy => 6.0,
    };

    // Update interval and repetitions based on feedback
    if repetitions == 0 {
        new_interval = 1;
    } else if repetitions == 1 {
        new_interval = 6;
    } else {
        new_interval = (new_interval as f32 * new_ease_factor) as u32;
    }

    match feedback {
        Answer::Again => {
            new_repetitions = 0;
            new_interval = 1;
            new_ease_factor = update_ease_factor(new_ease_factor, quality);
        }
        Answer::Hard => {
            new_repetitions += 1;
            new_interval = (new_interval as f32 * 0.8) as u32;
            new_ease_factor = update_ease_factor(new_ease_factor, quality);
        }
        Answer::Good => {
            new_repetitions += 1;
            // keep the factor unchanged
        }
        Answer::Easy => {
            new_repetitions += 1;
            new_interval = (new_interval as f32 * 1.2) as u32;
            new_ease_factor = update_ease_factor(new_ease_factor, quality);
        }
    }

    SM2Result {
        interval: new_interval,
        ease_factor: new_ease_factor,
        repetitions: new_repetitions,
    }
}
