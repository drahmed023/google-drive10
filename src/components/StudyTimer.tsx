import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Settings, Coffee, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function StudyTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes default
  const [isActive, setIsActive] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [studyTime, setStudyTime] = useState(25)
  const [breakTime, setBreakTime] = useState(5)
  const [subject, setSubject] = useState('')
  const [notes, setNotes] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const { user } = useAuth()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            handleTimerComplete()
            return 0
          }
          return time - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive])

  const handleTimerComplete = () => {
    setIsActive(false)
    
    if (!isBreak && sessionStartTime) {
      // Save study session
      saveStudySession()
      toast.success('Study session completed! Take a break.')
      setIsBreak(true)
      setTimeLeft(breakTime * 60)
    } else {
      toast.success('Break completed! Ready for another study session?')
      setIsBreak(false)
      setTimeLeft(studyTime * 60)
    }
    
    // Play notification sound (using Web Audio API)
    playNotificationSound()
  }

  const saveStudySession = async () => {
    if (!user || !sessionStartTime || isBreak) return

    try {
      const duration = Math.round((Date.now() - sessionStartTime.getTime()) / 1000 / 60) // in minutes
      
      const { error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          subject: subject || 'General Study',
          duration,
          notes: notes || null
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving study session:', error)
    }
  }

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 1)
    } catch (error) {
      console.log('Audio notification not supported')
    }
  }

  const toggleTimer = () => {
    if (!isActive && !sessionStartTime && !isBreak) {
      setSessionStartTime(new Date())
    }
    setIsActive(!isActive)
  }

  const resetTimer = () => {
    setIsActive(false)
    setTimeLeft((isBreak ? breakTime : studyTime) * 60)
    setSessionStartTime(null)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = ((isBreak ? breakTime : studyTime) * 60 - timeLeft) / ((isBreak ? breakTime : studyTime) * 60) * 100

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          {isBreak ? <Coffee className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
          {isBreak ? 'Break Time' : 'Study Timer'}
        </h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Study Time (minutes)
              </label>
              <input
                type="number"
                value={studyTime}
                onChange={(e) => setStudyTime(Number(e.target.value))}
                min="1"
                max="120"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Break Time (minutes)
              </label>
              <input
                type="number"
                value={breakTime}
                onChange={(e) => setBreakTime(Number(e.target.value))}
                min="1"
                max="30"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What are you studying?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this study session..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
      )}

      <div className="text-center">
        <div className="relative inline-flex items-center justify-center w-48 h-48 mb-8">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke={isBreak ? "#10b981" : "#8b5cf6"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-4xl font-bold ${isBreak ? 'text-green-600' : 'text-purple-600'}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {isBreak ? 'Break' : subject || 'Study Session'}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={toggleTimer}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${
              isBreak 
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isActive ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={resetTimer}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all duration-200 transform hover:scale-105"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}