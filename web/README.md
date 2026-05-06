# AKIHO Web Interface

动漫风格的虚拟生命体网页界面，支持 Live2D 角色展示和语音回复功能。

## 功能特性

- **Live2D 角色展示** - 支持加载 Cubism 模型，带有表情和动作切换
- **对话系统** - 动漫风格的聊天气泡，支持打字机效果
- **语音回复** - 基于 Edge TTS 的高质量中文语音合成
- **唇形同步** - 说话时角色嘴巴同步动画
- **念头气泡** - 随机显示角色的内心想法
- **情绪可视化** - 状态栏显示当前情绪和能量
- **设置面板** - 可调整语音、语速、音调等参数

## 目录结构

```
AKIHO/
├── web/                      # 前端文件
│   ├── index.html            # 主页面
│   ├── style.css             # 动漫风格样式
│   ├── app.js                # 主逻辑
│   ├── live2d/               # Live2D 相关
│   │   └── Live2DManager.js  # 模型管理器
│   └── assets/               # 静态资源
│       ├── models/            # Live2D 模型文件
│       └── audio/            # 缓存音频
├── main.py                   # AKIHO 后端（对话引擎）
├── ts_server.py              # TTS 语音服务
├── web_server.py             # 前端静态服务器
└── requirements.txt         # Python 依赖
```

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动服务

需要启动三个服务（分别在不同的终端）：

**终端 1 - AKIHO 对话后端**（如果已有可跳过）：
```bash
python main.py
```

**终端 2 - TTS 语音服务**：
```bash
python ts_server.py
```

**终端 3 - 前端服务器**：
```bash
python web_server.py
```

### 3. 访问页面

打开浏览器访问：`http://localhost:8000`

## 添加 Live2D 模型

将你的 Live2D 模型文件放入 `web/assets/models/` 目录，然后修改 `web/app.js` 中的配置：

```javascript
const CONFIG = {
    LIVE2D: {
        defaultModel: 'your_model/your_model.model3.json'
    }
};
```

### 推荐获取免费模型

1. [Live2D 官方示例](https://www.live2d.com/en/learn/sample/) - 提供免费学习用模型
2. Live2D 社区论坛和 Discord 群组

## TTS 语音选项

支持的语音：

| ID | 名称 | 描述 |
|----|------|------|
| yixia | 小艺 | 活泼女声 |
| xiaobai | 小白 | 温柔女声 |
| yunjian | 云健 | 活泼男声 |
| yunxi | 云希 | 青年男声 |
| xiaoxiao | 晓晓 | 新闻女声 |
| yuyang | 宇航 | 新闻男声 |

## API 接口

### TTS 接口

```
POST /tts
Content-Type: application/json

{
    "text": "要转换的文本",
    "voice": "zh-CN-XiaobaiNeural",
    "rate": "+0%",
    "pitch": "+0Hz"
}
```

响应：
```json
{
    "code": 0,
    "data": {
        "audio_url": "/audio/xxx.mp3",
        "duration": 3.5
    }
}
```

## 自定义样式

在 `web/style.css` 中可以修改：

- **主题色** - 修改 `:root` 中的 `--primary-color`
- **背景色** - 修改 `--bg-dark`, `--bg-medium` 等
- **情绪颜色** - 修改 `--mood-happy`, `--mood-sad` 等

## 技术栈

- **前端**: HTML5 + CSS3 + ES6+ JavaScript
- **Live2D**: Cubism SDK for Web
- **后端**: FastAPI + Python
- **TTS**: Edge TTS (微软)

## 许可证

MIT License
