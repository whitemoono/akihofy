# AKIHO Docker 部署指南

## 快速启动

```bash
# 1. 复制环境变量配置
cp .env.example .env

# 2. 编辑 .env，填入你的 API keys
# DEEPSEEK_API_KEY=your_key_here

# 3. 一键启动所有服务
docker-compose up -d

# 4. 查看服务状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f app
```

## 访问地址

| 服务 | 地址 |
|------|------|
| 前端 (开发) | http://localhost:5173 |
| API 服务 | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## 服务说明

### app (后端服务)
- FastAPI 应用
- 端口: 8000
- 依赖: PostgreSQL, Redis

### frontend (前端开发服务器)
- Vite 开发服务器
- 端口: 5173
- 热重载启用

### postgres (数据库)
- PostgreSQL 16
- 端口: 5432
- 默认用户: akiho / akiho_secret

### redis (缓存)
- Redis 7
- 端口: 6379
- 持久化启用

## 常用命令

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（清空数据）
docker-compose down -v

# 重启服务
docker-compose restart app

# 进入后端容器
docker-compose exec app bash

# 进入数据库
docker-compose exec postgres psql -U akiho -d akiho

# 查看服务状态
docker-compose ps

# 重新构建镜像
docker-compose build --no-cache
```

## 生产部署

对于生产环境，建议：

1. 修改 `.env` 中的 `DEBUG=false`
2. 设置强密码替换默认密码
3. 配置 HTTPS 反向代理 (nginx)
4. 考虑使用外部托管数据库

## 故障排除

### 端口冲突
如果端口已被占用，修改 `docker-compose.yml` 中的端口映射。

### 数据库连接失败
检查 PostgreSQL 是否健康：
```bash
docker-compose ps postgres
docker-compose logs postgres
```

### 前端无法连接后端
检查代理配置和环境变量：
```bash
docker-compose exec frontend env | grep VITE
```
