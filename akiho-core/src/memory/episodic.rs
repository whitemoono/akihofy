use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpisodicMemory {
    pub id: String,
    pub content: String,
    pub event_type: EventType,
    pub emotional_tags: Vec<String>,
    pub participants: Vec<String>,
    pub start_time: i64,
    pub importance: f32,
    pub consolidation_level: u8,
    pub retrieval_count: u32,
}

impl EpisodicMemory {
    pub fn new(content: String, event_type: EventType) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            content,
            event_type,
            emotional_tags: Vec::new(),
            participants: Vec::new(),
            start_time: chrono::Utc::now().timestamp(),
            importance: 0.5,
            consolidation_level: 0,
            retrieval_count: 0,
        }
    }

    pub fn add_emotional_tag(&mut self, tag: String) {
        if !self.emotional_tags.contains(&tag) {
            self.emotional_tags.push(tag);
        }
    }

    pub fn add_participant(&mut self, participant: String) {
        if !self.participants.contains(&participant) {
            self.participants.push(participant);
        }
    }

    pub fn mark_retrieved(&mut self) {
        self.retrieval_count += 1;
    }

    pub fn consolidate(&mut self) {
        if self.consolidation_level < 3 {
            self.consolidation_level += 1;
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventType {
    Conversation,
    Activity,
    Observation,
    Thought,
    Emotional,
    Goal,
}
