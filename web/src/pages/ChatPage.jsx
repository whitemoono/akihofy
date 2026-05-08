/**
 * AKIHO 主聊天页面
 * 包含 Live2D 角色渲染和对话界面
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Live2DViewer } from '../components/Character/Live2DViewer'
import { ParticleViewer } from '../components/Character/ParticleViewer'
import { BackgroundParticles } from '../components/Background/BackgroundParticles'
import { useChat } from '../hooks/useChat'
import { useCharacter } from '../hooks/useCharacter'
import { useTTS } from '../hooks/useTTS'
import { useLive2DSettingsShared as useLive2DSettings } from '../components/Character/SettingsPanel'
import { MonitorPanel } from '../components/Monitor/MonitorPanel'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { Activity, Send, Sparkles, MessageSquare, Plus, ChevronLeft, Clock, Trash2 } from 'lucide-react'

const DEFAULT_SETTINGS = {
  voice: 'zh-CN-XiaobaiNeural',
  speed: 1.0,
  pitch: 1.0,
  enableTTS: true,
  showThought: true
}

export function ChatPage() {
  const [settings] = useState(DEFAULT_SETTINGS)
  const [inputValue, setInputValue] = useState('')
  const [showMonitor, setShowMonitor] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const { settings: live2dSettings, updateSetting: updateLive2DSetting } = useLive2DSettings()
  const { messages, isTyping, isStreaming, sendMessage, addMessage, clearMessages, startNewSession, getSessionList, switchSession, getCurrentSession } = useChat()

  // 处理主动发言
  const handleAutonomousMessage = useCallback((event) => {
    console.log('收到主动发言:', event)
    // 将主动发言添加到消息列表
    addMessage({
      role: 'assistant',
      content: event.content,
      isSpontaneous: true,
      reasoning: event.reasoning,
      timestamp: event.timestamp
    })
  }, [addMessage])

  const { mood, isSpeaking, updateMood, startSpeaking, stopSpeaking, getMoodInfo } = useCharacter(handleAutonomousMessage)
  const { speak, isPlaying } = useTTS()
  const [sessions, setSessions] = useState([])

  // 加载会话列表
  useEffect(() => {
    setSessions(getSessionList())
  }, [getSessionList, messages])

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // GSAP 入场动画
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.glass-panel', {
        x: 30,
        opacity: 0,
        duration: 1.2,
        ease: 'expo.out',
        delay: 0.2
      })
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

  // 处理新会话
  const handleNewSession = () => {
    startNewSession()
    setSessions(getSessionList())
    setShowSidebar(false)
  }

  // 处理切换会话
  const handleSwitchSession = (sessionId) => {
    switchSession(sessionId)
    setSessions(getSessionList())
    setShowSidebar(false)
  }

  // 处理清除当前会话
  const handleClearSession = () => {
    if (confirm('确定要清除当前对话吗？')) {
      clearMessages()
    }
  }

  return (
    <div className="h-screen w-full flex relative overflow-hidden"
         style={{
           background: live2dSettings.background.type === 'color'
             ? live2dSettings.background.color
             : 'linear-gradient(135deg, #f0fdfa 0%, #ecfeff 50%, #f0f9ff 100%)'
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

      {/* 背景粒子效果 */}
      {live2dSettings.background.type === 'particle' && (
        <BackgroundParticles />
      )}

      {/* 动态背景光效 */}
      <div className="ambient-glow top-[-20%] left-[-10%]" />
      <div className="ambient-glow bottom-[-20%] right-[-10%]" style={{ animationDelay: '-5s' }} />

          {/* 角色渲染层 */}
          <div className="w-full h-full relative">
            {/* 顶部工具栏 */}
            <div className="absolute top-4 right-4 z-[60] flex items-center gap-2">
              {/* 会话历史按钮 */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSidebar(!showSidebar)}
                className="w-10 h-10 rounded-xl bg-white/50 backdrop-blur-sm flex items-center justify-center text-slate-600 hover:text-teal-600 hover:bg-white/80 transition-all shadow-lg border border-white/50"
                title="会话历史"
              >
                <MessageSquare className="w-5 h-5" />
              </motion.button>
              {/* 监控面板按钮 */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMonitor(true)}
                className="w-10 h-10 rounded-xl bg-white/50 backdrop-blur-sm flex items-center justify-center text-slate-600 hover:text-teal-600 hover:bg-white/80 transition-all shadow-lg border border-white/50"
                title="打开监控面板"
              >
                <Activity className="w-5 h-5" />
              </motion.button>
            </div>

            {/* 条件渲染角色组件 */}
            {live2dSettings.character.type === 'live2d' ? (
              <Live2DViewer
                mood={mood}
                isSpeaking={isSpeaking || isPlaying || isStreaming}
                settings={{
                  ...live2dSettings,
                  model: {
                    ...live2dSettings.model,
                    path: live2dSettings.character.modelPath
                  }
                }}
              />
            ) : (
              <ParticleViewer
                mood={mood}
                isSpeaking={isSpeaking || isPlaying || isStreaming}
                settings={live2dSettings}
              />
            )}
          </div>

      {/* 会话历史侧边栏 */}
      <AnimatePresence>
        {showSidebar && (
          <>
            {/* 遮罩层 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-[70]"
              onClick={() => setShowSidebar(false)}
            />
            {/* 侧边栏 */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white/95 backdrop-blur-xl z-[80] shadow-2xl flex flex-col"
            >
              {/* 头部 */}
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-slate-800">会话历史</h2>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <button
                  onClick={handleNewSession}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新建对话
                </button>
              </div>

              {/* 会话列表 */}
              <div className="flex-1 overflow-y-auto p-2">
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无历史会话</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => handleSwitchSession(session.id)}
                        className={`w-full text-left p-3 rounded-xl transition-colors ${
                          session.id === getCurrentSession()
                            ? 'bg-teal-50 border border-teal-200'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {session.title}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {session.date}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {session.messageCount}条
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 底部操作 */}
              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={handleClearSession}
                  className="w-full flex items-center justify-center gap-2 py-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  清除当前对话
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 对话 UI 层 */}
      <main className="fixed inset-0 z-10 flex items-center justify-end pointer-events-none p-8">
        {/* 玻璃面板容器 */}
        <section
          className="glass-panel h-[75vh] rounded-[2rem] flex flex-col relative pointer-events-auto overflow-hidden shadow-glass-panel transition-all duration-300 ease-out"
          style={{
            width: `${live2dSettings.dialog.width}%`,
            maxWidth: '420px',
            opacity: live2dSettings.dialog.opacity,
            marginRight: `${live2dSettings.dialog.offsetX || 0}px`
          }}
        >
          {/* 头部 */}
          <header className="p-5 pb-3 flex justify-between items-start bg-gradient-to-b from-white/40 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-50 to-white flex items-center justify-center text-teal-500 shadow-sm border border-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-800 tracking-wide">
                  {getMoodInfo?.()?.name || '秋穗 Akiho'}
                </h1>
                <p className="text-[10px] text-teal-600/70 font-medium tracking-widest mt-0.5">
                  {getMoodInfo?.()?.title || '镜野的守望者'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] text-slate-400 font-mono">SYNC</span>
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 sync-indicator animate-pulse" />
            </div>
          </header>

          {/* 消息区域 */}
          <div className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-3" id="chat-stream">
            {/* 欢迎消息 */}
            {messages.length === 0 && !isTyping && (
              <div className="flex gap-2 max-w-[88%] msg-ai">
                <div className="bg-white/80 backdrop-blur-md p-4 px-4 rounded-2xl rounded-tl-sm border border-white text-[13px] leading-relaxed shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-slate-600">
                  水面的波纹平静下来了。<br />
                  今天想要一起看星星，还是听听稻穗摇曳的声音？
                </div>
              </div>
            )}

            {/* 消息列表 */}
            {messages.map((message, index) => {
              const isUser = message.role === 'user'
              const isSpontaneous = message.isSpontaneous
              const displayContent = message.content ?? ''
              return (
                <div key={message.id || index} className={`flex gap-2 max-w-[88%] ${isUser ? 'self-end flex-row-reverse msg-user' : 'msg-ai'}`}>
                  {isSpontaneous && (
                    <div className="absolute -top-6 left-2 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] rounded-full shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      主动发言
                    </div>
                  )}
                  <div className={`relative backdrop-blur-md p-3 px-4 rounded-2xl text-[13px] leading-relaxed ${
                    isUser
                      ? 'bg-teal-500/90 text-white rounded-tr-sm shadow-[0_4px_15px_rgba(45,164,168,0.2)] font-light'
                      : isSpontaneous
                        ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-tl-sm shadow-[0_2px_10px_rgba(251,191,36,0.1)] text-slate-600'
                        : 'bg-white/80 border border-white rounded-tl-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-slate-600'
                  }`}>
                    {isSpontaneous && message.reasoning && (
                      <div className="text-[10px] text-amber-500 mb-1 italic">
                        💭 {message.reasoning}
                      </div>
                    )}
                    {displayContent || '...'}
                  </div>
                </div>
              )
            })}

            {/* 打字中动画 */}
            {isTyping && (
              <div className="flex gap-2 max-w-[88%] msg-ai">
                <div className="bg-white/80 backdrop-blur-md p-3 px-4 rounded-2xl rounded-tl-sm border border-white text-slate-600">
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

            {/* 滚动锚点 */}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <footer className="p-5 pt-2 bg-gradient-to-t from-white/60 via-white/40 to-transparent">
            <div className="relative flex items-center group">
              <input
                ref={inputRef}
                type="text"
                placeholder="与秋穗交流..."
                className="glass-input w-full rounded-xl py-3 pl-5 pr-12 text-[13px] text-slate-700 placeholder-slate-400"
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
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (inputValue.trim()) {
                    handleSend(inputValue)
                    setInputValue('')
                  }
                }}
                className="absolute right-2 p-2 rounded-lg text-teal-500 hover:bg-teal-50 hover:text-teal-600 transition-all"
              >
                <Send className="w-4 h-4" />
              </motion.button>
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

export default ChatPage
