import React, { useState, useEffect } from 'react'
import {
  Calendar, Clock, Plus, Upload, Download, Brain,
  Trash2, Edit2, CheckCircle, Bell, FileSpreadsheet,
  ChevronDown, ChevronUp, RefreshCw, Send
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface ScheduleItem {
  id?: string
  subject: string
  topic?: string
  day_of_week: number
  start_time: string
  end_time: string
  recurrence_pattern: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
  priority: 'low' | 'medium' | 'high'
  notes?: string
  completed: boolean
  color?: string
}

interface StudySchedule {
  id: string
  title: string
  description?: string
  schedule_type: 'manual' | 'imported_excel' | 'imported_csv' | 'ai_generated'
  is_active: boolean
  start_date?: string
  end_date?: string
  schedule_items?: ScheduleItem[]
}

interface Reminder {
  id?: string
  schedule_item_id: string
  reminder_time_minutes: number
  reminder_method: 'email'
  is_enabled: boolean
  language: 'ar' | 'en'
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const PRIORITIES = ['low', 'medium', 'high'] as const
const RECURRENCE = ['once', 'daily', 'weekly', 'biweekly', 'monthly'] as const
const REMINDER_TIMES = [10, 30, 60, 1440] as const

export function StudyScheduleManager() {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState<StudySchedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<StudySchedule | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [showAIOptimizer, setShowAIOptimizer] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<'ar' | 'en'>('en')

  const [newSchedule, setNewSchedule] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: ''
  })

  const [newItem, setNewItem] = useState<ScheduleItem>({
    subject: '',
    topic: '',
    day_of_week: 0,
    start_time: '09:00',
    end_time: '10:00',
    recurrence_pattern: 'weekly',
    priority: 'medium',
    notes: '',
    completed: false,
    color: '#3B82F6'
  })

  useEffect(() => {
    if (user) {
      loadSchedules()
    }
  }, [user])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('study_schedules')
        .select(`
          *,
          schedule_items(*)
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      setSchedules(data || [])
      if (data && data.length > 0 && !selectedSchedule) {
        setSelectedSchedule(data[0])
      }
    } catch (error: any) {
      toast.error('Failed to load schedules')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const createSchedule = async () => {
    if (!newSchedule.title.trim()) {
      toast.error('Please enter a title')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('study_schedules')
        .insert([{
          user_id: user?.id,
          title: newSchedule.title,
          description: newSchedule.description,
          schedule_type: 'manual',
          is_active: true,
          start_date: newSchedule.start_date || null,
          end_date: newSchedule.end_date || null
        }])
        .select()
        .single()

      if (error) throw error

      toast.success('Schedule created successfully!')
      setShowCreateModal(false)
      setNewSchedule({ title: '', description: '', start_date: '', end_date: '' })
      loadSchedules()
    } catch (error: any) {
      toast.error('Failed to create schedule')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const addScheduleItem = async () => {
    if (!selectedSchedule || !newItem.subject.trim()) {
      toast.error('Please fill in required fields')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('schedule_items')
        .insert([{
          schedule_id: selectedSchedule.id,
          ...newItem
        }])
        .select()
        .single()

      if (error) throw error

      toast.success('Item added successfully!')
      setShowItemForm(false)
      setNewItem({
        subject: '',
        topic: '',
        day_of_week: 0,
        start_time: '09:00',
        end_time: '10:00',
        recurrence_pattern: 'weekly',
        priority: 'medium',
        notes: '',
        completed: false,
        color: '#3B82F6'
      })
      loadSchedules()
    } catch (error: any) {
      toast.error('Failed to add item')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const toggleItemComplete = async (itemId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('schedule_items')
        .update({ completed: !completed })
        .eq('id', itemId)

      if (error) throw error

      toast.success(completed ? 'Marked as incomplete' : 'Marked as complete')
      loadSchedules()
    } catch (error: any) {
      toast.error('Failed to update item')
      console.error(error)
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('schedule_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      toast.success('Item deleted successfully')
      loadSchedules()
    } catch (error: any) {
      toast.error('Failed to delete item')
      console.error(error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.match(/\.(csv|xlsx|xls)$/)) {
      toast.error('Please upload a CSV or Excel file')
      return
    }

    toast.info('File upload feature will parse your schedule file')
  }

  const optimizeWithAI = async () => {
    if (!selectedSchedule) return

    try {
      setLoading(true)
      const items = selectedSchedule.schedule_items || []

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schedule-ai-optimizer`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'optimize',
            schedule: {
              title: selectedSchedule.title,
              items: items
            },
            language: selectedLanguage
          })
        }
      )

      if (!response.ok) throw new Error('AI optimization failed')

      const result = await response.json()
      toast.success('AI analysis complete!')

      setShowAIOptimizer(true)
    } catch (error: any) {
      toast.error('Failed to optimize schedule')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && schedules.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Study Schedule Manager</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Organize your study time intelligently</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={optimizeWithAI}
            disabled={!selectedSchedule || loading}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <Brain className="w-5 h-5" />
            AI Optimize
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Schedule
          </button>
        </div>
      </div>

      {/* Schedule Selector */}
      {schedules.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Active Schedule
          </label>
          <select
            value={selectedSchedule?.id || ''}
            onChange={(e) => {
              const schedule = schedules.find(s => s.id === e.target.value)
              setSelectedSchedule(schedule || null)
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {schedules.map(schedule => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.title} ({schedule.schedule_items?.length || 0} items)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Empty State */}
      {schedules.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No study schedules yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first study schedule to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Create New Schedule
          </button>
        </div>
      )}

      {/* Schedule Items */}
      {selectedSchedule && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedSchedule.title}</h3>
            <button
              onClick={() => setShowItemForm(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {selectedSchedule.description && (
            <p className="text-gray-600 dark:text-gray-400">{selectedSchedule.description}</p>
          )}

          {/* Daily View */}
          <div className="space-y-3">
            {DAYS.map((day, dayIdx) => {
              const dayItems = selectedSchedule.schedule_items?.filter(
                (item) => item.day_of_week === dayIdx
              ) || []

              if (dayItems.length === 0) return null

              const isExpanded = expandedDay === dayIdx

              return (
                <div key={dayIdx} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : dayIdx)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">{day}</h4>
                      <span className="text-sm text-gray-500">({dayItems.length} items)</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-0 space-y-2">
                      {dayItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                            item.completed ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-700'
                          }`}
                          style={{ borderLeftColor: item.color || '#3B82F6' }}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className={`font-semibold ${item.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                {item.subject}
                              </h5>
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                item.priority === 'high' ? 'bg-red-100 text-red-800' :
                                item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {item.priority}
                              </span>
                            </div>
                            {item.topic && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{item.topic}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.start_time} - {item.end_time}
                              </span>
                              <span className="flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" />
                                {item.recurrence_pattern}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleItemComplete(item.id!, item.completed)}
                              className={`p-2 rounded-lg transition-colors ${
                                item.completed
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              title={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteItem(item.id!)}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Schedule</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Final Exams Study Plan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newSchedule.description}
                  onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newSchedule.start_date}
                    onChange={(e) => setNewSchedule({ ...newSchedule, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newSchedule.end_date}
                    onChange={(e) => setNewSchedule({ ...newSchedule, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Or Import from File
                </label>
                <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <Upload className="w-5 h-5" />
                  <span>Upload CSV or Excel</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={createSchedule}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Schedule Item</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={newItem.subject}
                    onChange={(e) => setNewItem({ ...newItem, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Mathematics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={newItem.topic}
                    onChange={(e) => setNewItem({ ...newItem, topic: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Calculus Chapter 3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Day *
                  </label>
                  <select
                    value={newItem.day_of_week}
                    onChange={(e) => setNewItem({ ...newItem, day_of_week: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {DAYS.map((day, idx) => (
                      <option key={idx} value={idx}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={newItem.start_time}
                    onChange={(e) => setNewItem({ ...newItem, start_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={newItem.end_time}
                    onChange={(e) => setNewItem({ ...newItem, end_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recurrence
                  </label>
                  <select
                    value={newItem.recurrence_pattern}
                    onChange={(e) => setNewItem({ ...newItem, recurrence_pattern: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {RECURRENCE.map((rec) => (
                      <option key={rec} value={rec}>{rec.charAt(0).toUpperCase() + rec.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newItem.priority}
                    onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {PRIORITIES.map((pri) => (
                      <option key={pri} value={pri}>{pri.charAt(0).toUpperCase() + pri.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={newItem.color}
                  onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                  className="w-full h-10 px-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowItemForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={addScheduleItem}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
