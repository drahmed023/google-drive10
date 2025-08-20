import React, { useState, useEffect } from 'react'
import { Calendar, Plus, Clock, BookOpen, GraduationCap, FileText } from 'lucide-react'
import { supabase, StudyEvent, StudySession } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function StudyCalendar() {
  const [events, setEvents] = useState<StudyEvent[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'study' as 'study' | 'exam' | 'lecture' | 'assignment',
    start_date: '',
    end_date: '',
    subject: ''
  })

  useEffect(() => {
    if (user) {
      fetchEvents()
      fetchSessions()
    }
  }, [user, currentMonth])

  const fetchEvents = async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('study_events')
        .select('*')
        .eq('user_id', user?.id)
        .gte('start_date', startOfMonth.toISOString())
        .lte('start_date', endOfMonth.toISOString())
        .order('start_date', { ascending: true })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const fetchSessions = async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.start_date) return

    try {
      const { error } = await supabase
        .from('study_events')
        .insert({
          user_id: user!.id,
          ...formData,
          end_date: formData.end_date || null
        })

      if (error) throw error
      toast.success('Event created successfully!')
      resetForm()
      fetchEvents()
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error('Failed to create event')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'study',
      start_date: '',
      end_date: '',
      subject: ''
    })
    setShowAddForm(false)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => 
      event.start_date.split('T')[0] === dateStr
    )
  }

  const getSessionsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return sessions.filter(session => 
      session.created_at.split('T')[0] === dateStr
    )
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'exam': return <GraduationCap className="w-3 h-3" />
      case 'lecture': return <BookOpen className="w-3 h-3" />
      case 'assignment': return <FileText className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'exam': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'lecture': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'assignment': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
  }

  const days = getDaysInMonth(currentMonth)
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1)
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1)
      }
      return newMonth
    })
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Study Calendar
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Add New Event</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Event title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value as any })}
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="study">Study Session</option>
                <option value="exam">Exam</option>
                <option value="lecture">Lecture</option>
                <option value="assignment">Assignment</option>
              </select>
            </div>
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
              <input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add Event
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            ←
          </button>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-20"></div>
            }

            const dayEvents = getEventsForDate(day)
            const daySessions = getSessionsForDate(day)
            const isToday = day.toDateString() === new Date().toDateString()
            const isSelected = day.toDateString() === selectedDate.toDateString()

            return (
              <div
                key={index}
                onClick={() => setSelectedDate(day)}
                className={`h-20 p-1 border border-gray-200 dark:border-gray-600 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  isToday ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300' : ''
                } ${isSelected ? 'ring-2 ring-purple-500' : ''}`}
              >
                <div className={`text-sm font-medium ${
                  isToday ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'
                }`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1 mt-1">
                  {dayEvents.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className={`text-xs px-1 py-0.5 rounded flex items-center gap-1 ${getEventTypeColor(event.event_type)}`}
                      title={event.title}
                    >
                      {getEventTypeIcon(event.event_type)}
                      <span className="truncate">{event.title}</span>
                    </div>
                  ))}
                  {daySessions.length > 0 && (
                    <div className="text-xs px-1 py-0.5 rounded bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{daySessions.length} session{daySessions.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h4>
          
          <div className="space-y-3">
            {getEventsForDate(selectedDate).map(event => (
              <div key={event.id} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className={`p-2 rounded-lg ${getEventTypeColor(event.event_type)}`}>
                  {getEventTypeIcon(event.event_type)}
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-gray-800 dark:text-white">{event.title}</h5>
                  {event.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{event.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{new Date(event.start_date).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}</span>
                    {event.subject && <span>Subject: {event.subject}</span>}
                  </div>
                </div>
              </div>
            ))}
            
            {getSessionsForDate(selectedDate).map(session => (
              <div key={session.id} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="p-2 rounded-lg bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-gray-800 dark:text-white">Study Session: {session.subject}</h5>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{session.duration} minutes</span>
                    <span>{new Date(session.created_at).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}</span>
                  </div>
                  {session.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{session.notes}</p>
                  )}
                </div>
              </div>
            ))}
            
            {getEventsForDate(selectedDate).length === 0 && getSessionsForDate(selectedDate).length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No events or study sessions on this day
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}