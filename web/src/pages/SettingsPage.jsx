import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLive2DSettingsShared } from '../components/Character/SettingsPanel'
import { ParticleImageUploader } from '../components/Character/ParticleViewer'
import {
  Settings, Palette, MessageCircle, Mic, Globe, Sparkles, RotateCcw,
  Brain, Database, Server, Zap, ChevronRight, Check, AlertCircle, ExternalLink,
  Loader2, RefreshCw, Plus, Trash2, Copy, Edit3, CheckCheck, X, GripVertical, Search
} from 'lucide-react'

// 默认模型预设
const DEFAULT_LLM_PRESETS = [
  {
    id: 'default-1',
    name: 'DeepSeek 智能助手',
    provider: 'deepseek',
    base_url: 'https://api.deepseek.com/v1',
    model_id: 'deepseek-chat',
    api_key: '',
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 0.9,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    stop: []
  }
]

const DEFAULT_EMB_PRESETS = [
  {
    id: 'default-1',
    name: 'BGE 向量库',
    provider: 'siliconflow',
    base_url: 'https://api.siliconflow.cn/v1',
    model_id: 'BAAI/bge-large-zh-v1.5',
    api_key: '',
    dimension: 1024
  }
]

// LLM 提供商配置
const LLM_PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] },
  { id: 'mimo', name: '小米 MiMo', baseUrl: 'https://api.siliconflow.cn/v1', models: ['Xiaomi/MiMo-7B-RL', 'Xiaomi/MiMo-7B-SFT'] },
  { id: 'siliconflow', name: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1', models: ['Qwen/Qwen2.5-14B-Instruct', 'deepseek-ai/DeepSeek-V2.5', 'THUDM/glm-4-9b-chat'] },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4'] },
  { id: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'] },
  { id: 'zhipu', name: '智谱 AI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4', 'glm-4-flash', 'glm-4-plus'] },
  { id: 'dashscope', name: '阿里云百炼', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-plus', 'qwen-turbo', 'qwen-long', 'qwen-max'] },
  { id: 'custom', name: '自定义', baseUrl: '', models: [] }
]

// 向量提供商配置
const EMBEDDING_PROVIDERS = [
  { id: 'dashscope', name: '阿里云百炼', baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding', models: ['text-embedding-v3', 'text-embedding-v4'] },
  { id: 'doubao', name: '豆包 (ByteDance)', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/embeddings', models: ['doubao-embedding-vision', 'doubao-embedding', 'doubao-embedding-large'] },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: ['text-embedding-3-small', 'text-embedding-3-large'] },
  { id: 'siliconflow', name: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1', models: ['BAAI/bge-large-zh-v1.5', 'netease-youdao/bce-embedding-base_v1'] },
  { id: 'zhipu', name: '智谱 AI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['embedding-3', 'embedding-3-flash'] },
  { id: 'local', name: '本地模型', baseUrl: 'http://localhost:11434/v1', models: ['nomic-embed-text', 'bge-m3'] },
  { id: 'custom', name: '自定义', baseUrl: '', models: [] }
]

// TTS 语音配置
const VOICES = [
  { value: 'zh-CN-XiaobaiNeural', label: '小白 (温柔女声)', gender: 'female' },
  { value: 'zh-CN-XiaoyiNeural', label: '小艺 (活泼女声)', gender: 'female' },
  { value: 'zh-CN-YunjianNeural', label: '云健 (活泼男声)', gender: 'male' },
  { value: 'zh-CN-YunxiNeural', label: '云希 (青年男声)', gender: 'male' },
  { value: 'zh-CN-YunxiaNeural', label: '云夏 (可爱女声)', gender: 'female' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
}

// 设置分类定义
const SETTINGS_CATEGORIES = [
  { id: 'llm', label: 'LLM 模型', icon: Brain, description: '语言模型配置' },
  { id: 'embedding', label: '向量模型', icon: Database, description: '文本向量化配置' },
  { id: 'tts', label: '语音合成', icon: Mic, description: 'TTS 语音设置' },
  { id: 'character', label: '角色模型', icon: Sparkles, description: 'Live2D 模型设置' },
  { id: 'background', label: '背景设置', icon: Palette, description: '聊天背景配置' },
  { id: 'dialog', label: '对话框', icon: MessageCircle, description: '对话框样式' },
  { id: 'system', label: '系统设置', icon: Server, description: '服务器与调试' },
]

export function SettingsPage() {
  const { settings, updateSetting, resetSettings } = useLive2DSettingsShared()
  const [activeCategory, setActiveCategory] = useState('llm')

  // LLM 预设状态
  const [llmPresets, setLlmPresets] = useState(DEFAULT_LLM_PRESETS)
  const [activeLlmPresetId, setActiveLlmPresetId] = useState(DEFAULT_LLM_PRESETS[0].id)
  const [llmAvailableModels, setLlmAvailableModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // 向量预设状态
  const [embPresets, setEmbPresets] = useState(DEFAULT_EMB_PRESETS)
  const [activeEmbPresetId, setActiveEmbPresetId] = useState(DEFAULT_EMB_PRESETS[0].id)
  const [embAvailableModels, setEmbAvailableModels] = useState([])
  const [isLoadingEmbModels, setIsLoadingEmbModels] = useState(false)

  // TTS 设置
  const [ttsVoice, setTtsVoice] = useState('zh-CN-XiaobaiNeural')
  const [ttsSpeed, setTtsSpeed] = useState(1.0)
  const [ttsPitch, setTtsPitch] = useState(1.0)
  const [ttsEnabled, setTtsEnabled] = useState(true)

  // 系统设置
  const [serverHost, setServerHost] = useState('localhost')
  const [serverPort, setServerPort] = useState(8000)
  const [debugMode, setDebugMode] = useState(false)

  // 状态
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' })

  // 获取当前活动的预设
  const getActiveLlmPreset = () => llmPresets.find(p => p.id === activeLlmPresetId) || llmPresets[0]
  const getActiveEmbPreset = () => embPresets.find(p => p.id === activeEmbPresetId) || embPresets[0]

  // 加载配置
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/config')
        const data = await res.json()
        if (data.code === 0) {
          const config = data.data

          // LLM 预设配置
          if (config.llm) {
            const presets = config.llm.presets && config.llm.presets.length > 0
              ? config.llm.presets
              : DEFAULT_LLM_PRESETS
            setLlmPresets(presets)
            const activeId = config.llm.active_preset_id
            const validActiveId = activeId && presets.find(p => p.id === activeId)
              ? activeId
              : presets[0].id
            setActiveLlmPresetId(validActiveId)
          }

          // 向量预设配置
          if (config.embedding) {
            const presets = config.embedding.presets && config.embedding.presets.length > 0
              ? config.embedding.presets
              : DEFAULT_EMB_PRESETS
            setEmbPresets(presets)
            const activeId = config.embedding.active_preset_id
            const validActiveId = activeId && presets.find(p => p.id === activeId)
              ? activeId
              : presets[0].id
            setActiveEmbPresetId(validActiveId)
          }

          // TTS 配置
          if (config.tts) {
            setTtsVoice(config.tts.voice || 'zh-CN-XiaobaiNeural')
            setTtsSpeed(config.tts.speed ?? 1.0)
            setTtsPitch(config.tts.pitch ?? 1.0)
            setTtsEnabled(config.tts.enabled ?? true)
          }

          // 系统配置
          if (config.system) {
            setServerHost(config.system.host || 'localhost')
            setServerPort(config.system.port ?? 8000)
            setDebugMode(config.system.debug ?? false)
          }
        }
      } catch (e) {
        console.error('Failed to load config:', e)
      }
    }
    loadConfig()
  }, [])

  // 更新 LLM 预设
  const updateLlmPreset = (id, updates) => {
    setLlmPresets(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  // 更新向量预设
  const updateEmbPreset = (id, updates) => {
    setEmbPresets(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  // 添加 LLM 预设
  const addLlmPreset = () => {
    const newPreset = {
      id: `llm-${Date.now()}`,
      name: '新预设',
      provider: 'deepseek',
      base_url: 'https://api.deepseek.com/v1',
      model_id: 'deepseek-chat',
      api_key: '',
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 0.9,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stop: []
    }
    setLlmPresets(prev => [...prev, newPreset])
    setActiveLlmPresetId(newPreset.id)
  }

  // 添加向量预设
  const addEmbPreset = () => {
    const newPreset = {
      id: `emb-${Date.now()}`,
      name: '新预设',
      provider: 'siliconflow',
      base_url: 'https://api.siliconflow.cn/v1',
      model_id: 'BAAI/bge-large-zh-v1.5',
      api_key: '',
      dimension: 1024
    }
    setEmbPresets(prev => [...prev, newPreset])
    setActiveEmbPresetId(newPreset.id)
  }

  // 删除 LLM 预设
  const deleteLlmPreset = (id) => {
    if (llmPresets.length <= 1) {
      alert('至少需要保留一个预设')
      return
    }
    if (confirm('确定要删除这个预设吗？')) {
      const newPresets = llmPresets.filter(p => p.id !== id)
      setLlmPresets(newPresets)
      if (activeLlmPresetId === id) {
        setActiveLlmPresetId(newPresets[0].id)
      }
    }
  }

  // 删除向量预设
  const deleteEmbPreset = (id) => {
    if (embPresets.length <= 1) {
      alert('至少需要保留一个预设')
      return
    }
    if (confirm('确定要删除这个预设吗？')) {
      const newPresets = embPresets.filter(p => p.id !== id)
      setEmbPresets(newPresets)
      if (activeEmbPresetId === id) {
        setActiveEmbPresetId(newPresets[0].id)
      }
    }
  }

  // 复制 LLM 预设
  const cloneLlmPreset = (id) => {
    const preset = llmPresets.find(p => p.id === id)
    if (preset) {
      const newPreset = {
        ...preset,
        id: `llm-${Date.now()}`,
        name: `${preset.name} (副本)`
      }
      setLlmPresets(prev => [...prev, newPreset])
      setActiveLlmPresetId(newPreset.id)
    }
  }

  // 复制向量预设
  const cloneEmbPreset = (id) => {
    const preset = embPresets.find(p => p.id === id)
    if (preset) {
      const newPreset = {
        ...preset,
        id: `emb-${Date.now()}`,
        name: `${preset.name} (副本)`
      }
      setEmbPresets(prev => [...prev, newPreset])
      setActiveEmbPresetId(newPreset.id)
    }
  }

  // 从 API 获取模型列表
  const fetchModels = async (type) => {
    const preset = type === 'llm' ? getActiveLlmPreset() : getActiveEmbPreset()
    if (!preset.base_url || !preset.api_key) {
      alert('请先配置 API 地址和密钥')
      return
    }

    if (type === 'llm') {
      setIsLoadingModels(true)
    } else {
      setIsLoadingEmbModels(true)
    }

    try {
      // 使用后端代理获取模型列表
      const response = await fetch('/api/models/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: preset.base_url,
          api_key: preset.api_key,
          type: type
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.code === 0) {
          const models = result.data?.models?.map(m => m.id) || []
          const modelNames = [...new Set(models)] // 去重

          if (modelNames.length === 0) {
            // 模型列表为空，提示用户使用预设模型
            console.log('API returned empty model list, using default models')
          } else {
            if (type === 'llm') {
              setLlmAvailableModels(modelNames)
              updateLlmPreset(preset.id, {
                model_id: preset.model_id || modelNames[0],
                available_models: modelNames
              })
            } else {
              setEmbAvailableModels(modelNames)
              updateEmbPreset(preset.id, {
                model_id: preset.model_id || modelNames[0],
                available_models: modelNames
              })
            }
            saveConfig(type)
            if (type === 'llm') setIsLoadingModels(false)
            else setIsLoadingEmbModels(false)
            return
          }
        } else {
          console.log('API returned error:', result.error)
        }
      } else {
        console.log('API request failed:', response.status)
      }
    } catch (error) {
      console.log('API request error:', error.message)
    }

    // 如果 API 获取失败或返回为空，使用默认模型列表
    const DEFAULT_MODELS = {
      'llm': {
        'deepseek': ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
        'mimo': ['Xiaomi/MiMo-7B-RL', 'Xiaomi/MiMo-7B-SFT'],
        'siliconflow': ['Qwen/Qwen2.5-14B-Instruct', 'deepseek-ai/DeepSeek-V2.5'],
        'openai': ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
        'anthropic': ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
        'zhipu': ['glm-4', 'glm-4-flash', 'glm-4-plus'],
        'dashscope': ['qwen-plus', 'qwen-turbo', 'qwen-long'],
        'custom': [],
      },
      'embedding': {
        'dashscope': ['text-embedding-v3', 'text-embedding-v4'],
        'openai': ['text-embedding-3-small', 'text-embedding-3-large'],
        'siliconflow': ['BAAI/bge-m3', 'BAAI/bge-large-zh-v1.5', 'netease-youdao/bce-embedding-base_v1'],
        'zhipu': ['embedding-3', 'embedding-3-flash'],
        'local': ['bge-m3', 'nomic-embed-text'],
        'doubao': ['doubao-embedding', 'doubao-embedding-large', 'doubao-embedding-vision'],
        'custom': [],
      }
    }

    const defaultModels = DEFAULT_MODELS[type]?.[preset.provider] || []

    if (type === 'llm') {
      setLlmAvailableModels(defaultModels)
      if (defaultModels.length > 0) {
        updateLlmPreset(preset.id, {
          model_id: preset.model_id || defaultModels[0],
          available_models: defaultModels
        })
      }
      setIsLoadingModels(false)
    } else {
      setEmbAvailableModels(defaultModels)
      if (defaultModels.length > 0) {
        updateEmbPreset(preset.id, {
          model_id: preset.model_id || defaultModels[0],
          available_models: defaultModels
        })
      }
      setIsLoadingEmbModels(false)
    }

    if (defaultModels.length > 0) {
      saveConfig(type)
    }
  }

  // 测试 API 连接
  const testConnection = async (preset, type) => {
    if (!preset.base_url || !preset.api_key) {
      alert('请先配置 API 地址和密钥')
      return
    }

    try {
      if (type === 'llm') {
        setIsLoadingModels(true)
      } else {
        setIsLoadingEmbModels(true)
      }

      const response = await fetch('/api/test/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: preset.base_url,
          api_key: preset.api_key,
          model: preset.model_id || 'gpt-4o-mini'
        })
      })

      const data = await response.json()

      if (data.code === 0 && data.success) {
        setSaveStatus({ type: 'success', message: `连接成功！延迟: ${data.latency_ms}ms` })
      } else {
        setSaveStatus({ type: 'error', message: `连接失败: ${data.error || '未知错误'}` })
      }

      setTimeout(() => setSaveStatus({ type: '', message: '' }), 5000)
    } catch (e) {
      setSaveStatus({ type: 'error', message: `连接失败: ${e.message}` })
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 5000)
    } finally {
      if (type === 'llm') {
        setIsLoadingModels(false)
      } else {
        setIsLoadingEmbModels(false)
      }
    }
  }

  // 保存配置
  const saveConfig = async (category) => {
    setIsSaving(true)
    setSaveStatus({ type: '', message: '' })

    try {
      const config = {}

      if (category === 'llm' || category === 'all') {
        config.llm = {
          active_preset_id: activeLlmPresetId,
          presets: llmPresets
        }
      }

      if (category === 'embedding' || category === 'all') {
        config.embedding = {
          active_preset_id: activeEmbPresetId,
          presets: embPresets
        }
      }

      if (category === 'tts' || category === 'all') {
        config.tts = {
          voice: ttsVoice,
          speed: ttsSpeed,
          pitch: ttsPitch,
          enabled: ttsEnabled
        }
      }

      if (category === 'system' || category === 'all') {
        config.system = {
          host: serverHost,
          port: serverPort,
          debug: debugMode
        }
      }

      // character 和 background 设置保存到 localStorage（客户端设置）
      if (category === 'character' || category === 'background' || category === 'all') {
        // 这两类设置直接通过 useLive2DSettings 保存到 localStorage
        // 不需要调用服务器 API
        setSaveStatus({ type: 'success', message: '保存成功！' })
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000)
        setIsSaving(false)
        return
      }

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      const data = await res.json()

      if (data.code === 0) {
        setSaveStatus({ type: 'success', message: '保存成功！' })
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000)
      } else {
        setSaveStatus({ type: 'error', message: data.detail || '保存失败' })
      }
    } catch (e) {
      setSaveStatus({ type: 'error', message: '请求失败，请检查网络连接' })
    }

    setIsSaving(false)
  }

  // 重置所有配置
  const handleResetAll = () => {
    if (confirm('确定要恢复所有默认设置吗？')) {
      resetSettings()
      setLlmPresets(DEFAULT_LLM_PRESETS)
      setActiveLlmPresetId(DEFAULT_LLM_PRESETS[0].id)
      setEmbPresets(DEFAULT_EMB_PRESETS)
      setActiveEmbPresetId(DEFAULT_EMB_PRESETS[0].id)
      setTtsVoice('zh-CN-XiaobaiNeural')
      setTtsSpeed(1.0)
      setTtsPitch(1.0)
      setTtsEnabled(true)
      setServerHost('localhost')
      setServerPort(8000)
      setDebugMode(false)
    }
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 顶部栏 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-200">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">设置</h1>
              <p className="text-xs text-slate-500">配置 AKIHO</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetAll}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              恢复默认
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* 左侧分类导航 */}
        <motion.div variants={itemVariants} className="w-64 flex-shrink-0">
          <nav className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 overflow-hidden sticky top-24">
            {SETTINGS_CATEGORIES.map(cat => {
              const Icon = cat.icon
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-l-4 border-teal-500'
                      : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-gradient-to-br from-teal-400 to-cyan-500 shadow-lg shadow-teal-200' : 'bg-slate-100'
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-medium ${isActive ? 'text-teal-700' : 'text-slate-700'}`}>
                      {cat.label}
                    </div>
                    <div className="text-xs text-slate-400">{cat.description}</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ml-auto text-slate-300 ${isActive ? 'rotate-90' : ''} transition-transform`} />
                </button>
              )
            })}
          </nav>
        </motion.div>

        {/* 右侧设置面板 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1"
        >
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 overflow-hidden">
            
            {/* LLM 预设设置 */}
            {activeCategory === 'llm' && (
              <LLMSettings
                presets={llmPresets}
                activePresetId={activeLlmPresetId}
                onSelectPreset={setActiveLlmPresetId}
                onUpdatePreset={updateLlmPreset}
                onAddPreset={addLlmPreset}
                onDeletePreset={deleteLlmPreset}
                onClonePreset={cloneLlmPreset}
                onSave={() => saveConfig('llm')}
                isSaving={isSaving}
                availableModels={llmAvailableModels}
                isLoadingModels={isLoadingModels}
                onFetchModels={() => fetchModels('llm')}
                onTestConnection={testConnection}
              />
            )}

            {/* 向量预设设置 */}
            {activeCategory === 'embedding' && (
              <EmbeddingSettings
                presets={embPresets}
                activePresetId={activeEmbPresetId}
                onSelectPreset={setActiveEmbPresetId}
                onUpdatePreset={updateEmbPreset}
                onAddPreset={addEmbPreset}
                onDeletePreset={deleteEmbPreset}
                onClonePreset={cloneEmbPreset}
                onSave={() => saveConfig('embedding')}
                isSaving={isSaving}
                availableModels={embAvailableModels}
                isLoadingModels={isLoadingEmbModels}
                onFetchModels={() => fetchModels('embedding')}
                onTestConnection={testConnection}
              />
            )}

            {/* TTS 设置 */}
            {activeCategory === 'tts' && (
              <SettingsPanel title="语音合成设置" icon={Mic} description="配置 TTS 语音，让秋穗开口说话">
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50/50 to-transparent rounded-xl border border-orange-100/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-700">语音合成</div>
                        <div className="text-xs text-slate-500">{VOICES.find(v => v.value === ttsVoice)?.label || '未选择'}</div>
                      </div>
                    </div>
                    <ToggleField
                      checked={ttsEnabled}
                      onChange={setTtsEnabled}
                    />
                  </div>

                  <SelectField
                    label="语音"
                    value={ttsVoice}
                    options={VOICES.map(v => ({ value: v.value, label: v.label }))}
                    onChange={setTtsVoice}
                  />

                  <SliderField
                    label="语速"
                    value={ttsSpeed}
                    min={0.5}
                    max={2}
                    step={0.1}
                    displayValue={ttsSpeed.toFixed(1)}
                    onChange={setTtsSpeed}
                  />

                  <SliderField
                    label="音调"
                    value={ttsPitch}
                    min={0.5}
                    max={2}
                    step={0.1}
                    displayValue={ttsPitch.toFixed(1)}
                    onChange={setTtsPitch}
                  />

                  <SaveButton onClick={() => saveConfig('tts')} isSaving={isSaving} />
                </div>
              </SettingsPanel>
            )}

            {/* 角色模型设置 */}
            {activeCategory === 'character' && (
              <SettingsPanel title="角色模型设置" icon={Sparkles} description="配置 Live2D 角色">
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50/50 to-transparent rounded-xl border border-pink-100/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-pink-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-700">角色模型</div>
                        <div className="text-xs text-slate-500">秋穗</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">已加载</span>
                  </div>

                  {/* 角色类型切换 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">角色类型</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSetting('character.type', 'live2d')}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                          settings.character?.type === 'live2d'
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Live2D 模型
                      </button>
                      <button
                        onClick={() => updateSetting('character.type', 'particle')}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                          settings.character?.type === 'particle'
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        粒子效果
                      </button>
                    </div>
                  </div>

                  {/* Live2D 设置 */}
                  {settings.character?.type === 'live2d' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">模型缩放</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0.3"
                            max="3"
                            step="0.1"
                            value={settings.model?.scale ?? 1.0}
                            onChange={e => updateSetting('model.scale', parseFloat(e.target.value))}
                            className="flex-1 accent-teal-500"
                          />
                          <span className="text-sm text-slate-500 w-16 text-right">
                            {Math.round((settings.model?.scale ?? 1.0) * 100)}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">水平偏移</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="-200"
                            max="200"
                            step="10"
                            value={settings.model?.offsetX ?? 0}
                            onChange={e => updateSetting('model.offsetX', parseInt(e.target.value))}
                            className="flex-1 accent-teal-500"
                          />
                          <span className="text-sm text-slate-500 w-16 text-right">
                            {settings.model?.offsetX ?? 0}px
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">垂直偏移</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="-200"
                            max="200"
                            step="10"
                            value={settings.model?.offsetY ?? 0}
                            onChange={e => updateSetting('model.offsetY', parseInt(e.target.value))}
                            className="flex-1 accent-teal-500"
                          />
                          <span className="text-sm text-slate-500 w-16 text-right">
                            {settings.model?.offsetY ?? 0}px
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* 粒子效果设置 */}
                  {settings.character?.type === 'particle' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">粒子图片</label>
                        <ParticleImageUploader
                          value={settings.character?.particleImage || ''}
                          onChange={(base64) => updateSetting('character.particleImage', base64)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">粒子间距</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="0.5"
                            value={settings.particle?.step ?? 3}
                            onChange={e => updateSetting('particle.step', parseFloat(e.target.value))}
                            className="flex-1 accent-teal-500"
                          />
                          <span className="text-sm text-slate-500 w-16 text-right">
                            {settings.particle?.step ?? 3}px
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">粒子大小</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="1"
                            max="8"
                            step="0.2"
                            value={settings.particle?.particleSize ?? 3.2}
                            onChange={e => updateSetting('particle.particleSize', parseFloat(e.target.value))}
                            className="flex-1 accent-teal-500"
                          />
                          <span className="text-sm text-slate-500 w-16 text-right">
                            {settings.particle?.particleSize ?? 3.2}px
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">排斥力</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="200"
                            step="10"
                            value={settings.particle?.repelForce ?? 80}
                            onChange={e => updateSetting('particle.repelForce', parseInt(e.target.value))}
                            className="flex-1 accent-teal-500"
                          />
                          <span className="text-sm text-slate-500 w-16 text-right">
                            {settings.particle?.repelForce ?? 80}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">水平偏移</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="-300"
                            max="300"
                            step="10"
                            value={settings.particle?.offsetX ?? 0}
                            onChange={e => updateSetting('particle.offsetX', parseInt(e.target.value))}
                            className="flex-1 accent-teal-500"
                          />
                          <span className="text-sm text-slate-500 w-16 text-right">
                            {settings.particle?.offsetX ?? 0}px
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">垂直偏移</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="-300"
                            max="300"
                            step="10"
                            value={settings.particle?.offsetY ?? 0}
                            onChange={e => updateSetting('particle.offsetY', parseInt(e.target.value))}
                            className="flex-1 accent-teal-500"
                          />
                          <span className="text-sm text-slate-500 w-16 text-right">
                            {settings.particle?.offsetY ?? 0}px
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">缩放</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.1"
                            value={settings.particle?.scale ?? 1}
                            onChange={e => updateSetting('particle.scale', parseFloat(e.target.value))}
                            className="flex-1 accent-teal-500"
                          />
                          <span className="text-sm text-slate-500 w-16 text-right">
                            {Math.round((settings.particle?.scale ?? 1) * 100)}%
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  <SaveButton onClick={() => saveConfig('character')} isSaving={isSaving} />
                </div>
              </SettingsPanel>
            )}

            {/* 背景设置 */}
            {activeCategory === 'background' && (
              <SettingsPanel title="背景设置" icon={Palette} description="自定义聊天背景">
                <div className="space-y-5">
                  {/* 背景类型切换 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">背景类型</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSetting('background.type', 'color')}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                          settings.background?.type === 'color'
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        纯色
                      </button>
                      <button
                        onClick={() => updateSetting('background.type', 'image')}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                          settings.background?.type === 'image'
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        图片
                      </button>
                      <button
                        onClick={() => updateSetting('background.type', 'particle')}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                          settings.background?.type === 'particle'
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        粒子
                      </button>
                    </div>
                  </div>

                  {/* 纯色设置 */}
                  {settings.background?.type === 'color' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">背景颜色</label>
                      <input
                        type="color"
                        value={settings.background?.color || '#667eea'}
                        onChange={e => updateSetting('background.color', e.target.value)}
                        className="w-full h-12 rounded-xl cursor-pointer"
                      />
                    </div>
                  )}

                  {/* 图片设置 */}
                  {settings.background?.type === 'image' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">背景图片 URL</label>
                      <input
                        type="text"
                        value={settings.background?.image || ''}
                        onChange={e => updateSetting('background.image', e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                      />
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-slate-700 mb-2">图片适配方式</label>
                        <div className="flex gap-2">
                          {['cover', 'contain', 'center'].map(fit => (
                            <button
                              key={fit}
                              onClick={() => updateSetting('background.fit', fit)}
                              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                                (settings.background?.fit || 'cover') === fit
                                  ? 'bg-teal-500 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {fit === 'cover' ? '填充' : fit === 'contain' ? '适应' : '居中'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 粒子背景说明 */}
                  {settings.background?.type === 'particle' && (
                    <div className="text-center py-4 text-sm text-slate-500">
                      粒子效果将平铺显示在背景上
                    </div>
                  )}

                  <SaveButton onClick={() => saveConfig('background')} isSaving={isSaving} />
                </div>
              </SettingsPanel>
            )}

            {/* 对话框设置 */}
            {activeCategory === 'dialog' && (
              <SettingsPanel title="对话框样式" icon={MessageCircle} description="自定义对话框外观">
                <div className="space-y-5">
                  <ToggleField
                    label="显示头像"
                    description="在消息旁显示头像"
                    checked={settings.showAvatar !== false}
                    onChange={v => updateSetting('showAvatar', v)}
                  />

                  <ToggleField
                    label="显示时间戳"
                    description="在每条消息下显示发送时间"
                    checked={settings.showTimestamp || false}
                    onChange={v => updateSetting('showTimestamp', v)}
                  />

                  <ToggleField
                    label="启用打字效果"
                    description="AI 回复时显示打字动画"
                    checked={settings.enableTypingEffect !== false}
                    onChange={v => updateSetting('enableTypingEffect', v)}
                  />

                  <SaveButton onClick={() => saveConfig('dialog')} isSaving={isSaving} />
                </div>
              </SettingsPanel>
            )}

            {/* 系统设置 */}
            {activeCategory === 'system' && (
              <SettingsPanel title="系统设置" icon={Server} description="服务器配置与调试选项">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <TextField
                      label="服务器地址"
                      value={serverHost}
                      placeholder="localhost"
                      onChange={setServerHost}
                    />
                    <TextField
                      label="端口"
                      value={serverPort}
                      placeholder="8000"
                      onChange={v => setServerPort(parseInt(v) || 8000)}
                    />
                  </div>

                  <ToggleField
                    label="调试模式"
                    description="显示详细的调试信息"
                    checked={debugMode}
                    onChange={setDebugMode}
                  />

                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="text-sm text-slate-600">
                      <span className="font-medium">版本:</span> 0.1.0
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      <span className="font-medium">环境:</span> {process.env.NODE_ENV || 'development'}
                    </div>
                  </div>

                  <SaveButton onClick={() => saveConfig('system')} isSaving={isSaving} />
                </div>
              </SettingsPanel>
            )}
          </div>
        </motion.div>
      </div>

      {/* 保存状态提示 */}
      <AnimatePresence>
        {saveStatus.message && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
              saveStatus.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {saveStatus.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {saveStatus.message}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============ LLM 预设设置组件 ============
function LLMSettings({
  presets, activePresetId, onSelectPreset,
  onUpdatePreset, onAddPreset, onDeletePreset, onClonePreset,
  onSave, isSaving, availableModels, isLoadingModels, onFetchModels, onTestConnection
}) {
  const [editingNameId, setEditingNameId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [showParams, setShowParams] = useState(true)
  const preset = presets.find(p => p.id === activePresetId)

  const handleStartEditName = (p) => {
    setEditingNameId(p.id)
    setEditingName(p.name)
  }

  const handleFinishEditName = () => {
    if (editingNameId && editingName.trim()) {
      onUpdatePreset(editingNameId, { name: editingName.trim() })
    }
    setEditingNameId(null)
    setEditingName('')
  }

  if (!preset) return null

  const provider = LLM_PROVIDERS.find(p => p.id === preset.provider)

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-200">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">LLM 模型预设</h2>
          <p className="text-sm text-slate-500">管理多个模型配置，快速切换使用</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 左侧：预设列表 */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-slate-50/50 rounded-xl p-3 space-y-2">
            {presets.map(p => (
              <PresetItem
                key={p.id}
                preset={p}
                isActive={p.id === activePresetId}
                onSelect={() => onSelectPreset(p.id)}
                onEditName={handleStartEditName}
                onDelete={() => onDeletePreset(p.id)}
                onClone={() => onClonePreset(p.id)}
                editingNameId={editingNameId}
                editingName={editingName}
                onEditingNameChange={setEditingName}
                onFinishEdit={handleFinishEditName}
              />
            ))}
          </div>
          <button
            onClick={onAddPreset}
            className="w-full mt-3 py-3 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:text-teal-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加新预设
          </button>
        </div>

        {/* 右侧：预设详情 */}
        <div className="flex-1 space-y-5">
          {/* 预设信息卡片 */}
          <div className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl border border-blue-100/50">
            <div className="flex items-center gap-3 mb-3">
              {editingNameId === preset.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={handleFinishEditName}
                    onKeyDown={e => e.key === 'Enter' && handleFinishEditName()}
                    className="flex-1 px-3 py-2 bg-white rounded-lg text-sm font-medium border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                  />
                  <button onClick={handleFinishEditName} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <CheckCheck className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <h3 className="font-bold text-blue-800">{preset.name}</h3>
                    <p className="text-xs text-blue-500 font-mono">{preset.model_id}</p>
                  </div>
                  <button onClick={() => handleStartEditName(preset)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
                {LLM_PROVIDERS.find(p => p.id === preset.provider)?.name || '自定义'}
              </span>
              {preset.api_key && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-600 rounded-full">
                  <Check className="w-3 h-3" /> API 已配置
                </span>
              )}
            </div>
          </div>

          {/* 提供商和 API */}
          <SelectField
            label="提供商"
            value={preset.provider}
            options={LLM_PROVIDERS.map(p => ({ value: p.id, label: p.name }))}
            onChange={v => {
              const p = LLM_PROVIDERS.find(pp => pp.id === v)
              onUpdatePreset(preset.id, { provider: v, base_url: p?.baseUrl || '', model_id: p?.models?.[0] || '' })
            }}
          />

          <TextField
            label="API 地址"
            value={preset.base_url}
            placeholder="https://api.deepseek.com/v1"
            onChange={v => onUpdatePreset(preset.id, { base_url: v })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
            <div className="relative">
              <input
                type="password"
                value={preset.api_key || ''}
                placeholder="sk-..."
                onChange={e => onUpdatePreset(preset.id, { api_key: e.target.value })}
                className="w-full bg-white/80 rounded-xl pl-4 pr-24 py-3 text-sm text-slate-700 placeholder-slate-400 border border-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400/50 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {preset.api_key ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
                <button
                  type="button"
                  onClick={() => onTestConnection && onTestConnection(preset, 'llm')}
                  disabled={!preset.base_url || !preset.api_key || isLoadingModels}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  测试
                </button>
              </div>
            </div>
          </div>

          {/* 模型选择 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">模型</label>
              <button
                onClick={onFetchModels}
                disabled={!preset.base_url || !preset.api_key || isLoadingModels}
                className="text-xs text-teal-600 hover:text-teal-700 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isLoadingModels ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    获取中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    从 API 获取
                  </>
                )}
              </button>
            </div>
            <select
              value={preset.model_id || ''}
              onChange={e => onUpdatePreset(preset.id, { model_id: e.target.value })}
              className="w-full bg-white/80 rounded-xl px-4 py-3 text-sm text-slate-700 border border-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400/50 transition-all cursor-pointer"
            >
              <option value="">请选择模型...</option>
              {(preset.available_models && preset.available_models.length > 0
                ? preset.available_models
                : provider?.models || []
              ).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {preset.available_models && preset.available_models.length > 0 && (
              <p className="text-xs text-teal-600 mt-1">已从 API 获取 {preset.available_models.length} 个模型</p>
            )}
          </div>

          {/* 展开/收起参数 */}
          <button
            onClick={() => setShowParams(!showParams)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <Zap className="w-4 h-4" />
            生成参数
            <ChevronRight className={`w-4 h-4 transition-transform ${showParams ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {showParams && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <SliderField
                  label="Temperature"
                  value={preset.temperature ?? 0.7}
                  min={0} max={2} step={0.1}
                  displayValue={(preset.temperature ?? 0.7).toFixed(1)}
                  onChange={v => onUpdatePreset(preset.id, { temperature: v })}
                />
                <SliderField
                  label="Max Tokens"
                  value={preset.max_tokens ?? 4096}
                  min={256} max={8192} step={256}
                  displayValue={preset.max_tokens ?? 4096}
                  onChange={v => onUpdatePreset(preset.id, { max_tokens: v })}
                />
                <SliderField
                  label="Top P"
                  value={preset.top_p ?? 0.9}
                  min={0} max={1} step={0.05}
                  displayValue={(preset.top_p ?? 0.9).toFixed(2)}
                  onChange={v => onUpdatePreset(preset.id, { top_p: v })}
                />
                <SliderField
                  label="Frequency Penalty"
                  value={preset.frequency_penalty ?? 0}
                  min={-2} max={2} step={0.1}
                  displayValue={(preset.frequency_penalty ?? 0).toFixed(1)}
                  onChange={v => onUpdatePreset(preset.id, { frequency_penalty: v })}
                />
                <SliderField
                  label="Presence Penalty"
                  value={preset.presence_penalty ?? 0}
                  min={-2} max={2} step={0.1}
                  displayValue={(preset.presence_penalty ?? 0).toFixed(1)}
                  onChange={v => onUpdatePreset(preset.id, { presence_penalty: v })}
                />
                <TextField
                  label="Stop Sequences"
                  value={Array.isArray(preset.stop) ? preset.stop.join(', ') : ''}
                  placeholder="如: ###, END"
                  onChange={v => onUpdatePreset(preset.id, { stop: v.split(',').map(s => s.trim()).filter(Boolean) })}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <SaveButton onClick={onSave} isSaving={isSaving} />
        </div>
      </div>
    </div>
  )
}

// ============ 向量预设设置组件 ============
function EmbeddingSettings({
  presets, activePresetId, onSelectPreset,
  onUpdatePreset, onAddPreset, onDeletePreset, onClonePreset,
  onSave, isSaving, availableModels, isLoadingModels, onFetchModels, onTestConnection
}) {
  const [editingNameId, setEditingNameId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const preset = presets.find(p => p.id === activePresetId)

  const handleStartEditName = (p) => {
    setEditingNameId(p.id)
    setEditingName(p.name)
  }

  const handleFinishEditName = () => {
    if (editingNameId && editingName.trim()) {
      onUpdatePreset(editingNameId, { name: editingName.trim() })
    }
    setEditingNameId(null)
    setEditingName('')
  }

  if (!preset) return null

  const provider = EMBEDDING_PROVIDERS.find(p => p.id === preset.provider)

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-200">
          <Database className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">向量模型预设</h2>
          <p className="text-sm text-slate-500">管理多个向量模型配置</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 左侧：预设列表 */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-slate-50/50 rounded-xl p-3 space-y-2">
            {presets.map(p => (
              <PresetItem
                key={p.id}
                preset={p}
                isActive={p.id === activePresetId}
                onSelect={() => onSelectPreset(p.id)}
                onEditName={handleStartEditName}
                onDelete={() => onDeletePreset(p.id)}
                onClone={() => onClonePreset(p.id)}
                editingNameId={editingNameId}
                editingName={editingName}
                onEditingNameChange={setEditingName}
                onFinishEdit={handleFinishEditName}
              />
            ))}
          </div>
          <button
            onClick={onAddPreset}
            className="w-full mt-3 py-3 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:text-teal-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加新预设
          </button>
        </div>

        {/* 右侧：预设详情 */}
        <div className="flex-1 space-y-5">
          <div className="p-4 bg-gradient-to-r from-violet-50/50 to-purple-50/50 rounded-xl border border-violet-100/50">
            <div className="flex items-center gap-3 mb-3">
              {editingNameId === preset.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={handleFinishEditName}
                    onKeyDown={e => e.key === 'Enter' && handleFinishEditName()}
                    className="flex-1 px-3 py-2 bg-white rounded-lg text-sm font-medium border border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    autoFocus
                  />
                  <button onClick={handleFinishEditName} className="p-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600">
                    <CheckCheck className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <h3 className="font-bold text-violet-800">{preset.name}</h3>
                    <p className="text-xs text-violet-500 font-mono">{preset.model_id}</p>
                  </div>
                  <button onClick={() => handleStartEditName(preset)} className="p-2 text-violet-400 hover:text-violet-600 hover:bg-violet-100 rounded-lg transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-violet-100 text-violet-600 rounded-full">
                {EMBEDDING_PROVIDERS.find(p => p.id === preset.provider)?.name || '自定义'}
              </span>
              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                {preset.dimension} 维
              </span>
            </div>
          </div>

          <SelectField
            label="提供商"
            value={preset.provider}
            options={EMBEDDING_PROVIDERS.map(p => ({ value: p.id, label: p.name }))}
            onChange={v => {
              const p = EMBEDDING_PROVIDERS.find(pp => pp.id === v)
              onUpdatePreset(preset.id, { provider: v, base_url: p?.baseUrl || '', model_id: p?.models?.[0] || '' })
            }}
          />

          <TextField
            label="API 地址"
            value={preset.base_url}
            placeholder="https://api.siliconflow.cn/v1"
            onChange={v => onUpdatePreset(preset.id, { base_url: v })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
            <div className="relative">
              <input
                type="password"
                value={preset.api_key || ''}
                placeholder="sk-..."
                onChange={e => onUpdatePreset(preset.id, { api_key: e.target.value })}
                className="w-full bg-white/80 rounded-xl pl-4 pr-24 py-3 text-sm text-slate-700 placeholder-slate-400 border border-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400/50 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {preset.api_key ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
                <button
                  type="button"
                  onClick={() => onTestConnection && onTestConnection(preset, 'embedding')}
                  disabled={!preset.base_url || !preset.api_key || isLoadingModels}
                  className="px-3 py-1 text-xs bg-violet-100 text-violet-600 hover:bg-violet-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  测试
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">模型</label>
              <button
                onClick={onFetchModels}
                disabled={!preset.base_url || !preset.api_key || isLoadingModels}
                className="text-xs text-teal-600 hover:text-teal-700 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isLoadingModels ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    获取中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    从 API 获取
                  </>
                )}
              </button>
            </div>
            <select
              value={preset.model_id || ''}
              onChange={e => onUpdatePreset(preset.id, { model_id: e.target.value })}
              className="w-full bg-white/80 rounded-xl px-4 py-3 text-sm text-slate-700 border border-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400/50 transition-all cursor-pointer"
            >
              <option value="">请选择模型...</option>
              {(preset.available_models && preset.available_models.length > 0
                ? preset.available_models
                : provider?.models || []
              ).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {preset.available_models && preset.available_models.length > 0 && (
              <p className="text-xs text-violet-600 mt-1">已从 API 获取 {preset.available_models.length} 个模型</p>
            )}
          </div>

          <SliderField
            label="向量维度"
            value={preset.dimension ?? 1024}
            min={256} max={2048} step={128}
            displayValue={preset.dimension ?? 1024}
            onChange={v => onUpdatePreset(preset.id, { dimension: v })}
          />

          <SaveButton onClick={onSave} isSaving={isSaving} />
        </div>
      </div>
    </div>
  )
}

// ============ 预设列表项组件 ============
function PresetItem({
  preset, isActive, onSelect,
  onEditName, onDelete, onClone,
  editingNameId, editingName, onEditingNameChange, onFinishEdit
}) {
  return (
    <motion.div
      layout
      className={`group relative p-3 rounded-xl cursor-pointer transition-all ${
        isActive
          ? 'bg-white shadow-md border-2 border-teal-400'
          : 'bg-white/50 hover:bg-white border-2 border-transparent'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <GripVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab" />
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          isActive ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
        }`}>
          {isActive && <Check className="w-3 h-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${isActive ? 'text-teal-700' : 'text-slate-700'}`}>
            {preset.name}
          </div>
          <div className="text-xs text-slate-400 font-mono truncate">{preset.model_id}</div>
        </div>
      </div>
      {isActive && (
        <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onClone() }}
            className="p-1 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
            title="复制"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
            title="删除"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

// ============ 通用设置组件 ============
function SettingsPanel({ title, icon: Icon, description, children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-200">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  )
}

function SliderField({ label, value, min, max, step, displayValue, onChange, help }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm text-teal-600 font-medium tabular-nums">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-5
                   [&::-webkit-slider-thumb]:h-5
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-teal-500
                   [&::-webkit-slider-thumb]:shadow-lg
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:transition-transform
                   [&::-webkit-slider-thumb]:hover:scale-110"
      />
      {help && <p className="text-xs text-slate-400 mt-1">{help}</p>}
    </div>
  )
}

function ToggleField({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-teal-500' : 'bg-slate-300'
        }`}
      >
        <motion.span
          animate={{ x: checked ? 24 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
        />
      </motion.button>
    </div>
  )
}

function SelectField({ label, value, options, onChange, help }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/80 rounded-xl px-4 py-3 text-sm text-slate-700 border border-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400/50 transition-all cursor-pointer"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {help && <p className="text-xs text-slate-400 mt-1">{help}</p>}
    </div>
  )
}

function TextField({ label, value, placeholder, onChange, help }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/80 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-400 border border-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400/50 transition-all"
      />
      {help && <p className="text-xs text-slate-400 mt-1">{help}</p>}
    </div>
  )
}

function SaveButton({ onClick, isSaving }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={isSaving}
      className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-medium rounded-xl shadow-lg shadow-teal-200/50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
    >
      {isSaving ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          保存中...
        </>
      ) : (
        <>
          <Check className="w-5 h-5" />
          保存设置
        </>
      )}
    </motion.button>
  )
}
