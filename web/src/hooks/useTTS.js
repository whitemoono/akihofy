import { useState, useCallback, useRef } from 'react'
import { textToSpeech, getAudioUrl } from '../lib/api'

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudio, setCurrentAudio] = useState(null)
  const audioRef = useRef(null)

  const speak = useCallback(async (text, options = {}) => {
    try {
      if (currentAudio) {
        currentAudio.pause()
        setCurrentAudio(null)
      }

      setIsPlaying(true)

      const result = await textToSpeech(text, options)
      const audioUrl = getAudioUrl(result.data.filename)

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
        setCurrentAudio(null)
      }

      audio.onerror = () => {
        setIsPlaying(false)
        setCurrentAudio(null)
      }

      await audio.play()
      setCurrentAudio(audio)

      return result
    } catch (error) {
      console.error('TTS error:', error)
      setIsPlaying(false)
      throw error
    }
  }, [currentAudio])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(false)
    setCurrentAudio(null)
  }, [])

  return { speak, stop, isPlaying }
}
