pub mod episodic;

pub use episodic::{EpisodicMemory, EventType};

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStore {
    episodic: HashMap<String, EpisodicMemory>,
    semantic: HashMap<String, SemanticMemory>,
    working: WorkingMemory,
}

impl MemoryStore {
    pub fn new() -> Self {
        Self {
            episodic: HashMap::new(),
            semantic: HashMap::new(),
            working: WorkingMemory::new(),
        }
    }

    pub fn store_episodic(&mut self, memory: EpisodicMemory) -> String {
        let id = memory.id.clone();
        self.episodic.insert(id.clone(), memory);
        id
    }

    pub fn store_semantic(&mut self, memory: SemanticMemory) -> String {
        let id = memory.id.clone();
        self.semantic.insert(id.clone(), memory);
        id
    }

    pub fn get_episodic(&self, id: &str) -> Option<&EpisodicMemory> {
        self.episodic.get(id)
    }

    pub fn get_semantic(&self, id: &str) -> Option<&SemanticMemory> {
        self.semantic.get(id)
    }

    pub fn all_episodic(&self) -> impl Iterator<Item = &EpisodicMemory> {
        self.episodic.values()
    }

    pub fn search(&self, query: &str, limit: usize) -> Vec<String> {
        let query_lower = query.to_lowercase();
        self.episodic
            .values()
            .filter(|m| m.content.to_lowercase().contains(&query_lower))
            .take(limit)
            .map(|m| m.content.clone())
            .collect()
    }

    pub fn count(&self) -> usize {
        self.episodic.len()
    }

    pub fn get_recent(&self, hours: i64, limit: usize) -> Vec<String> {
        let now = chrono::Utc::now().timestamp();
        let cutoff = now - hours * 3600;
        let mut recent: Vec<_> = self.episodic
            .values()
            .filter(|m| m.start_time >= cutoff)
            .collect();
        recent.sort_by_key(|m| std::cmp::Reverse(m.start_time));
        recent.into_iter()
            .take(limit)
            .map(|m| m.content.clone())
            .collect()
    }
}

impl Default for MemoryStore {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticMemory {
    pub id: String,
    pub concept: String,
    pub definition: String,
    pub category: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkingMemory {
    pub focus: Vec<String>,
    pub context: String,
    pub max_capacity: usize,
}

impl WorkingMemory {
    pub fn new() -> Self {
        Self {
            focus: Vec::new(),
            context: String::new(),
            max_capacity: 7,
        }
    }
}

impl Default for WorkingMemory {
    fn default() -> Self {
        Self::new()
    }
}

