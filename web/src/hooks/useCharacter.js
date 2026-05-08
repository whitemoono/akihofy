import { useState, useCallback, useEffect, useRef } from 'react'

const MOODS = {
  happy: { icon: '(*^▽^*)', text: '开心', color: 'text-primary-500', name: '秋穗 Akiho', title: '镜野的守望者' },
  sad: { icon: '(；へ：)', text: '难过', color: 'text-blue-400', name: '秋穗 Akiho', title: '镜野的守望者' },
  angry: { icon: '(╬ Ò﹏Ó)', text: '生气', color: 'text-red-400', name: '秋穗 Akiho', title: '镜野的守望者' },
  shy: { icon: '(⁄ ⁄•⁄ω⁄•⁄ ⁄)', text: '害羞', color: 'text-pink-400', name: '秋穗 Akiho', title: '镜野的守望者' },
  sleepy: { icon: '(－ω－) zzZ', text: '困了', color: 'text-purple-400', name: '秋穗 Akiho', title: '镜野的守望者' },
  excited: { icon: '(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧', text: '兴奋', color: 'text-mint', name: '秋穗 Akiho', title: '镜野的守望者' },
  neutral: { icon: '(・∀・)', text: '一般', color: 'text-gray-500', name: '秋穗 Akiho', title: '镜野的守望者' }
}

/**
 * PAD 情绪分类映射
 * P (Pleasure): 效价，正向vs负向
 * A (Arousal): 唤醒度，高vs低
 * D (Dominance): 支配度，控制vs被控制
 */
function padToMood(pleasure, arousal, dominance) {
  // 高愉悦 + 高唤醒 = 兴奋/开心
  if (pleasure > 0.3 && arousal > 0.3) {
    if (arousal > 0.6) return 'excited'
    return 'happy'
  }
  // 低愉悦 + 高唤醒 = 愤怒/焦虑
  if (pleasure < -0.3 && arousal > 0.3) {
    if (dominance > 0) return 'angry'
    return 'sad'
  }
  // 高愉悦 + 低唤醒 = 平静/满足
  if (pleasure > 0.3 && arousal <= 0.3) {
    return 'neutral'
  }
  // 低愉悦 + 低唤醒 = 悲伤/冷漠
  if (pleasure < -0.3 && arousal <= 0.3) {
    return 'sad'
  }
  // 中性区域
  return 'neutral'
}

export function useCharacter(onAutonomousMessage) {
  const [mood, setMood] = useState('happy')
  const [energy, setEnergy] = useState(85)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [thought, setThought] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  // WebSocket 连接
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws`
    let reconnectTimer = null

    const connect = () => {
      // 清理旧连接
      if (wsRef.current) {
        wsRef.current.onclose = null  // 防止 onclose 递归
        wsRef.current.onerror = null
        if (wsRef.current.readyState === WebSocket.CONNECTING ||
            wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close()
        }
        wsRef.current = null
      }

      try {
        wsRef.current = new WebSocket(wsUrl)

        wsRef.current.onopen = () => {
          setWsConnected(true)
        }

        wsRef.current.onclose = () => {
          setWsConnected(false)
          // 清理定时器，防止重复连接
          if (reconnectTimer) {
            clearTimeout(reconnectTimer)
            reconnectTimer = null
          }
          // 5秒后重连（增加延迟避免频繁重连）
          reconnectTimer = setTimeout(connect, 5000)
        }

        wsRef.current.onerror = () => {
          setWsConnected(false)
        }

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            // 检查是否是主动发言事件
            if (data.type === 'autonomous_message') {
              if (onAutonomousMessage) {
                onAutonomousMessage(data)
              }
              return
            }

            // 处理两种格式：直接数据或包装格式
            // 后端返回 {type, data: {code, data: {...}}} 或 {type, data: {...}}
            let state = data.data
            if (state?.data) {
              state = state.data  // 解包双层嵌套
            }

            if (state.emotion) {
              // 从后端同步 PAD 值
              const { pleasure, arousal, dominance, category, name } = state.emotion

              // PAD 反推 mood
              const derivedMood = padToMood(pleasure, arousal, dominance)
              setMood(derivedMood)
            }

            // 同步能量值
            if (state.energy !== undefined) {
              setEnergy(Math.round(state.energy * 100))
            }
          } catch (e) {
            console.warn('Failed to parse WebSocket message:', e)
          }
        }
      } catch (err) {
        console.error('WebSocket connection failed:', err)
        // 使用 local 定时器
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(connect, 5000)
        }
      }
    }

    connect()

    return () => {
      // 清理所有定时器和连接
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.onerror = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [onAutonomousMessage])

  const updateMood = useCallback((newMood) => {
    // 允许手动覆盖，但在有后端数据时会自动同步
    if (MOODS[newMood]) {
      setMood(newMood)
    }
  }, [])

  const updateEnergy = useCallback((delta) => {
    setEnergy(prev => Math.max(0, Math.min(100, prev + delta)))
  }, [])

  const startSpeaking = useCallback(() => {
    setIsSpeaking(true)
  }, [])

  const stopSpeaking = useCallback(() => {
    setIsSpeaking(false)
  }, [])

  const showThought = useCallback((text, duration = 3000) => {
    setThought(text)
    setTimeout(() => setThought(null), duration)
  }, [])

  const getMoodInfo = useCallback(() => {
    return MOODS[mood] || MOODS.neutral
  }, [mood])

  return {
    mood,
    energy,
    isSpeaking,
    thought,
    wsConnected,
    updateMood,
    updateEnergy,
    startSpeaking,
    stopSpeaking,
    showThought,
    getMoodInfo,
    MOODS
  }
}
