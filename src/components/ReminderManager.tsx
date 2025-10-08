import React, { useState, useEffect } from 'react'
import { Bell, Clock, Mail, Trash2, Plus, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface Reminder {
  id: string
  schedule_item_id: string
  reminder_time_minutes: number
  reminder_method: 'email'
  is_enabled: boolean
  language: 'ar' | 'en'
  schedule_items: {
    subject: string
    topic?: string
    day_of_week: number
    start_time: string
  }
}

interface ReminderLog {
  id: string
  sent_at: string
  status: 'sent' | 'failed' | 'snoozed' | 'completed'
  error_message?: string
  action_taken?: string
}

const REMINDER_OPTIONS = [
  { value: 10, label: '10 minutes before', labelAr: 'قبل 10 دقائق' },
  { value: 30, label: '30 minutes before', labelAr: 'قبل 30 دقيقة' },
  { value: 60, label: '1 hour before', labelAr: 'قبل ساعة واحدة' },
  { value: 1440, label: '1 day before', labelAr: 'قبل يوم واحد' }
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ReminderManager() {
  const { user } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [scheduleItems, setScheduleItems] = useState<any[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<'ar' | 'en'>('en')

  const [newReminder, setNewReminder] = useState({
    schedule_item_id: '',
    reminder_time_minutes: 30,
    language: 'en' as 'ar' | 'en'
  })

  useEffect(() => {
    if (user) {
      loadReminders()
      loadScheduleItems()
      loadReminderLogs()
    }
  }, [user])

  const loadReminders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('schedule_reminders')
        .select(`
          *,
          schedule_items(
            subject,
            topic,
            day_of_week,
            start_time
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReminders(data || [])
    } catch (error: any) {
      toast.error('Failed to load reminders')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadScheduleItems = async () => {
    try {
      const { data, error } = await supabase
        .from('schedule_items')
        .select(`
          *,
          study_schedules!inner(user_id, is_active)
        `)
        .eq('study_schedules.user_id', user?.id)
        .eq('study_schedules.is_active', true)
        .eq('completed', false)

      if (error) throw error
      setScheduleItems(data || [])
    } catch (error: any) {
      console.error('Failed to load schedule items:', error)
    }
  }

  const loadReminderLogs = async () => {
    try {
      const { data: remindersData } = await supabase
        .from('schedule_reminders')
        .select('id')
        .eq('user_id', user?.id)

      if (!remindersData) return

      const reminderIds = remindersData.map(r => r.id)

      const { data, error } = await supabase
        .from('reminder_logs')
        .select('*')
        .in('reminder_id', reminderIds)
        .order('sent_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setReminderLogs(data || [])
    } catch (error: any) {
      console.error('Failed to load reminder logs:', error)
    }
  }

  const createReminder = async () => {
    if (!newReminder.schedule_item_id) {
      toast.error('Please select a schedule item')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('schedule_reminders')
        .insert([{
          user_id: user?.id,
          schedule_item_id: newReminder.schedule_item_id,
          reminder_time_minutes: newReminder.reminder_time_minutes,
          reminder_method: 'email',
          is_enabled: true,
          language: newReminder.language
        }])

      if (error) throw error

      toast.success('Reminder created successfully!')
      setShowAddForm(false)
      setNewReminder({
        schedule_item_id: '',
        reminder_time_minutes: 30,
        language: 'en'
      })
      loadReminders()
    } catch (error: any) {
      toast.error('Failed to create reminder')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const toggleReminder = async (reminderId: string, isEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('schedule_reminders')
        .update({ is_enabled: !isEnabled })
        .eq('id', reminderId)

      if (error) throw error

      toast.success(isEnabled ? 'Reminder disabled' : 'Reminder enabled')
      loadReminders()
    } catch (error: any) {
      toast.error('Failed to update reminder')
      console.error(error)
    }
  }

  const deleteReminder = async (reminderId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return

    try {
      const { error } = await supabase
        .from('schedule_reminders')
        .delete()
        .eq('id', reminderId)

      if (error) throw error

      toast.success('Reminder deleted successfully')
      loadReminders()
    } catch (error: any) {
      toast.error('Failed to delete reminder')
      console.error(error)
    }
  }

  const testReminder = async (reminder: Reminder) => {
    try {
      setLoading(true)

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-schedule-reminders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_email: user?.email,
            subject: reminder.schedule_items.subject,
            topic: reminder.schedule_items.topic,
            start_time: reminder.schedule_items.start_time,
            day: DAYS[reminder.schedule_items.day_of_week],
            language: reminder.language,
            reminder_id: reminder.id,
            schedule_item_id: reminder.schedule_item_id
          })
        }
      )

      if (!response.ok) throw new Error('Failed to send test reminder')

      const result = await response.json()
      toast.success('Test reminder sent successfully!')
    } catch (error: any) {
      toast.error('Failed to send test reminder')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Reminder Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your study session reminders</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Reminder
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Reminders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{reminders.length}</p>
            </div>
            <Bell className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Reminders</p>
              <p className="text-2xl font-bold text-green-600">
                {reminders.filter(r => r.is_enabled).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sent Today</p>
              <p className="text-2xl font-bold text-purple-600">
                {reminderLogs.filter(log => {
                  const today = new Date().toDateString()
                  return new Date(log.sent_at).toDateString() === today
                }).length}
              </p>
            </div>
            <Mail className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Reminders List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Your Reminders</h3>

        {reminders.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No reminders yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first reminder to get started</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Reminder
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {reminder.schedule_items.subject}
                    {reminder.schedule_items.topic && (
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                        - {reminder.schedule_items.topic}
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {REMINDER_OPTIONS.find(opt => opt.value === reminder.reminder_time_minutes)?.label}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {reminder.language === 'ar' ? 'العربية' : 'English'}
                    </span>
                    <span>
                      {DAYS[reminder.schedule_items.day_of_week]} at {reminder.schedule_items.start_time}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testReminder(reminder)}
                    disabled={loading}
                    className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                    title="Test reminder"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleReminder(reminder.id, reminder.is_enabled)}
                    className={`p-2 rounded-lg transition-colors ${
                      reminder.is_enabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={reminder.is_enabled ? 'Disable' : 'Enable'}
                  >
                    {reminder.is_enabled ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteReminder(reminder.id)}
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

      {/* Recent Logs */}
      {reminderLogs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {reminderLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    log.status === 'sent' ? 'bg-green-500' :
                    log.status === 'completed' ? 'bg-blue-500' :
                    log.status === 'snoozed' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                    {log.status}
                  </span>
                  {log.action_taken && (
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      ({log.action_taken})
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(log.sent_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Reminder Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add New Reminder</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Schedule Item *
                </label>
                <select
                  value={newReminder.schedule_item_id}
                  onChange={(e) => setNewReminder({ ...newReminder, schedule_item_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a schedule item</option>
                  {scheduleItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.subject} - {DAYS[item.day_of_week]} {item.start_time}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reminder Time
                </label>
                <select
                  value={newReminder.reminder_time_minutes}
                  onChange={(e) => setNewReminder({ ...newReminder, reminder_time_minutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {REMINDER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Language
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewReminder({ ...newReminder, language: 'en' })}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      newReminder.language === 'en'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setNewReminder({ ...newReminder, language: 'ar' })}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      newReminder.language === 'ar'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    العربية
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={createReminder}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
