import { useState, useCallback, useEffect, useRef } from 'react'
import { Live2DViewer } from './components/Character/Live2DViewer'
import { ParticleViewer } from './components/Character/ParticleViewer'
import { BackgroundParticles } from './components/Background/BackgroundParticles'
import { useChat } from './hooks/useChat'
import { useCharacter } from './hooks/useCharacter'
import { useTTS } from './hooks/useTTS'
import { useLive2DSettings } from './components/Character/SettingsPanel'
import { MonitorPanel } from './components/Monitor/MonitorPanel'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { Activity } from 'lucide-react'

const DEFAULT_SETTINGS = {
  voice: 'zh-CN-XiaobaiNeural',
  speed: 1.0,
  pitch: 1.0,
  enableTTS: true,
  showThought: true
}

function App() {
  const [settings] = useState(DEFAULT_SETTINGS)
  const [inputValue, setInputValue] = useState('')
  const [showMonitor, setShowMonitor] = useState(false)
  const inputRef = useRef(null)
  const { settings: live2dSettings, updateSetting: updateLive2DSetting } = useLive2DSettings()
  const { messages, isTyping, sendMessage, addMessage } = useChat()
  const { mood, isSpeaking, updateMood, startSpeaking, stopSpeaking, getMoodInfo } = useCharacter()
  const { speak, isPlaying } = useTTS()

  // GSAP 入场动画
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 背景光效动画
      gsap.from('.ambient-glow', {
        opacity: 0,
        scale: 0.8,
        duration: 2,
        ease: 'power2.out'
      })

      // 玻璃面板滑入动画
      gsap.from('.glass-panel', {
        x: 30,
        opacity: 0,
        duration: 1.2,
        ease: 'expo.out',
        delay: 0.2
      })

      // 消息入场动画
      gsap.from('.msg-ai, .msg-user', {
        y: 15,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'back.out(1.2)',
        delay: 0.6
      })
    })

    return () => ctx.revert()
  }, [])

  // 发送消息
  const handleSend = useCallback(async (content) => {
    await sendMessage(content)
    updateMood(Math.random() > 0.5 ? 'happy' : 'excited')

    setTimeout(async () => {
      const lastAiMessage = messages[messages.length - 1]
      if (lastAiMessage && settings.enableTTS) {
        try {
          startSpeaking()
          await speak(lastAiMessage.content, {
            voice: settings.voice,
            rate: `+${(settings.speed - 1) * 100}%`,
            pitch: `+${(settings.pitch - 1) * 10}Hz`
          })
          stopSpeaking()
        } catch (error) {
          console.error('TTS error:', error)
          stopSpeaking()
        }
      }
    }, 2000)
  }, [sendMessage, updateMood, messages, settings, speak, startSpeaking, stopSpeaking])

  return (
    <div className="h-screen w-screen flex items-center justify-center relative text-slate-700 overflow-hidden"
         style={{
           background: live2dSettings.background.type === 'color'
             ? live2dSettings.background.color
             : 'transparent'
         }}>

      {/* 动态背景图片或颜色 */}
      {live2dSettings.background.type === 'image' && live2dSettings.background.image && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${live2dSettings.background.image})`,
            backgroundSize: live2dSettings.background.fit,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}
      {live2dSettings.background.type === 'color' && (
        <div
          className="absolute inset-0 z-0"
          style={{ background: live2dSettings.background.color }}
        />
      )}

      {/* 动态背景光效 */}
      <div className="ambient-glow top-[-20%] left-[-10%]" />
      <div className="ambient-glow bottom-[-20%] right-[-10%]" style={{ animationDelay: '-5s' }} />

      {/* 粒子背景 */}
      {live2dSettings.background.type === 'particle' && (
        <BackgroundParticles />
      )}

      {/* Live2D 模型渲染层 - 填满整个页面 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="w-full h-full relative">
          {/* 顶部工具栏 */}
          <div className="absolute top-4 right-4 z-[60] flex items-center gap-2">
            {/* 监控面板按钮 */}
            <button
              onClick={() => setShowMonitor(true)}
              className="w-10 h-10 rounded-xl bg-slate-900/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-slate-800/50 transition-all shadow-lg border border-white/10 pointer-events-auto"
              title="打开监控面板"
            >
              <Activity className="w-5 h-5" />
            </button>
            {/* 设置按钮 */}
            <a
              href="/settings"
              className="w-10 h-10 rounded-xl bg-slate-900/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-slate-800/50 transition-all shadow-lg border border-white/10 pointer-events-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </a>
          </div>

          {/* 角色组件 - 根据类型条件渲染 */}
          {live2dSettings.character.type === 'live2d' ? (
            <Live2DViewer
              mood={mood}
              isSpeaking={isSpeaking || isPlaying}
              settings={live2dSettings}
            />
          ) : (
            <ParticleViewer
              mood={mood}
              isSpeaking={isSpeaking || isPlaying}
              settings={live2dSettings}
            />
          )}
        </div>
      </div>

      {/* 前景：交互式 UI 层 */}
      <main className="fixed inset-0 z-10 flex items-center justify-end pointer-events-none p-12">
        {/* 玻璃面板容器 */}
        <section
          className="glass-panel h-[82vh] rounded-[2.5rem] flex flex-col relative pointer-events-auto overflow-hidden shadow-glass-panel transition-all duration-300 ease-out"
          style={{
            width: `${live2dSettings.dialog.width}%`,
            maxWidth: '420px',
            opacity: live2dSettings.dialog.opacity,
            marginRight: `${live2dSettings.dialog.offsetX || 0}px`
          }}
        >

          {/* 头部 */}
          <header className="p-6 pb-4 flex justify-between items-start bg-gradient-to-b from-white/40 to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-50 to-white flex items-center justify-center text-teal-500 shadow-sm border border-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-800 tracking-wide">
                  {getMoodInfo?.()?.name || '秋穗 Akiho'}
                </h1>
                <p className="text-[11px] text-teal-600/70 font-medium tracking-widest mt-1">
                  {getMoodInfo?.()?.title || '镜野的守望者'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-slate-400 font-mono">SYNC</span>
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 sync-indicator animate-pulse" />
            </div>
          </header>

          {/* 消息区域 */}
          <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col gap-4" id="chat-stream">
            {/* 欢迎消息 */}
            {messages.length === 0 && !isTyping && (
              <div className="flex gap-3 max-w-[88%] msg-ai">
                <div className="bg-white/80 backdrop-blur-md p-4 px-5 rounded-3xl rounded-tl-sm border border-white text-[14px] leading-relaxed shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-slate-600">
                  水面的波纹平静下来了。<br />今天想要一起看星星，还是听听稻穗摇曳的声音？
                </div>
              </div>
            )}

            {/* 消息列表 */}
            {messages.map((message, index) => {
              const isUser = message.role === 'user'
              return (
                <div key={message.id || index} className={`flex gap-3 max-w-[88%] ${isUser ? 'self-end flex-row-reverse msg-user' : 'msg-ai'}`}>
                  <div className={`backdrop-blur-md p-4 px-5 rounded-3xl text-[14px] leading-relaxed ${
                    isUser
                      ? 'bg-teal-500/90 text-white rounded-tr-sm shadow-[0_4px_15px_rgba(45,164,168,0.2)] font-light'
                      : 'bg-white/80 border border-white rounded-tl-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-slate-600'
                  }`}>
                    {message.content}
                  </div>
                </div>
              )
            })}

            {/* 打字中动画 */}
            {isTyping && (
              <div className="flex gap-3 max-w-[88%] msg-ai">
                <div className="bg-white/80 backdrop-blur-md p-4 px-5 rounded-3xl rounded-tl-sm border border-white text-slate-600">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-teal-400"
                        style={{
                          animation: 'bounce 0.6s ease-in-out infinite',
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 输入区域 */}
          <footer className="p-6 pt-2 bg-gradient-to-t from-white/60 via-white/40 to-transparent">
            <div className="relative flex items-center group">
              <input
                ref={inputRef}
                type="text"
                placeholder="与 秋穗 交流..."
                className="glass-input w-full rounded-2xl py-4 pl-6 pr-14 text-[14px] text-slate-700 placeholder-slate-400"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (inputValue.trim()) {
                      handleSend(inputValue)
                      setInputValue('')
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  if (inputValue.trim()) {
                    handleSend(inputValue)
                    setInputValue('')
                  }
                }}
                className="absolute right-2 p-2.5 rounded-xl text-teal-500 hover:bg-teal-50 hover:text-teal-600 transition-all duration-300 transform group-hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </button>
            </div>
          </footer>
        </section>
      </main>

      {/* 样式 */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>

      {/* 监控面板 */}
      <AnimatePresence>
        {showMonitor && (
          <MonitorPanel onClose={() => setShowMonitor(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
