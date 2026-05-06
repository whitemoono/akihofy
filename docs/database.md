# AKIHO 数据库设计

## 概览

- **数据库**: PostgreSQL
- **ORM**: SQLAlchemy + asyncpg
- **向量存储**: ChromaDB（用于记忆检索）

## ER 图

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  characters  │     │   sessions   │     │    users     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │◄────│ character_id │     │ id (PK)      │
│ name         │     │ id (PK)      │     │ user_id      │
│ description  │     │ user_id      │     │ display_name  │
│ personality  │     │ started_at   │     │ user_type     │
│ settings     │     │ ended_at     │     │ created_at    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │              ┌────▼────┐          ┌────▼────┐
       │              │conversa-│          │user_pro-│
       │              │  tions  │          │  files  │
       │              ├─────────┤          ├─────────┤
       │              │ id(PK) │          │ id(PK)  │
       │              │session_ │          │ user_id │
       │              │ role   │          │nickname │
       │              │ content│          │relation_│
       │              │emotion │          │  level  │
       │              └─────────┘          │core_st. │
       │                                  │intimacy │
       │     ┌──────────────┐             └────┬─────┘
       │     │   memories  │                  │
       │     ├──────────────┤           ┌─────▼─────┐
       │     │ id (PK)      │           │relatn_evt │
       │     │ character_id │           ├───────────┤
       │     │ content      │           │ id (PK)   │
       │     │ memory_type  │           │ user_id   │
       │     │ importance  │           │event_type │
       │     │emotional_tag│           │ impact    │
       │     └──────────────┘           └───────────┘
       │
       │     ┌──────────────┐
       │     │state_snap-  │
       │     │   shots      │
       │     ├──────────────┤
       │     │ id (PK)      │
       └────►│ character_id │
             │ state (JSON) │
             └──────────────┘
```

## 表结构

### 1. characters（角色表）

存储 AKIHO 的基础信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(100) | 角色名称 |
| description | TEXT | 角色描述 |
| personality | JSONB | 性格配置 |
| settings | JSONB | 系统设置 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### 2. users（用户基础表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | VARCHAR(100) | 唯一标识（前端生成） |
| display_name | VARCHAR(100) | 显示名称 |
| user_type | user_type | 用户类型（owner/visitor） |
| created_at | TIMESTAMPTZ | 创建时间 |
| last_seen | TIMESTAMPTZ | 最后活跃时间 |

### 3. user_profiles（用户档案表）

存储 AKIHO 对每个用户的认知。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | VARCHAR(100) | 关联 users.user_id |
| nickname | VARCHAR(100) | AKIHO 对这个人的称呼 |
| relation_level | relation_level | 关系层级 |
| core_status | core_status | 核心用户状态 |
| intimacy_score | FLOAT | 亲密度 0-1 |
| trust_score | FLOAT | 信任度 0-1 |
| impression | TEXT | AKIHO 对这个人的印象 |
| pet_peeves | JSONB | 雷点列表 |
| preferences | JSONB | 偏好 |
| notable_traits | JSONB | 显著特征 |
| memorable_moments | JSONB | 重要时刻 |
| inside_jokes | JSONB | 梗 |
| consecutive_days | INT | 连续互动天数 |
| total_interactions | INT | 总互动次数 |
| last_interaction | TIMESTAMPTZ | 最后互动时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### 4. relationship_events（关系事件表）

记录影响关系的事件，用于判断升降级。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | VARCHAR(100) | 关联 users.user_id |
| event_type | relationship_event_type | 事件类型 |
| description | TEXT | 事件描述 |
| impact | FLOAT | 影响值（正/负） |
| created_at | TIMESTAMPTZ | 创建时间 |

### 5. memories（记忆表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| character_id | UUID | 关联 characters |
| content | TEXT | 记忆内容 |
| memory_type | VARCHAR(20) | 类型（episodic/semantic/working） |
| metadata | JSONB | 元数据 |
| importance | FLOAT | 重要性 0-1 |
| emotional_tags | TEXT[] | 情感标签 |
| consolidation_level | INT | 巩固级别 |
| retrieval_count | INT | 检索次数 |
| created_at | TIMESTAMPTZ | 创建时间 |
| accessed_at | TIMESTAMPTZ | 最后访问时间 |

### 6. sessions（会话表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| character_id | UUID | 关联 characters |
| user_id | VARCHAR(100) | 用户 ID |
| started_at | TIMESTAMPTZ | 开始时间 |
| ended_at | TIMESTAMPTZ | 结束时间 |
| metadata | JSONB | 元数据 |

### 7. conversations（对话表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| session_id | UUID | 关联 sessions |
| character_id | UUID | 关联 characters |
| role | VARCHAR(20) | 角色（user/assistant） |
| content | TEXT | 对话内容 |
| emotion_state | JSONB | 情绪状态 |
| created_at | TIMESTAMPTZ | 创建时间 |

### 8. state_snapshots（状态快照表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| character_id | UUID | 关联 characters |
| session_id | UUID | 关联 sessions |
| state | JSONB | 完整状态快照 |
| created_at | TIMESTAMPTZ | 创建时间 |

## 枚举类型

### user_type

```sql
CREATE TYPE user_type AS ENUM ('owner', 'visitor');
```

| 值 | 说明 |
|----|------|
| owner | 主人账号 |
| visitor | 访客账号 |

### relation_level

```sql
CREATE TYPE relation_level AS ENUM (
    'stranger',     -- 陌生人
    'acquaintance', -- 眼熟
    'friend',       -- 朋友
    'close',        -- 挚友
    'important'     -- 重要
);
```

### core_status

```sql
CREATE TYPE core_status AS ENUM (
    'devoted',      -- 全身心投入
    'stable',       -- 稳定关系
    'cooling',      -- 正在冷却
    'hurt',         -- 受伤
    'recovering'    -- 修复中
);
```

### relationship_event_type

```sql
CREATE TYPE relationship_event_type AS ENUM (
    'promised',     -- 承诺
    'broken',       -- 违背承诺
    'shared',       -- 分享私密
    'hurt',         -- 造成伤害
    'betrayed',     -- 背叛
    'supported',    -- 支持
    'forgot',       -- 遗忘
    'remembered',   -- 被记住
    'ignored',      -- 被忽视
    'appreciated'   -- 被感谢
);
```

## 索引

```sql
-- 记忆检索
CREATE INDEX idx_memories_character ON memories(character_id);
CREATE INDEX idx_memories_type ON memories(memory_type);
CREATE INDEX idx_memories_content ON memories USING gin(content gin_trgm_ops);

-- 对话查询
CREATE INDEX idx_conversations_session ON conversations(session_id);
CREATE INDEX idx_conversations_character ON conversations(character_id);

-- 快照查询
CREATE INDEX idx_snapshots_character ON state_snapshots(character_id);
CREATE INDEX idx_snapshots_session ON state_snapshots(session_id);

-- 用户查询
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_type ON users(user_type);

-- 档案查询
CREATE INDEX idx_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_profiles_level ON user_profiles(relation_level);

-- 事件查询
CREATE INDEX idx_events_user ON relationship_events(user_id);
CREATE INDEX idx_events_type ON relationship_events(event_type);
CREATE INDEX idx_events_created ON relationship_events(created_at);
```

## 初始数据

```sql
-- 创建默认角色
INSERT INTO characters (id, name, description) VALUES
    ('00000000-0000-0000-0000-000000000001', 'AKIHO', 'AI Companion')
ON CONFLICT DO NOTHING;

-- 创建默认主人账号
INSERT INTO users (user_id, display_name, user_type) VALUES
    ('owner_001', '主人', 'owner')
ON CONFLICT (user_id) DO NOTHING;

-- 创建默认主人档案
INSERT INTO user_profiles (user_id, nickname, relation_level, core_status, impression)
SELECT 'owner_001', '主人', 'important', 'stable', '我最重要的人'
WHERE EXISTS (SELECT 1 FROM users WHERE user_id = 'owner_001')
ON CONFLICT (user_id) DO NOTHING;
```

## 配置

主人账号可在 `config.json` 中配置：

```json
{
  "owner": {
    "user_id": "owner_001"
  }
}
```

## 迁移指南

### 添加新枚举类型

```sql
-- 添加新的关系层级
ALTER TYPE relation_level ADD VALUE IF NOT EXISTS 'new_level';

-- 添加新的关系事件类型
ALTER TYPE relationship_event_type ADD VALUE IF NOT EXISTS 'new_event';
```

### 添加新字段

```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS new_field VARCHAR(100);
```

---

## 状态迁移机制

### 概述

状态迁移机制用于处理系统升级时的数据结构变化，确保旧版本的状态可以正确转换为新版本。

### 迁移策略

```rust
/// 状态迁移管理器
pub struct StateMigrationManager {
    /// 当前版本
    current_version: u32,

    /// 迁移函数列表
    migrations: Vec<Box<dyn StateMigration>>,
}

impl StateMigrationManager {
    /// 从旧版本迁移到当前版本
    pub fn migrate(&self, serialized: SerializedState) -> Result<SerializedState> {
        let mut state = serialized;
        let start_version = state.version;

        while state.version < self.current_version {
            let next_version = state.version + 1;
            if let Some(migration) = self.migrations.get(state.version as usize) {
                state = migration.migrate(state)?;
                info!(
                    "Migrated state from version {} to {}",
                    state.version,
                    next_version
                );
            } else {
                return Err(MigrationError::MissingMigration(state.version));
            }
        }

        info!(
            "State migration complete: {} -> {}",
            start_version,
            self.current_version
        );
        Ok(state)
    }
}

/// 迁移 trait
pub trait StateMigration: Send + Sync {
    fn migrate(&self, state: SerializedState) -> Result<SerializedState>;
    fn target_version(&self) -> u32;
}

/// 迁移上下文
pub struct MigrationContext {
    pub from_version: u32,
    pub to_version: u32,
    pub metadata: HashMap<String, String>,
}
```

### 版本 v1 → v2 迁移示例

```rust
/// v1 到 v2 迁移：添加情绪系统字段
pub struct MigrationV1ToV2;

impl StateMigration for MigrationV1ToV2 {
    fn migrate(&self, state: SerializedState) -> Result<SerializedState> {
        let mut data: Value = serde_json::from_str(&state.data)?;

        // 旧版本没有 emotional_state 字段
        // 添加默认值
        if data.get("emotional_state").is_none() {
            let emotional_state = serde_json::json!({
                "primary": "neutral",
                "intensity": 0.0,
                "pad": {
                    "pleasure": 0.0,
                    "arousal": 0.0,
                    "dominance": 0.0
                },
                "secondary": null,
                "ambiguity": 0.0
            });
            data["emotional_state"] = emotional_state;
        }

        let new_data = serde_json::to_string(&data)?;
        Ok(SerializedState {
            version: 2,
            data: new_data,
            checksum: compute_checksum(&new_data),
            timestamp: Utc::now(),
        })
    }

    fn target_version(&self) -> u32 {
        2
    }
}
```

### 迁移执行流程

```rust
pub struct MigrationExecutor {
    manager: StateMigrationManager,
    backup_manager: BackupManager,
    validator: StateValidator,
}

impl MigrationExecutor {
    /// 执行迁移
    pub async fn execute(&self, state: SerializedState) -> Result<MigrationResult> {
        let from_version = state.version;

        // 1. 验证输入状态
        self.validator.validate(&state)?;

        // 2. 创建备份
        let backup = self.backup_manager.create_backup(&state).await?;

        // 3. 执行迁移
        let migrated = self.manager.migrate(state)?;

        // 4. 验证输出状态
        self.validator.validate(&migrated)?;

        // 5. 清理旧备份
        self.backup_manager.cleanup_old_backups()?;

        Ok(MigrationResult {
            from_version,
            to_version: migrated.version,
            backup_id: backup.id,
            success: true,
        })
    }
}
```

### 自动迁移注册

```rust
#[macro_export]
macro_rules! register_migrations {
    ($($version:expr => $migration:expr),*) => {
        pub fn build_migration_manager() -> StateMigrationManager {
            let mut migrations: Vec<Box<dyn StateMigration>> = vec![];
            $(
                migrations.push(Box::new($migration));
            )*
            StateMigrationManager {
                current_version: migrations.len() as u32,
                migrations,
            }
        }
    };
}

// 使用宏注册迁移
register_migrations!(
    1 => MigrationV1ToV2,
    2 => MigrationV2ToV3,
    3 => MigrationV3ToV4
);
```

### 数据库迁移

```sql
-- 创建迁移记录表
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
    description TEXT,
    rollback_sql TEXT
);

-- 应用迁移
INSERT INTO schema_migrations (version, description)
VALUES (1, 'Initial schema')
ON CONFLICT (version) DO NOTHING;

-- 回滚脚本示例
INSERT INTO schema_migrations (version, description, rollback_sql)
VALUES (2, 'Add emotional_state field', 'ALTER TABLE characters DROP COLUMN emotional_state')
ON CONFLICT (version) DO NOTHING;
```

### 迁移测试

```rust
#[cfg(test)]
mod migration_tests {
    #[test]
    fn test_v1_to_v2_migration() {
        let v1_state = create_v1_state();
        let migration = MigrationV1ToV2;

        let result = migration.migrate(v1_state).unwrap();

        assert_eq!(result.version, 2);
        assert!(result.data.contains("emotional_state"));
    }

    #[test]
    fn test_missing_migration() {
        let manager = StateMigrationManager::new();
        let old_state = SerializedState {
            version: 99,
            data: "{}".to_string(),
            checksum: "abc".to_string(),
            timestamp: Utc::now(),
        };

        let result = manager.migrate(old_state);
        assert!(result.is_err());
    }

    #[test]
    fn test_full_migration_chain() {
        let manager = build_migration_manager();
        let v1 = create_v1_state();

        let result = manager.migrate(v1).unwrap();

        assert_eq!(result.version, manager.current_version);
    }
}
```

### 最佳实践

1. **小步迁移**：每次只做一个改动，便于回滚
2. **向后兼容**：新代码能处理旧数据结构
3. **测试覆盖**：每个迁移都有对应的测试
4. **备份机制**：迁移前自动备份
5. **日志记录**：记录所有迁移操作
6. **可回滚**：保留回滚脚本
