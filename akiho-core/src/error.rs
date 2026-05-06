use thiserror::Error;

#[derive(Error, Debug)]
pub enum AkihoError {
    #[error("Invalid state: {0}")]
    InvalidState(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Parse error: {0}")]
    ParseError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Engine error: {0}")]
    EngineError(String),
}

impl From<serde_json::Error> for AkihoError {
    fn from(err: serde_json::Error) -> Self {
        AkihoError::SerializationError(err.to_string())
    }
}

#[cfg(feature = "python")]
impl From<AkihoError> for pyo3::PyErr {
    fn from(err: AkihoError) -> Self {
        pyo3::exceptions::PyRuntimeError::new_err(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AkihoError>;
