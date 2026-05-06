/**
 * AKIHO - Live2D Web 界面主逻辑
 */

import { Live2DManager, SimpleLive2DRenderer } from './live2d/Live2DManager.js';

// ========================================
// 配置
// ========================================

const CONFIG = {
    API_BASE: 'http://localhost:8000/api/v1',
    TTS_ENDPOINT: 'http://localhost:8001/tts',
    WEB_BASE: 'http://localhost:8000',
    LIVE2D: {
        modelPath: 'assets/models/',
        defaultModel: 'hibiki/hibiki.model3.json'
    },
    THOUGHTS: {
        interval: 15000,
        displayDuration: 8000
    }
};

// ========================================
// 状态管理
// ========================================

const state = {
    userId: `user_${Date.now()}`,
    isTyping: false,
    isSpeaking: false,
    settings: {
        voice: 'zh-CN-XiaobaiNeural',
        rate: 1.0,
        pitch: 1.0,
        enableTTS: true,
        showThought: true
    }
};

// ========================================
// DOM 元素
// ========================================

const elements = {
    // Live2D
    live2dCanvas: document.getElementById('live2dCanvas'),
    live2dContainer: document.getElementById('live2dContainer'),
    live2dLoading: document.getElementById('live2dLoading'),

    // 状态栏
    moodIndicator: document.getElementById('moodIndicator'),
    moodText: document.getElementById('moodText'),
    energyFill: document.getElementById('energyFill'),
    energyText: document.getElementById('energyText'),

    // 念头气泡
    thoughtBubble: document.getElementById('thoughtBubble'),
    thoughtContent: document.getElementById('thoughtContent'),

    // 对话
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    btnSend: document.getElementById('btnSend'),
    btnVoice: document.getElementById('btnVoice'),

    // 音频可视化
    audioVisualizer: document.getElementById('audioVisualizer'),

    // 设置弹窗
    settingsModal: document.getElementById('settingsModal'),
    btnSettings: document.getElementById('btnSettings'),
    btnCloseSettings: document.getElementById('btnCloseSettings'),
    voiceSelect: document.getElementById('voiceSelect'),
    speechRate: document.getElementById('speechRate'),
    speechRateValue: document.getElementById('speechRateValue'),
    speechPitch: document.getElementById('speechPitch'),
    speechPitchValue: document.getElementById('speechPitchValue'),
    enableTTS: document.getElementById('enableTTS'),
    showThought: document.getElementById('showThought'),

    // Toast
    toast: document.getElementById('toast')
};

// ========================================
// Live2D 管理器
// ========================================

let live2dManager = null;
let simpleRenderer = null;

async function initLive2D() {
    try {
        live2dManager = new Live2DManager(elements.live2dCanvas);
        await live2dManager.loadModel(CONFIG.LIVE2D.defaultModel);
        elements.live2dLoading.classList.add('hidden');

        // 播放初始动作
        live2dManager.playMotion('idle');

        console.log('Live2D loaded successfully');
    } catch (error) {
        console.warn('Live2D load failed, using simple renderer:', error);
        initFallbackCanvas();
    }
}

function initFallbackCanvas() {
    // 简单的动画角色（当没有模型时）
    simpleRenderer = new SimpleLive2DRenderer(elements.live2dCanvas);
    elements.live2dLoading.classList.add('hidden');
}

// 唇形同步控制
function setLipSync(isActive) {
    if (simpleRenderer) {
        simpleRenderer.setTalking(isActive);
    }
}

// ========================================
// 对话系统
// ========================================

async function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message || state.isTyping) return;

    // 添加用户消息
    addMessage('user', message);
    elements.messageInput.value = '';
    autoResizeTextarea();

    // 显示正在输入状态
    state.isTyping = true;
    const typingBubble = addMessage('akiho', '', true);

    try {
        const response = await fetch(`${CONFIG.API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                user_id: state.userId
            })
        });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const reply = data.data?.reply || '...嗯？';

        // 移除打字状态，显示回复
        typingBubble.remove();
        const messageEl = addMessage('akiho', reply);

        // 更新状态
        if (data.data?.mood) {
            updateMood(data.data.mood);
        }
        if (data.data?.energy) {
            updateEnergy(data.data.energy);
        }
        if (data.data?.thought && state.settings.showThought) {
            showThought(data.data.thought);
        }

        // 播放语音
        if (state.settings.enableTTS) {
            await playTTS(reply);
        }

    } catch (error) {
        console.error('Chat error:', error);
        typingBubble.remove();

        // 模拟回复（当API不可用时）
        const fallbackReplies = [
            '嗯... 让我想想...',
            '这样啊，我明白了。',
            '嗯嗯，继续说？',
            '有意思...然后呢？'
        ];
        const reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
        addMessage('akiho', reply);
        showToast('使用离线模式');
    }

    state.isTyping = false;
}

function addMessage(sender, content, isTyping = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${sender}`;

    const avatarIcon = sender === 'akiho' ? '*' : 'U';

    messageDiv.innerHTML = `
        <div class="message-avatar">
            <div class="avatar-icon">${avatarIcon}</div>
        </div>
        <div class="message-content">
            <div class="message-bubble ${isTyping ? 'typing' : ''}">${content}</div>
            <div class="message-time">${formatTime(new Date())}</div>
        </div>
    `;

    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    return messageDiv;
}

function formatTime(date) {
    return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function autoResizeTextarea() {
    const textarea = elements.messageInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// ========================================
// TTS 语音合成
// ========================================

async function playTTS(text) {
    if (!state.settings.enableTTS) return;

    state.isSpeaking = true;
    elements.audioVisualizer.classList.add('active');
    setLipSync(true);

    try {
        // 调用后端TTS API
        const response = await fetch(CONFIG.TTS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                voice: state.settings.voice,
                rate: `+${(state.settings.rate - 1) * 100}%`,
                pitch: `+${(state.settings.pitch - 1) * 50}Hz`
            })
        });

        if (!response.ok) throw new Error('TTS request failed');

        const data = await response.json();
        const audioUrl = CONFIG.WEB_BASE + data.data?.audio_url;

        if (audioUrl) {
            const audio = new Audio(audioUrl);
            await audio.play();

            audio.onended = () => {
                state.isSpeaking = false;
                elements.audioVisualizer.classList.remove('active');
                setLipSync(false);
            };

            audio.onerror = () => {
                state.isSpeaking = false;
                elements.audioVisualizer.classList.remove('active');
                setLipSync(false);
            };
        } else {
            // 使用 Web Speech API 作为后备
            await speakWithWebSpeech(text);
        }

    } catch (error) {
        console.warn('TTS error, using Web Speech API:', error);
        setLipSync(false);
        await speakWithWebSpeech(text);
    }

    state.isSpeaking = false;
    elements.audioVisualizer.classList.remove('active');
    setLipSync(false);
}

function speakWithWebSpeech(text) {
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = state.settings.rate;
        utterance.pitch = state.settings.pitch;

        // 尝试匹配选中的语音
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.lang.includes('zh'));
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onend = resolve;
        utterance.onerror = resolve;

        speechSynthesis.speak(utterance);
    });
}

// ========================================
// 念头系统
// ========================================

let thoughtInterval = null;

async function fetchThought() {
    if (!state.settings.showThought) return;

    try {
        const response = await fetch(`${CONFIG.API_BASE}/thought`);
        if (!response.ok) throw new Error('Failed to fetch thought');

        const data = await response.json();
        if (data.data?.thought) {
            showThought(data.data.thought, 5000);
        }
    } catch (error) {
        // 使用默认念头
        const defaultThoughts = [
            '今天的天气...还不错呢',
            '在想什么呢...',
            '有点无聊...',
            '外面的声音...',
            '嗯...',
            '突然想吃点甜的'
        ];
        const thought = defaultThoughts[Math.floor(Math.random() * defaultThoughts.length)];
        showThought(thought, 5000);
    }
}

function showThought(content, duration = CONFIG.THOUGHTS.displayDuration) {
    elements.thoughtContent.textContent = content;
    elements.thoughtBubble.classList.add('visible');

    setTimeout(() => {
        elements.thoughtBubble.classList.remove('visible');
    }, duration);
}

function startThoughtSystem() {
    // 立即显示一个念头
    setTimeout(fetchThought, 3000);

    // 定时获取新念头
    thoughtInterval = setInterval(fetchThought, CONFIG.THOUGHTS.interval);
}

// ========================================
// 状态更新
// ========================================

const moodIcons = {
    happy: '*',
    sad: '~',
    angry: '!',
    neutral: '-',
    excited: '+',
    sleepy: 'z',
    thinking: '?'
};

function updateMood(mood) {
    const icon = moodIcons[mood] || moodIcons.neutral;
    elements.moodIndicator.querySelector('.mood-icon').textContent = icon;
    elements.moodText.textContent = getMoodText(mood);

    // Live2D 表情切换
    if (live2dManager) {
        live2dManager.setExpression(mood);
    }
}

function getMoodText(mood) {
    const texts = {
        happy: '开心',
        sad: '难过',
        angry: '生气',
        neutral: '平静',
        excited: '兴奋',
        sleepy: '困倦',
        thinking: '思考中'
    };
    return texts[mood] || '平静';
}

function updateEnergy(value) {
    const percentage = Math.max(0, Math.min(100, value * 100));
    elements.energyFill.style.width = `${percentage}%`;
    elements.energyText.textContent = `能量 ${Math.round(percentage)}%`;
}

// ========================================
// 设置管理
// ========================================

function initSettings() {
    // 加载本地保存的设置
    const saved = localStorage.getItem('akiho_settings');
    if (saved) {
        Object.assign(state.settings, JSON.parse(saved));
    }

    // 应用设置到UI
    elements.voiceSelect.value = state.settings.voice;
    elements.speechRate.value = state.settings.rate;
    elements.speechRateValue.textContent = `${state.settings.rate.toFixed(1)}x`;
    elements.speechPitch.value = state.settings.pitch;
    elements.speechPitchValue.textContent = state.settings.pitch.toFixed(1);
    elements.enableTTS.checked = state.settings.enableTTS;
    elements.showThought.checked = state.settings.showThought;
}

// 从后端获取 LLM 配置
async function fetchLLMConfig() {
    try {
        const res = await fetch(`${CONFIG.WEB_BASE}/api/config/api`);
        const data = await res.json();
        if (data.code === 0) {
            state.settings.llmProvider = data.data.provider || 'deepseek';
            state.settings.llmApiKey = data.data.api_key || '';
            state.settings.llmModel = data.data.model || '';
            return data.data;
        }
    } catch (e) {
        console.warn('Failed to fetch LLM config:', e);
    }
    return null;
}

// 更新设置UI显示LLM配置
function updateLLMSettingsUI(config) {
    const llmStatusEl = document.getElementById('llmStatus');
    if (llmStatusEl && config) {
        const modelName = config.model || '未选择';
        const maskedKey = config.masked_key || '';
        llmStatusEl.textContent = `${config.provider} | ${modelName} | ${maskedKey}`;
        llmStatusEl.classList.remove('text-red-500');
        llmStatusEl.classList.add('text-green-500');
    }
}

function saveSettings() {
    localStorage.setItem('akiho_settings', JSON.stringify(state.settings));
}

function openSettings() {
    elements.settingsModal.classList.add('active');
}

function closeSettings() {
    elements.settingsModal.classList.remove('active');
    saveSettings();
}

// ========================================
// Toast 提示
// ========================================

function showToast(message) {
    elements.toast.querySelector('.toast-message').textContent = message;
    elements.toast.classList.add('visible');

    setTimeout(() => {
        elements.toast.classList.remove('visible');
    }, 2000);
}

// ========================================
// 事件绑定
// ========================================

function bindEvents() {
    // 发送消息
    elements.btnSend.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    elements.messageInput.addEventListener('input', autoResizeTextarea);

    // 语音输入（预留）
    elements.btnVoice.addEventListener('click', () => {
        showToast('语音输入功能开发中...');
    });

    // 设置弹窗
    elements.btnSettings.addEventListener('click', openSettings);
    elements.btnCloseSettings.addEventListener('click', closeSettings);
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) closeSettings();
    });

    // 设置项变更
    elements.voiceSelect.addEventListener('change', (e) => {
        state.settings.voice = e.target.value;
    });

    elements.speechRate.addEventListener('input', (e) => {
        state.settings.rate = parseFloat(e.target.value);
        elements.speechRateValue.textContent = `${state.settings.rate.toFixed(1)}x`;
    });

    elements.speechPitch.addEventListener('input', (e) => {
        state.settings.pitch = parseFloat(e.target.value);
        elements.speechPitchValue.textContent = state.settings.pitch.toFixed(1);
    });

    elements.enableTTS.addEventListener('change', (e) => {
        state.settings.enableTTS = e.target.checked;
    });

    elements.showThought.addEventListener('change', (e) => {
        state.settings.showThought = e.target.checked;
    });

    // 语音列表加载
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = () => {
            // Web Speech API 语音列表已加载
        };
    }

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSettings();
        }
    });
}

// ========================================
// 初始化
// ========================================

async function init() {
    console.log('AKIHO Web Interface initializing...');

    // 初始化设置
    initSettings();

    // 获取 LLM 配置并更新 UI
    const llmConfig = await fetchLLMConfig();
    updateLLMSettingsUI(llmConfig);

    // 初始化 Live2D
    await initLive2D();

    // 绑定事件
    bindEvents();

    // 启动念头系统
    startThoughtSystem();

    // 设置初始能量
    updateEnergy(0.85);

    console.log('AKIHO Web Interface ready!');
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);
