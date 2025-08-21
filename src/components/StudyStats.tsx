import React, { useState, useEffect } from 'react'
import { Clock, BookOpen, TrendingUp, Calendar, Award, Target, Brain, Zap, Trophy, Star } from 'lucide-react'
import { supabase, StudySession, Task } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function StudyStats() {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchStudySessions()
      fetchTasks()
    }
  }, [user])

  const fetchStudySessions = async () => {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching study sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const getStats = () => {
    const totalMinutes = sessions.reduce((sum, session) => sum + session.duration, 0)
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10
    const totalSessions = sessions.length
    
    // Task statistics
    const completedTasks = tasks.filter(task => task.completed).length
    const pendingTasks = tasks.filter(task => !task.completed).length
    const overdueTasks = tasks.filter(task => 
      !task.completed && task.due_date && new Date(task.due_date) < new Date()
    ).length
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todaySessions = sessions.filter(session => 
      new Date(session.created_at) >= today
    )
    const todayMinutes = todaySessions.reduce((sum, session) => sum + session.duration, 0)

    const thisWeek = new Date()
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay())
    thisWeek.setHours(0, 0, 0, 0)
    const weekSessions = sessions.filter(session => 
      new Date(session.created_at) >= thisWeek
    )
    const weekMinutes = weekSessions.reduce((sum, session) => sum + session.duration, 0)

    const subjects = sessions.reduce((acc, session) => {
      acc[session.subject] = (acc[session.subject] || 0) + session.duration
      return acc
    }, {} as Record<string, number>)

    const topSubject = Object.entries(subjects).sort(([,a], [,b]) => b - a)[0]

    // Study streak calculation
    let currentStreak = 0
    let maxStreak = 0
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    
    const studyDates = new Set(
      sortedSessions.map(session => 
        new Date(session.created_at).toDateString()
      )
    )
    
    // Calculate current streak
    let checkDate = new Date()
    while (studyDates.has(checkDate.toDateString())) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    }
    
    // Calculate max streak
    const allDates = Array.from(studyDates).sort()
    let tempStreak = 0
    for (let i = 0; i < allDates.length; i++) {
      tempStreak = 1
      for (let j = i + 1; j < allDates.length; j++) {
        const prevDate = new Date(allDates[j - 1])
        const currDate = new Date(allDates[j])
        const diffTime = currDate.getTime() - prevDate.getTime()
        const diffDays = diffTime / (1000 * 60 * 60 * 24)
        
        if (diffDays === 1) {
          tempStreak++
        } else {
          break
        }
      }
      maxStreak = Math.max(maxStreak, tempStreak)
    }

    return {
      totalHours,
      totalSessions,
      todayMinutes,
      weekMinutes,
      topSubject: topSubject ? { name: topSubject[0], minutes: topSubject[1] } : null,
      subjects,
      completedTasks,
      pendingTasks,
      overdueTasks,
      currentStreak,
      maxStreak
    }
  }

  const stats = getStats()

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const getLast7Days = () => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      
      const daysSessions = sessions.filter(session => {
        const sessionDate = new Date(session.created_at)
        return sessionDate >= date && sessionDate < nextDay
      })
      
      const dayMinutes = daysSessions.reduce((sum, session) => sum + session.duration, 0)
      
      days.push({
        date: date.getDate(),
        minutes: dayMinutes,
        day: date.toLocaleDateString('en-US', { weekday: 'short' })
      })
    }
    return days
  }

  const weekData = getLast7Days()
  const maxMinutes = Math.max(...weekData.map(d => d.minutes), 1)

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8" />
            <div className="text-2xl font-bold">{stats.totalHours}h</div>
          </div>
          <div className="text-purple-100">Total Study Time</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <BookOpen className="w-8 h-8" />
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
          </div>
          <div className="text-blue-100">Study Sessions</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-8 h-8" />
            <div className="text-2xl font-bold">{formatMinutes(stats.todayMinutes)}</div>
          </div>
          <div className="text-green-100">Today's Progress</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8" />
            <div className="text-2xl font-bold">{formatMinutes(stats.weekMinutes)}</div>
          </div>
          <div className="text-orange-100">This Week</div>
        </div>
      </div>
      
      {/* Additional Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Trophy className="w-8 h-8" />
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
          </div>
          <div className="text-indigo-100">Tasks Completed</div>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Zap className="w-8 h-8" />
            <div className="text-2xl font-bold">{stats.currentStreak}</div>
          </div>
          <div className="text-pink-100">Current Streak (days)</div>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Star className="w-8 h-8" />
            <div className="text-2xl font-bold">{stats.maxStreak}</div>
          </div>
          <div className="text-teal-100">Best Streak</div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Brain className="w-8 h-8" />
            <div className="text-2xl font-bold">{stats.pendingTasks}</div>
          </div>
          <div className="text-cyan-100">Pending Tasks</div>
        </div>
      </div>

      {/* Task Overview */}
      {stats.overdueTasks > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
              <Target className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">
                {stats.overdueTasks} Overdue Task{stats.overdueTasks > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-600 dark:text-red-300">
                You have tasks that need immediate attention
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Weekly Progress
          </h3>
          <div className="flex items-end justify-between h-32 gap-2">
            {weekData.map((day, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="bg-gradient-to-t from-purple-600 to-purple-400 rounded-t w-full transition-all duration-300 hover:from-purple-700 hover:to-purple-500"
                  style={{ 
                    height: `${(day.minutes / maxMinutes) * 100}%`,
                    minHeight: day.minutes > 0 ? '4px' : '0'
                  }}
                  title={`${day.minutes} minutes`}
                ></div>
                <div className="text-xs text-gray-600 mt-2 font-medium">{day.day}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Top Subjects
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.subjects)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([subject, minutes], index) => (
                <div key={subject} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${
                      index === 0 ? 'from-purple-500 to-purple-600' :
                      index === 1 ? 'from-blue-500 to-blue-600' :
                      index === 2 ? 'from-green-500 to-green-600' :
                      index === 3 ? 'from-yellow-500 to-yellow-600' :
                      'from-gray-500 to-gray-600'
                    }`}></div>
                    <span className="font-medium text-gray-800">{subject}</span>
                  </div>
                  <span className="text-gray-600">{formatMinutes(minutes)}</span>
                </div>
              ))}
            {Object.keys(stats.subjects).length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No study sessions yet. Start your first session!
              </div>
            )}
          </div>
        </div>
      </div>

      {sessions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Recent Sessions
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {sessions.slice(0, 10).map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-800">{session.subject}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(session.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  {session.notes && (
                    <div className="text-sm text-gray-500 mt-1 italic">{session.notes}</div>
                  )}
                </div>
                <div className="font-semibold text-purple-600">
                  {formatMinutes(session.duration)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}