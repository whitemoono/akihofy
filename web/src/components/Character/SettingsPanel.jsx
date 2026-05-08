import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings as SettingsIcon, Sparkles, Image, MessageSquare, MousePointer } from 'lucide-react'

const defaultSettings = {
  model: {
    scale: 1.0,
    offsetX: -200,
    offsetY: 80,
    interactive: true
  },
  background: {
    type: 'color',
    color: '#ffffff',
    image: '',
    fit: 'cover'
  },
  dialog: {
    position: 'right',
    opacity: 1.0,
    width: 100,
    offsetX: 200
  },
  interaction: {
    autoBlink: true,
    idleAnimation: true
  },
  character: {
    type: 'live2d',
    modelPath: '/models/yachiyo/八千代辉夜姬.model3.json',
    particleImage: ''
  },
  particle: {
    step: 3,
    particleSize: 3.2,
    repelForce: 80,
    offsetX: 0,
    offsetY: 0,
    scale: 1
  }
}

// 创建 Context
const Live2DSettingsContext = createContext(null)

// Provider 组件
export function Live2DSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('live2d-settings')
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) }
      }
    } catch (e) {}
    return defaultSettings
  })

  useEffect(() => {
    localStorage.setItem('live2d-settings', JSON.stringify(settings))
  }, [settings])

  const updateSetting = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev }
      const keys = path.split('.')
      let obj = newSettings
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] }
        obj = obj[keys[i]]
      }
      obj[keys[keys.length - 1]] = value
      return newSettings
    })
  }

  const resetSettings = () => setSettings(defaultSettings)

  return (
    <Live2DSettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </Live2DSettingsContext.Provider>
  )
}

// 共享的 hook - 用于需要共享状态的组件
export function useLive2DSettingsShared() {
  const context = useContext(Live2DSettingsContext)
  if (!context) {
    throw new Error('useLive2DSettingsShared must be used within Live2DSettingsProvider')
  }
  return context
}

// 原来的 hook - 使用共享状态
export function useLive2DSettings() {
  return useLive2DSettingsShared()
}

export function SettingsPanel({ settings, updateSetting, onClose }) {
  const [activeTab, setActiveTab] = useState('model')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const panelRef = useRef(null)

  const tabs = [
    { id: 'model', label: '模型' },
    { id: 'particle', label: '粒子' },
    { id: 'background', label: '背景' },
    { id: 'dialog', label: '对话框' },
    { id: 'interaction', label: '交互' }
  ]

  const TabIcon = ({ id, active }) => {
    const icons = {
      model: SettingsIcon,
      particle: Sparkles,
      background: Image,
      dialog: MessageSquare,
      interaction: MousePointer,
    }
    const Icon = icons[id] || SettingsIcon
    return <Icon size={14} className={active ? 'text-teal-600' : 'text-slate-400'} />
  }

  const positions = [
    { value: 'left', label: '左侧' },
    { value: 'right', label: '右侧' },
    { value: 'top', label: '顶部' },
    { value: 'bottom', label: '底部' }
  ]

  const bgFits = [
    { value: 'cover', label: '填充' },
    { value: 'contain', label: '适应' },
    { value: 'center', label: '居中' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-4 right-4 w-80 bg-white/50 backdrop-blur-md rounded-2xl shadow-glass-panel overflow-hidden z-50 border border-white/60"
      ref={panelRef}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/40 border-b border-white/50">
        <h3 className="text-slate-700 font-medium text-sm">设置</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/60 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === tab.id
                ? 'text-teal-600 border-b-2 border-teal-500 bg-white/40'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
            }`}
          >
            <TabIcon id={tab.id} active={activeTab === tab.id} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-80 overflow-y-auto">
        {/* Model Settings */}
        {activeTab === 'model' && (
          <div className="space-y-4">
            <SettingItem label="缩放" description={`${Math.round(settings.model.scale * 100)}%`}>
              <input
                type="range"
                min="0.3"
                max="3"
                step="0.1"
                value={settings.model.scale}
                onChange={e => updateSetting('model.scale', parseFloat(e.target.value))}
                className="w-full accent-teal-500"
              />
            </SettingItem>

            <SettingItem label="水平偏移" description={`${settings.model.offsetX}px`}>
              <input
                type="range"
                min="-200"
                max="200"
                step="10"
                value={settings.model.offsetX}
                onChange={e => updateSetting('model.offsetX', parseInt(e.target.value))}
                className="w-full accent-teal-500"
              />
            </SettingItem>

            <SettingItem label="垂直偏移" description={`${settings.model.offsetY}px`}>
              <input
                type="range"
                min="-200"
                max="200"
                step="10"
                value={settings.model.offsetY}
                onChange={e => updateSetting('model.offsetY', parseInt(e.target.value))}
                className="w-full accent-teal-500"
              />
            </SettingItem>

            <ToggleItem
              label="鼠标交互"
              description="点击模型时有反应"
              checked={settings.model.interactive}
              onChange={v => updateSetting('model.interactive', v)}
            />
          </div>
        )}

        {/* Particle Settings */}
        {activeTab === 'particle' && (
          <div className="space-y-4">
            <SettingItem label="粒子间距" description={`${settings.particle.step}px`}>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={settings.particle.step}
                onChange={e => updateSetting('particle.step', parseFloat(e.target.value))}
                className="w-full accent-teal-500"
              />
            </SettingItem>

            <SettingItem label="粒子大小" description={`${settings.particle.particleSize}px`}>
              <input
                type="range"
                min="1"
                max="8"
                step="0.2"
                value={settings.particle.particleSize}
                onChange={e => updateSetting('particle.particleSize', parseFloat(e.target.value))}
                className="w-full accent-teal-500"
              />
            </SettingItem>

            <SettingItem label="排斥力" description={`${settings.particle.repelForce}`}>
              <input
                type="range"
                min="0"
                max="200"
                step="10"
                value={settings.particle.repelForce}
                onChange={e => updateSetting('particle.repelForce', parseInt(e.target.value))}
                className="w-full accent-teal-500"
              />
            </SettingItem>

            <SettingItem label="水平偏移" description={`${settings.particle.offsetX ?? 0}px`}>
              <input
                type="range"
                min="-300"
                max="300"
                step="10"
                value={settings.particle.offsetX ?? 0}
                onChange={e => updateSetting('particle.offsetX', parseInt(e.target.value))}
                className="w-full accent-teal-500"
              />
            </SettingItem>

            <SettingItem label="垂直偏移" description={`${settings.particle.offsetY ?? 0}px`}>
              <input
                type="range"
                min="-300"
                max="300"
                step="10"
                value={settings.particle.offsetY ?? 0}
                onChange={e => updateSetting('particle.offsetY', parseInt(e.target.value))}
                className="w-full accent-teal-500"
              />
            </SettingItem>
          </div>
        )}

        {/* Background Settings */}
        {activeTab === 'background' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => updateSetting('background.type', 'color')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                  settings.background.type === 'color'
                    ? 'bg-teal-500 text-white'
                    : 'bg-white/50 text-slate-600 hover:bg-white/70'
                }`}
              >
                单色
              </button>
              <button
                onClick={() => updateSetting('background.type', 'image')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                  settings.background.type === 'image'
                    ? 'bg-teal-500 text-white'
                    : 'bg-white/50 text-slate-600 hover:bg-white/70'
                }`}
              >
                图片
              </button>
              <button
                onClick={() => updateSetting('background.type', 'particle')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                  settings.background.type === 'particle'
                    ? 'bg-teal-500 text-white'
                    : 'bg-white/50 text-slate-600 hover:bg-white/70'
                }`}
              >
                粒子
              </button>
            </div>

            {settings.background.type === 'color' && (
              <SettingItem label="背景颜色">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.background.color}
                    onChange={e => updateSetting('background.color', e.target.value)}
                    className="w-10 h-8 rounded cursor-pointer border border-white/50"
                  />
                  <input
                    type="text"
                    value={settings.background.color}
                    onChange={e => updateSetting('background.color', e.target.value)}
                    className="flex-1 bg-white/60 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-mono border border-white/50"
                  />
                </div>
              </SettingItem>
            )}

            {settings.background.type === 'image' && (
              <>
                <SettingItem label="图片 URL">
                  <input
                    type="text"
                    placeholder="输入图片地址..."
                    value={settings.background.image}
                    onChange={e => updateSetting('background.image', e.target.value)}
                    className="w-full bg-white/60 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder-slate-400 border border-white/50"
                  />
                </SettingItem>
                <SettingItem label="图片适配">
                  <div className="flex gap-1">
                    {bgFits.map(fit => (
                      <button
                        key={fit.value}
                        onClick={() => updateSetting('background.fit', fit.value)}
                        className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                          settings.background.fit === fit.value
                            ? 'bg-teal-500 text-white'
                            : 'bg-white/50 text-slate-600 hover:bg-white/70'
                        }`}
                      >
                        {fit.label}
                      </button>
                    ))}
                  </div>
                </SettingItem>
              </>
            )}

            {settings.background.type === 'particle' && (
              <div className="text-xs text-slate-500 text-center py-2">
                粒子效果将平铺在背景上
              </div>
            )}
          </div>
        )}

        {/* Dialog Settings */}
        {activeTab === 'dialog' && (
          <div className="space-y-4">
            <SettingItem label="位置">
              <div className="flex gap-1 flex-wrap">
                {positions.map(pos => (
                  <button
                    key={pos.value}
                    onClick={() => updateSetting('dialog.position', pos.value)}
                    className={`px-3 py-1.5 rounded text-xs transition-colors ${
                      settings.dialog.position === pos.value
                        ? 'bg-teal-500 text-white'
                        : 'bg-white/50 text-slate-600 hover:bg-white/70'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </SettingItem>

            <SettingItem label="水平偏移" description={`${settings.dialog.offsetX || 0}px`}>
              <input
                type="range"
                min="-200"
                max="200"
                step="10"
                value={settings.dialog.offsetX || 0}
                onChange={e => updateSetting('dialog.offsetX', parseInt(e.target.value))}
                className="w-full accent-teal-500"
              />
            </SettingItem>

            <SettingItem label="宽度" description={`${settings.dialog.width}%`}>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={settings.dialog.width}
                onChange={e => updateSetting('dialog.width', parseInt(e.target.value))}
                className="w-full accent-teal-500"
              />
            </SettingItem>

            <SettingItem label="透明度" description={`${Math.round(settings.dialog.opacity * 100)}%`}>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.1"
                value={settings.dialog.opacity}
                onChange={e => updateSetting('dialog.opacity', parseFloat(e.target.value))}
                className="w-full accent-teal-500"
              />
            </SettingItem>
          </div>
        )}

        {/* Interaction Settings */}
        {activeTab === 'interaction' && (
          <div className="space-y-4">
            <ToggleItem
              label="自动眨眼"
              description="模型会自动眨眼"
              checked={settings.interaction.autoBlink}
              onChange={v => updateSetting('interaction.autoBlink', v)}
            />

            <ToggleItem
              label="空闲动画"
              description="模型空闲时有小动作"
              checked={settings.interaction.idleAnimation}
              onChange={v => updateSetting('interaction.idleAnimation', v)}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-white/30 border-t border-white/50">
        <button
          onClick={() => {
            const saved = localStorage.getItem('live2d-settings')
            if (saved) {
              const original = JSON.parse(saved)
              Object.keys(original).forEach(key => {
                Object.keys(original[key]).forEach(subKey => {
                  updateSetting(`${key}.${subKey}`, original[key][subKey])
                })
              })
            }
          }}
          className="w-full py-2 text-xs text-slate-500 hover:text-teal-600 transition-colors"
        >
          恢复默认设置
        </button>
      </div>
    </motion.div>
  )
}

function SettingItem({ label, description, children }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-slate-600 text-xs font-medium">{label}</span>
        {description && <span className="text-slate-400 text-xs font-mono">{description}</span>}
      </div>
      {children}
    </div>
  )
}

function ToggleItem({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-slate-600 text-xs font-medium">{label}</div>
        <div className="text-slate-400 text-[10px] mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-teal-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

export default SettingsPanel
