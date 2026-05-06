pub mod error;

pub mod emotion;
pub mod behavior;
pub mod memory;

pub mod body;
pub mod growth;
pub mod cognition;
pub mod relationship;
pub mod autonomous;

pub use error::{AkihoError, Result};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemState {
    pub energy: f32,
    pub emotion: emotion::PADState,
    pub fatigue: f32,
    pub attention: f32,
    pub timestamp: i64,
}

impl Default for SystemState {
    fn default() -> Self {
        Self {
            energy: 1.0,
            emotion: emotion::PADState::neutral(),
            fatigue: 0.0,
            attention: 1.0,
            timestamp: chrono::Utc::now().timestamp(),
        }
    }
}

#[cfg(feature = "python")]
pub mod python {
    use pyo3::prelude::*;
    use std::time::Duration;

    use crate::{
        body, cognition, emotion, growth, memory, autonomous, relationship,
    };
    use crate::behavior::BehaviorEngine;
    use emotion::{EmotionEngine, EmotionStimulus};
    use memory::{MemoryStore, EpisodicMemory, EventType as MemoryEventType};

    // ═══ 情绪引擎 PyO3 绑定 ═══
    #[pyclass(name = "PyEmotionEngine")]
    #[derive(Clone)]
    pub struct PyEmotionEngine(pub EmotionEngine);

    #[pymethods]
    impl PyEmotionEngine {
        #[new]
        pub fn new() -> Self {
            Self(EmotionEngine::new())
        }

        pub fn get_pad(&self) -> (f32, f32, f32) {
            let s = self.0.get_state();
            (s.pleasure, s.arousal, s.dominance)
        }

        pub fn get_category(&self) -> String {
            self.0.get_emotion_category().to_string()
        }

        pub fn process(&mut self, stimulus_type: &str, intensity: f32) {
            let stimulus = match stimulus_type {
                "positive" => EmotionStimulus::PositiveInteraction { intensity },
                "negative" => EmotionStimulus::NegativeInteraction { intensity },
                "neutral" => EmotionStimulus::NeutralMessage { intensity },
                "achieved" => EmotionStimulus::GoalAchieved { satisfaction: intensity },
                "failed" => EmotionStimulus::GoalFailed { frustration: intensity },
                "attention" => EmotionStimulus::Attention { value: intensity },
                "lonely" => EmotionStimulus::Loneliness { intensity },
                _ => return,
            };
            self.0.process_stimulus(&stimulus);
        }

        pub fn update(&mut self, delta_seconds: f32) {
            self.0.update(delta_seconds);
        }

        pub fn apply_body_impact(&mut self, energy: f32, fatigue: f32) {
            if energy < 0.2 {
                self.0.process_stimulus(&EmotionStimulus::SessionDuration { fatigue: (0.2 - energy) * 1.5 });
            }
            if fatigue > 0.7 {
                self.0.process_stimulus(&EmotionStimulus::SessionDuration { fatigue: (fatigue - 0.7) * 0.5 });
            }
        }
    }

    // ═══ 生理引擎 PyO3 绑定 ═══
    #[pyclass(name = "PyBodySystem")]
    #[derive(Clone)]
    pub struct PyBodySystem(pub body::BodySystem);

    #[pymethods]
    impl PyBodySystem {
        #[new]
        pub fn new() -> Self {
            Self(body::BodySystem::new())
        }

        pub fn perform_activity(&mut self, activity: &str) {
            self.0.perform_activity(activity);
        }

        pub fn tick(&mut self, delta: f32) {
            self.0.tick(delta);
        }

        pub fn energy(&self) -> f32 {
            self.0.energy()
        }

        pub fn fatigue(&self) -> f32 {
            self.0.fatigue()
        }

        pub fn hunger(&self) -> f32 {
            self.0.hunger()
        }

        pub fn comfort(&self) -> f32 {
            self.0.comfort()
        }

        pub fn get_pools(&self) -> (f32, f32, f32, f32) {
            (
                self.0.pools.cognitive.current,
                self.0.pools.social.current,
                self.0.pools.emotional.current,
                self.0.pools.creative.current,
            )
        }

        pub fn energy_emotion_impact(&self) -> f32 {
            self.0.energy_emotion_impact()
        }

        pub fn language_embodiment(&self) -> PyResult<Py<PyAny>> {
            let le = self.0.language_embodiment();
            Python::with_gil(|py| {
                let dict = pyo3::types::PyDict::new_bound(py);
                dict.set_item("energy_level", le.energy_level)?;
                dict.set_item("description", &le.description)?;
                dict.set_item("expression_hints", le.expression_hints.clone())?;
                Ok(dict.into())
            })
        }
    }

    // ═══ 成长引擎 PyO3 绑定 ═══
    #[pyclass(name = "PyGrowthEngine")]
    #[derive(Clone)]
    pub struct PyGrowthEngine(pub growth::GrowthEngine);

    #[pymethods]
    impl PyGrowthEngine {
        #[new]
        pub fn new() -> Self {
            Self(growth::GrowthEngine::new())
        }

        pub fn process_experience(&mut self, experience_type: &str, intensity: f32) {
            self.0.process_experience(experience_type, intensity);
        }

        pub fn tick(&mut self, delta: f32) {
            self.0.tick(delta);
        }

        pub fn phase(&self) -> String {
            self.0.profile.phase.name().to_string()
        }

        pub fn phase_progress(&self) -> f32 {
            self.0.phase_progress()
        }

        pub fn get_characteristics(&self) -> PyResult<Py<PyAny>> {
            Python::with_gil(|py| {
                let dict = pyo3::types::PyDict::new_bound(py);
                for c in &self.0.profile.characteristics {
                    dict.set_item(&c.name, c.current_value)?;
                }
                Ok(dict.into())
            })
        }

        pub fn get_profile(&self) -> PyResult<Py<PyAny>> {
            Python::with_gil(|py| {
                let dict = pyo3::types::PyDict::new_bound(py);
                dict.set_item("phase", self.0.profile.phase.name())?;
                dict.set_item("experience_count", self.0.profile.experience_count)?;

                let chars = pyo3::types::PyDict::new_bound(py);
                for c in &self.0.profile.characteristics {
                    chars.set_item(&c.name, c.current_value)?;
                }
                dict.set_item("characteristics", chars)?;
                Ok(dict.into())
            })
        }

        pub fn experience_count(&self) -> u32 {
            self.0.profile.experience_count
        }
    }

    // ═══ 认知引擎 PyO3 绑定 ═══
    #[pyclass(name = "PyCognitionEngine")]
    #[derive(Clone)]
    pub struct PyCognitionEngine(pub cognition::CognitionEngine);

    #[pymethods]
    impl PyCognitionEngine {
        #[new]
        pub fn new() -> Self {
            Self(cognition::CognitionEngine::new())
        }

        pub fn focus_on(&mut self, topic: &str) {
            self.0.attention.focus_on(topic);
        }

        pub fn current_focus(&self) -> Vec<String> {
            self.0.attention.current_focus.clone()
        }

        pub fn tick(&mut self, delta: f32) {
            self.0.tick(delta);
        }

        pub fn select_reasoning(&mut self, task: &str) -> Vec<String> {
            self.0.reasoning.select_strategy(task)
                .into_iter()
                .map(|r| r.name().to_string())
                .collect()
        }

        pub fn apply_confirmation_bias(&self, evidence: f32, aligns: bool) -> f32 {
            self.0.biases.apply_confirmation_bias(evidence, aligns)
        }

        pub fn set_growth_phase(&mut self, phase_str: &str) {
            let phase = match phase_str {
                "infant" | "婴儿期" => growth::GrowthPhase::Infant,
                "toddler" | "幼儿期" => growth::GrowthPhase::Toddler,
                "child" | "儿童期" => growth::GrowthPhase::Child,
                "adolescent" | "青春期" => growth::GrowthPhase::Adolescent,
                "adult" | "成熟期" => growth::GrowthPhase::Adult,
                "sage" | "智慧期" => growth::GrowthPhase::Sage,
                _ => return,
            };
            self.0.set_growth_phase(&phase);
        }

        pub fn refresh_attention(&mut self) {
            self.0.attention.refresh();
        }
    }

    // ═══ 关系引擎 PyO3 绑定 ═══
    #[pyclass(name = "PyRelationshipManager")]
    #[derive(Clone)]
    pub struct PyRelationshipManager(pub relationship::RelationshipManager);

    #[pymethods]
    impl PyRelationshipManager {
        #[new]
        pub fn new() -> Self {
            Self(relationship::RelationshipManager::new())
        }

        pub fn record_interaction(&mut self, user_id: &str, positivity: f32) {
            let user = self.0.get_or_create(user_id);
            user.record_interaction(positivity);
        }

        pub fn get_intimacy(&self, user_id: &str) -> f32 {
            self.0.get(user_id)
                .map(|r| r.trust.intimacy)
                .unwrap_or(0.0)
        }

        pub fn get_stage(&self, user_id: &str) -> String {
            self.0.get(user_id)
                .map(|r| r.stage.name().to_string())
                .unwrap_or_else(|| "陌生人".to_string())
        }

        pub fn get_trust(&self, user_id: &str) -> f32 {
            self.0.get(user_id)
                .map(|r| r.trust.composite_trust())
                .unwrap_or(0.0)
        }
    }

    // ═══ 自主性引擎 PyO3 绑定 ═══
    #[pyclass(name = "PyAutonomousEngine")]
    #[derive(Clone)]
    pub struct PyAutonomousEngine(pub autonomous::AutonomousEngine);

    #[pymethods]
    impl PyAutonomousEngine {
        #[new]
        pub fn new() -> Self {
            Self(autonomous::AutonomousEngine::new())
        }

        pub fn tick(&mut self, delta: f32) {
            self.0.tick(delta);
        }

        pub fn satisfy_drive(&mut self, drive_name: &str, amount: f32) {
            let drive_type = match drive_name {
                "curiosity" | "好奇心" => autonomous::DriveType::Curiosity,
                "affiliation" | "归属" => autonomous::DriveType::Affiliation,
                "competence" | "能力" => autonomous::DriveType::Competence,
                "autonomy" | "自主" => autonomous::DriveType::Autonomy,
                "meaning" | "意义" => autonomous::DriveType::Meaning,
                _ => return,
            };
            self.0.drives.satisfy(drive_type, amount);
        }

        pub fn get_drive_tensions(&self) -> PyResult<Py<PyAny>> {
            Python::with_gil(|py| {
                let dict = pyo3::types::PyDict::new_bound(py);
                for drive in &self.0.drives.drives {
                    dict.set_item(drive.drive_type.name(), drive.tension)?;
                }
                Ok(dict.into())
            })
        }

        pub fn dominant_drive(&self) -> Option<String> {
            self.0.drives.dominant_drive().map(|d| d.name().to_string())
        }

        pub fn think(&mut self, curiosity_queue_len: usize) -> PyResult<Py<PyAny>> {
            let action = self.0.think(curiosity_queue_len);
            Python::with_gil(|py| {
                let dict = pyo3::types::PyDict::new_bound(py);
                match action {
                    autonomous::AutonomousAction::Idle => {
                        dict.set_item("action", "idle")?;
                    }
                    autonomous::AutonomousAction::SearchWeb { query } => {
                        dict.set_item("action", "search_web")?;
                        dict.set_item("query", query)?;
                    }
                    autonomous::AutonomousAction::InitiateConversation { topic } => {
                        dict.set_item("action", "initiate_conversation")?;
                        dict.set_item("topic", topic)?;
                    }
                    autonomous::AutonomousAction::ReflectOnMemory => {
                        dict.set_item("action", "reflect")?;
                    }
                    autonomous::AutonomousAction::BrowseTwitter => {
                        dict.set_item("action", "browse_twitter")?;
                    }
                    _ => {
                        dict.set_item("action", "idle")?;
                    }
                }
                Ok(dict.into())
            })
        }

        pub fn generate_intent(&mut self, drive_name: &str, description: &str, strength: f32) -> String {
            let drive_type = match drive_name {
                "curiosity" => autonomous::DriveType::Curiosity,
                "affiliation" => autonomous::DriveType::Affiliation,
                "competence" => autonomous::DriveType::Competence,
                "autonomy" => autonomous::DriveType::Autonomy,
                "meaning" => autonomous::DriveType::Meaning,
                _ => autonomous::DriveType::Curiosity,
            };
            let intent = self.0.intents.generate_intent(drive_type, description, strength);
            intent.id.clone()
        }

        pub fn commit_intent(&mut self, intent_id: &str) {
            self.0.intents.commit(intent_id);
        }

        pub fn complete_intent(&mut self, intent_id: &str) {
            self.0.intents.complete(intent_id);
        }
    }

    // ═══ 记忆系统 PyO3 绑定 ═══
    #[pyclass(name = "PyMemoryStore")]
    #[derive(Clone)]
    pub struct PyMemoryStore(pub MemoryStore);

    #[pymethods]
    impl PyMemoryStore {
        #[new]
        pub fn new() -> Self {
            Self(MemoryStore::new())
        }

        pub fn store_episodic(&mut self, content: String) -> String {
            let memory = EpisodicMemory::new(content, MemoryEventType::Thought);
            self.0.store_episodic(memory)
        }

        pub fn search(&self, query: &str, limit: usize) -> Vec<String> {
            self.0.search(query, limit)
        }

        pub fn get_recent(&self, hours: i64, limit: usize) -> Vec<String> {
            self.0.get_recent(hours, limit)
        }

        pub fn count(&self) -> usize {
            self.0.count()
        }
    }

    // ═══ 行为系统 PyO3 绑定 ═══
    #[pyclass(name = "PyBehaviorEngine")]
    #[derive(Clone)]
    pub struct PyBehaviorEngine(pub BehaviorEngine);

    #[pymethods]
    impl PyBehaviorEngine {
        #[new]
        pub fn new() -> Self {
            Self(BehaviorEngine::new())
        }

        pub fn tick(&mut self, delta: f32) {
            self.0.update(Duration::from_secs_f32(delta));
        }

        pub fn decide_next_behavior(&mut self, energy: f32, pleasure: f32, fatigue: f32) -> Option<String> {
            let state = crate::SystemState {
                energy,
                emotion: crate::emotion::PADState {
                    pleasure,
                    arousal: 0.0,
                    dominance: 0.0,
                },
                fatigue,
                attention: 1.0,
                timestamp: chrono::Utc::now().timestamp(),
            };
            self.0.decide_next_behavior(&state).map(|b| b.id)
        }

        pub fn start_behavior(&mut self, behavior_id: &str) -> bool {
            if let Some(behavior) = self.0.get_registry().get(behavior_id).cloned() {
                self.0.start_behavior(behavior);
                true
            } else {
                false
            }
        }
    }

    // ═══ 聚合引擎 PyO3 ═══
    #[pyclass(name = "PyAkihoCore")]
    #[derive(Clone)]
    pub struct PyAkihoCore {
        #[pyo3(get)]
        pub emotion: PyEmotionEngine,
        #[pyo3(get)]
        pub body: PyBodySystem,
        #[pyo3(get)]
        pub growth: PyGrowthEngine,
        #[pyo3(get)]
        pub cognition: PyCognitionEngine,
        #[pyo3(get)]
        pub relationship: PyRelationshipManager,
        #[pyo3(get)]
        pub autonomous: PyAutonomousEngine,
        #[pyo3(get)]
        pub memory: PyMemoryStore,
        #[pyo3(get)]
        pub behavior: PyBehaviorEngine,
    }

    #[pymethods]
    impl PyAkihoCore {
        #[new]
        pub fn new() -> Self {
            Self {
                emotion: PyEmotionEngine::new(),
                body: PyBodySystem::new(),
                growth: PyGrowthEngine::new(),
                cognition: PyCognitionEngine::new(),
                relationship: PyRelationshipManager::new(),
                autonomous: PyAutonomousEngine::new(),
                memory: PyMemoryStore::new(),
                behavior: PyBehaviorEngine::new(),
            }
        }

        /// 全局 tick（更新所有子系统）
        pub fn tick(&mut self, delta: f32) -> PyResult<Py<PyAny>> {
            self.emotion.update(delta);
            self.body.tick(delta);
            self.growth.tick(delta);
            self.cognition.tick(delta);
            self.autonomous.tick(delta);
            self.behavior.tick(delta);

            // 跨系统桥接：身体 → 情绪
            let energy = self.body.energy();
            let fatigue = self.body.fatigue();
            self.emotion.apply_body_impact(energy, fatigue);

            Python::with_gil(|py| {
                let dict = pyo3::types::PyDict::new_bound(py);
                let (p, a, d) = self.emotion.get_pad();
                dict.set_item("pleasure", p)?;
                dict.set_item("arousal", a)?;
                dict.set_item("dominance", d)?;
                dict.set_item("category", self.emotion.get_category())?;
                dict.set_item("energy", energy)?;
                dict.set_item("fatigue", fatigue)?;
                dict.set_item("phase", self.growth.phase())?;
                Ok(dict.into())
            })
        }
    }
}
