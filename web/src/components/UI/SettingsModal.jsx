import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const VOICES = [
  { value: 'zh-CN-XiaoyiNeural', label: '小艺 (活泼女声)' },
  { value: 'zh-CN-XiaobaiNeural', label: '小白 (温柔女声)' },
  { value: 'zh-CN-YunjianNeural', label: '云健 (活泼男声)' },
  { value: 'zh-CN-YunxiNeural', label: '云希 (青年男声)' }
]

const LLM_PROVIDERS = [
  { value: 'deepseek', label: 'DeepSeek', model: 'deepseek-chat' },
  { value: 'siliconflow', label: 'SiliconFlow', model: 'Qwen/Qwen2.5-14B-Instruct' },
  { value: 'openai', label: 'OpenAI', model: 'gpt-4o-mini' },
  { value: 'anthropic', label: 'Anthropic', model: 'claude-3-haiku' }
]

export function SettingsModal({ isOpen, onClose, settings, onSettingsChange }) {
  const [activeTab, setActiveTab] = useState('voice') // voice | llm
  const [llmProvider, setLlmProvider] = useState('deepseek')
  const [apiKey, setApiKey] = useState('')
  const [maskedKey, setMaskedKey] = useState('')  // 脱敏密钥显示
  const [isSaving, setIsSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // 加载已保存的 API 配置
  useEffect(() => {
    if (!isOpen) return
    async function loadApiConfig() {
      try {
        const res = await fetch('/api/config/api')
        const data = await res.json()
        if (data.code === 0) {
          setLlmProvider(data.data.provider || 'deepseek')
          setApiKey(data.data.api_key || '')
          setMaskedKey(data.data.masked_key || '')
        }
      } catch (e) {
        console.error('Failed to load API config:', e)
      }
      setIsLoading(false)
    }
    loadApiConfig()
  }, [isOpen, settings])

  if (!isOpen) return null

  const handleSaveLLM = async () => {
    if (!apiKey.trim()) {
      setSaveMsg('请输入 API Key')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/config/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: llmProvider,
          api_key: apiKey
        })
      })
      const data = await res.json()
      if (data.code === 0) {
        setSaveMsg('保存成功！')
        setTimeout(() => setSaveMsg(''), 2000)
      } else {
        setSaveMsg(data.detail || '保存失败')
      }
    } catch (e) {
      setSaveMsg('请求失败')
    }
    setIsSaving(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
          />

          {/* 弹窗 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                       w-[90%] max-w-md z-50"
          >
            <div className="card p-6">
              {/* 标题栏 */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-700">设置</h2>
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-primary-50 active:scale-95 transition-all"
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </motion.button>
              </div>

              {/* Tab 切换 */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveTab('voice')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'voice'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  语音
                </button>
                <button
                  onClick={() => setActiveTab('llm')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'llm'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  LLM
                </button>
              </div>

              {/* 语音设置 */}
              {activeTab === 'voice' && (
                <div className="space-y-6">
                  {/* 语音角色 */}
                  <div className="setting-item">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      语音角色
                    </label>
                    <select
                      value={settings.voice}
                      onChange={(e) => onSettingsChange('voice', e.target.value)}
                      className="input-field"
                    >
                      {VOICES.map(voice => (
                        <option key={voice.value} value={voice.value}>
                          {voice.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 语速 */}
                  <div className="setting-item">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-600">语速</label>
                      <span className="text-sm text-primary-500 font-medium">
                        {settings.speed.toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.speed}
                      onChange={(e) => onSettingsChange('speed', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                                 [&::-webkit-slider-thumb]:appearance-none
                                 [&::-webkit-slider-thumb]:w-5
                                 [&::-webkit-slider-thumb]:h-5
                                 [&::-webkit-slider-thumb]:rounded-full
                                 [&::-webkit-slider-thumb]:bg-primary-500
                                 [&::-webkit-slider-thumb]:shadow-lg
                                 [&::-webkit-slider-thumb]:cursor-pointer
                                 [&::-webkit-slider-thumb]:transition-transform
                                 [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                  </div>

                  {/* 音调 */}
                  <div className="setting-item">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-600">音调</label>
                      <span className="text-sm text-primary-500 font-medium">
                        {settings.pitch.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.pitch}
                      onChange={(e) => onSettingsChange('pitch', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                                 [&::-webkit-slider-thumb]:appearance-none
                                 [&::-webkit-slider-thumb]:w-5
                                 [&::-webkit-slider-thumb]:h-5
                                 [&::-webkit-slider-thumb]:rounded-full
                                 [&::-webkit-slider-thumb]:bg-primary-500
                                 [&::-webkit-slider-thumb]:shadow-lg
                                 [&::-webkit-slider-thumb]:cursor-pointer
                                 [&::-webkit-slider-thumb]:transition-transform
                                 [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                  </div>

                  {/* 开关选项 */}
                  <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-medium text-gray-600">启用语音回复</span>
                      <div
                        onClick={() => onSettingsChange('enableTTS', !settings.enableTTS)}
                        className={`relative w-12 h-7 rounded-full transition-colors duration-300
                                    ${settings.enableTTS ? 'bg-primary-500' : 'bg-gray-300'}`}
                      >
                        <motion.div
                          className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md"
                          animate={{ x: settings.enableTTS ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-medium text-gray-600">显示念头气泡</span>
                      <div
                        onClick={() => onSettingsChange('showThought', !settings.showThought)}
                        className={`relative w-12 h-7 rounded-full transition-colors duration-300
                                    ${settings.showThought ? 'bg-primary-500' : 'bg-gray-300'}`}
                      >
                        <motion.div
                          className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md"
                          animate={{ x: settings.showThought ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* LLM 设置 */}
              {activeTab === 'llm' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 mb-4">
                    选择 LLM 提供商并输入 API Key，秋穗会变得更加智能哦~
                  </p>

                  {isLoading ? (
                    <div className="text-center py-4 text-gray-400">加载中...</div>
                  ) : (
                    <>
                      {/* 提供商选择 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          提供商
                        </label>
                        <select
                          value={llmProvider}
                          onChange={(e) => setLlmProvider(e.target.value)}
                          className="input-field"
                        >
                          {LLM_PROVIDERS.map(p => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 模型选择 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          模型
                        </label>
                        <select
                          value={llmProvider}
                          onChange={(e) => setLlmProvider(e.target.value)}
                          className="input-field"
                        >
                          {LLM_PROVIDERS.map(p => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* API Key */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="输入你的 API Key"
                          className="input-field"
                        />
                      </div>

                      {/* 保存按钮 */}
                      <button
                        onClick={async () => {
                          if (!apiKey.trim()) {
                            setSaveMsg('请输入 API Key')
                            return
                          }
                          setIsSaving(true)
                          try {
                            const res = await fetch('/api/config/api', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                provider: llmProvider,
                                api_key: apiKey,
                                model: LLM_PROVIDERS.find(p => p.value === llmProvider)?.model || ''
                              })
                            })
                            const data = await res.json()
                            if (data.code === 0) {
                              const masked = data.data?.masked_key || maskedKey
                              setMaskedKey(masked)
                              // 通知父组件更新配置
                              if (onSettingsChange) {
                                onSettingsChange('llmProvider', llmProvider)
                                onSettingsChange('llmApiKey', apiKey)
                              }
                              setSaveMsg(`保存成功！密钥: ${masked}`)
                              setTimeout(() => setSaveMsg(''), 3000)
                            } else {
                              setSaveMsg(data.detail || '保存失败')
                            }
                          } catch (e) {
                            setSaveMsg('请求失败')
                          }
                          setIsSaving(false)
                        }}
                        disabled={isSaving}
                        className="w-full py-2.5 bg-primary-500 text-white rounded-xl font-medium
                                   hover:bg-primary-600 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? '保存中...' : '保存并切换'}
                      </button>

                      {saveMsg && (
                        <p className={`text-sm text-center ${saveMsg.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>
                          {saveMsg}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
