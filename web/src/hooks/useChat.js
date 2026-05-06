import { useState, useCallback, useRef, useEffect } from 'react'

const API_BASE = '' // 通过 Vite 代理，走相对路径
const STORAGE_KEY = 'akiho_messages'
const SESSION_KEY = 'akiho_current_session'

const DEFAULT_WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content: '你好呀... 我是 AKIHO。\n虽然现在还有点困，但... 见到你还是很开心。',
  timestamp: Date.now()
}

// 获取当前会话 ID
const getCurrentSessionId = () => {
  let sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = `session_${Date.now()}`
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

// 获取会话存储键
const getSessionStorageKey = (sessionId) => `${STORAGE_KEY}_${sessionId}`

// 加载消息
const loadMessages = () => {
  try {
    const sessionId = getCurrentSessionId()
    const stored = localStorage.getItem(getSessionStorageKey(sessionId))
    if (stored) {
      const messages = JSON.parse(stored)
      if (Array.isArray(messages) && messages.length > 0) {
        return messages
      }
    }
  } catch (e) {
    console.warn('Failed to load messages:', e)
  }
  return [DEFAULT_WELCOME]
}

// 保存消息
const saveMessages = (messages) => {
  try {
    const sessionId = getCurrentSessionId()
    localStorage.setItem(getSessionStorageKey(sessionId), JSON.stringify(messages))
  } catch (e) {
    console.warn('Failed to save messages:', e)
  }
}

export function useChat() {
  const [messages, setMessages] = useState(loadMessages)
  const [isTyping, setIsTyping] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const typingTimeoutRef = useRef(null)
  const currentStreamingMessageRef = useRef(null)

  // 保存消息到 localStorage
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages)
    }
  }, [messages])

  const addMessage = useCallback((message) => {
    setMessages(prev => {
      const newMessages = [...prev, {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        ...message
      }]
      return newMessages
    })
  }, [])

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isTyping) return

    addMessage({
      role: 'user',
      content: content.trim()
    })

    setIsTyping(true)

    try {
      // 首先尝试流式响应
      try {
        const response = await fetch(`${API_BASE}/api/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content.trim() })
        })

        if (response.ok && response.body) {
          // 流式响应处理
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let fullContent = ''

          // 创建初始消息
          const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          currentStreamingMessageRef.current = messageId

          setMessages(prev => [...prev, {
            id: messageId,
            role: 'assistant',
            content: '',
            streaming: true,
            timestamp: Date.now()
          }])

          setIsStreaming(true)

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            fullContent += chunk

            // 更新当前消息内容
            setMessages(prev => prev.map(msg =>
              msg.id === messageId
                ? { ...msg, content: fullContent }
                : msg
            ))
          }

          // 完成流式响应
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? { ...msg, streaming: false }
              : msg
          ))

          setIsStreaming(false)
          currentStreamingMessageRef.current = null
          return true
        }
      } catch (streamError) {
        console.warn('Stream API not available, falling back to regular API:', streamError)
      }

      // 回退到普通 API
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content.trim() })
      })

      const data = await response.json()

      // 后端返回 ChatResponse 直接对象: { response, emotion, status, timestamp }
      const responseText = data.response
      if (responseText) {
        // 使用流式方式显示消息
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        setMessages(prev => [...prev, {
          id: messageId,
          role: 'assistant',
          content: '',
          streaming: true,
          timestamp: Date.now()
        }])

        setIsStreaming(true)

        // 逐字显示效果
        for (let i = 0; i < responseText.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 30))
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? { ...msg, content: responseText.slice(0, i + 1) }
              : msg
          ))
        }

        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, streaming: false }
            : msg
        ))

        setIsStreaming(false)
      } else {
        addMessage({
          role: 'assistant',
          content: '抱歉，出了点问题... 稍后再试试吧。'
        })
      }
    } catch (error) {
      console.error('Chat error:', error)
      addMessage({
        role: 'assistant',
        content: '抱歉，连接出了问题... 检查一下网络吧。'
      })
    } finally {
      setIsTyping(false)
      setIsStreaming(false)
    }

    return true
  }, [addMessage, isTyping])

  // 清除当前会话
  const clearMessages = useCallback(() => {
    setMessages([DEFAULT_WELCOME])
  }, [])

  // 开始新会话
  const startNewSession = useCallback(() => {
    const newSessionId = `session_${Date.now()}`
    localStorage.setItem(SESSION_KEY, newSessionId)
    setMessages([DEFAULT_WELCOME])
  }, [])

  // 获取会话列表
  const getSessionList = useCallback(() => {
    const sessions = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY)) {
        const sessionId = key.replace(`${STORAGE_KEY}_`, '')
        try {
          const messages = JSON.parse(localStorage.getItem(key))
          if (messages.length > 1) { // 排除只有欢迎消息的会话
            sessions.push({
              id: sessionId,
              title: messages[1]?.content?.slice(0, 30) + '...' || '新对话',
              preview: messages[1]?.content || '',
              date: new Date(messages[messages.length - 1]?.timestamp || Date.now()).toLocaleString('zh-CN'),
              messageCount: messages.length,
              lastMessage: messages[messages.length - 1]
            })
          }
        } catch (e) {
          console.warn('Failed to parse session:', key)
        }
      }
    }
    return sessions.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [])

  // 切换到指定会话
  const switchSession = useCallback((sessionId) => {
    localStorage.setItem(SESSION_KEY, sessionId)
    const stored = localStorage.getItem(getSessionStorageKey(sessionId))
    if (stored) {
      try {
        const messages = JSON.parse(stored)
        if (messages.length > 0) {
          setMessages(messages)
          return true
        }
      } catch (e) {
        console.warn('Failed to load session:', sessionId)
      }
    }
    return false
  }, [])

  // 获取当前会话 ID
  const getCurrentSession = useCallback(() => {
    return getCurrentSessionId()
  }, [])

  return {
    messages,
    isTyping,
    isStreaming,
    sendMessage,
    addMessage,
    clearMessages,
    startNewSession,
    getSessionList,
    switchSession,
    getCurrentSession
  }
}
