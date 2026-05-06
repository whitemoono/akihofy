-- AKIHO Database Initialization Script

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create enum types
CREATE TYPE emotion_category AS ENUM (
    'neutral', 'positive', 'negative', 'mixed', 'apathetic'
);

CREATE TYPE growth_phase AS ENUM (
    'infant', 'toddler', 'child', 'adolescent', 'adult', 'sage'
);

CREATE TYPE behavior_category AS ENUM (
    'physiological', 'safety', 'belonging', 'esteem', 'self_actualization'
);

-- 用户类型枚举
CREATE TYPE user_type AS ENUM (
    'owner',    -- 主人
    'visitor'   -- 访客
);

-- 关系层级枚举
CREATE TYPE relation_level AS ENUM (
    'stranger',     -- 陌生人：从未互动
    'acquaintance', -- 眼熟：偶尔互动
    'friend',       -- 朋友：经常互动
    'close',        -- 挚友：持续互动，有共同回忆
    'important'     -- 重要：核心用户，关系深厚
);

-- 核心用户状态枚举
CREATE TYPE core_status AS ENUM (
    'devoted',      -- 全身心投入
    'stable',       -- 稳定关系
    'cooling',      -- 正在冷却
    'hurt',         -- 受伤
    'recovering'    -- 修复中
);

-- 关系事件类型枚举
CREATE TYPE relationship_event_type AS ENUM (
    'promised',      -- 承诺
    'broken',        -- 违背承诺
    'shared',        -- 分享私密
    'hurt',          -- 造成伤害
    'betrayed',      -- 背叛
    'supported',     -- 支持
    'forgot',        -- 遗忘
    'remembered',    -- 被记住
    'ignored',       -- 被忽视
    'appreciated'    -- 被感谢
);

-- Create tables

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    personality JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memories table (episodic + semantic)
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    memory_type VARCHAR(20) DEFAULT 'episodic', -- episodic, semantic, working
    metadata JSONB DEFAULT '{}',
    importance FLOAT DEFAULT 0.5,
    emotional_tags TEXT[] DEFAULT '{}',
    consolidation_level INT DEFAULT 0,
    retrieval_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for memory search
CREATE INDEX idx_memories_character ON memories(character_id);
CREATE INDEX idx_memories_type ON memories(memory_type);
CREATE INDEX idx_memories_content ON memories USING gin(content gin_trgm_ops);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    user_id VARCHAR(100),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Conversation logs
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- user, assistant
    content TEXT NOT NULL,
    emotion_state JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_session ON conversations(session_id);
CREATE INDEX idx_conversations_character ON conversations(character_id);

-- State snapshots (periodic saves)
CREATE TABLE IF NOT EXISTS state_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_snapshots_character ON state_snapshots(character_id);
CREATE INDEX idx_snapshots_session ON state_snapshots(session_id);

-- Relationships
CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    trust_score FLOAT DEFAULT 0.5,
    intimacy_score FLOAT DEFAULT 0.0,
    interaction_count INT DEFAULT 0,
    last_interaction TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(character_id, user_id)
);

-- =====================================================
-- 用户系统表
-- =====================================================

-- 用户基础表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) UNIQUE NOT NULL,  -- 前端生成的 UUID
    display_name VARCHAR(100),
    user_type user_type DEFAULT 'visitor',  -- owner, visitor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户档案表
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    nickname VARCHAR(100),  -- AKIHO 对这个人的称呼

    -- 关系层级
    relation_level relation_level DEFAULT 'stranger',

    -- 核心用户状态（只有 IMPORTANT 级别才使用）
    core_status core_status DEFAULT 'stable',

    -- 关系数据
    intimacy_score FLOAT DEFAULT 0.0,
    trust_score FLOAT DEFAULT 0.5,

    -- AKIHO 对这个人的印象
    impression TEXT,

    -- 档案数据
    pet_peeves JSONB DEFAULT '[]',       -- 雷点
    preferences JSONB DEFAULT '{}',      -- 偏好
    notable_traits JSONB DEFAULT '[]',   -- 显著特征
    memorable_moments JSONB DEFAULT '[]', -- 重要时刻
    inside_jokes JSONB DEFAULT '[]',     -- 梗

    -- 统计
    consecutive_days INT DEFAULT 0,      -- 连续互动天数
    total_interactions INT DEFAULT 0,   -- 总互动次数
    last_interaction TIMESTAMP WITH TIME ZONE,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 关系事件表（用于判断升降级）
CREATE TABLE IF NOT EXISTS relationship_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) REFERENCES users(user_id) ON DELETE CASCADE,
    event_type relationship_event_type NOT NULL,
    description TEXT,
    impact FLOAT DEFAULT 0.0,  -- 影响值，正负均可
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_profiles_level ON user_profiles(relation_level);
CREATE INDEX idx_events_user ON relationship_events(user_id);
CREATE INDEX idx_events_type ON relationship_events(event_type);
CREATE INDEX idx_events_created ON relationship_events(created_at);

-- 创建默认主人账号（可在 config 中修改 user_id）
INSERT INTO users (user_id, display_name, user_type) VALUES
    ('owner_001', '主人', 'owner')
ON CONFLICT (user_id) DO NOTHING;

-- 创建默认主人档案
INSERT INTO user_profiles (user_id, nickname, relation_level, core_status, impression)
SELECT 'owner_001', '主人', 'important', 'stable', '我最重要的人'
WHERE EXISTS (SELECT 1 FROM users WHERE user_id = 'owner_001')
ON CONFLICT (user_id) DO NOTHING;

-- Create default character
INSERT INTO characters (id, name, description) VALUES
    ('00000000-0000-0000-0000-000000000001', 'AKIHO', 'AI Companion')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 应用配置和聊天历史表
-- =====================================================

-- App config for settings persistence
CREATE TABLE IF NOT EXISTS app_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat history tables
CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL DEFAULT 'default',
    title VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT,
    emotion VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for chat tables
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
