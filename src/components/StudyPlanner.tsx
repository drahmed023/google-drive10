import React, { useState, useEffect } from 'react'
import { Calendar, Plus, Target, BookOpen, Clock, CheckCircle, TrendingUp, Brain, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface StudyPlan {
  id: string
  user_id: string
  title: string
  description?: string
  subjects: string[]
  daily_hours: number
  total_days: number
  goal: string
  plan_data: any
  is_active: boolean
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
}

interface StudyPlanSession {
  id: string
  plan_id: string
  user_id: string
  session_date: string
  session_type: 'study' | 'review' | 'quiz' | 'break'
  subject: string
  duration: number
  content: string
  completed: boolean
  completed_at?: string
  created_at: string
}

export function StudyPlanner() {
  const [plans, setPlans] = useState<StudyPlan[]>([])
  const [sessions, setSessions] = useState<StudyPlanSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null)
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subjects: [''],
    daily_hours: 2,
    total_days: 30,
    goal: '',
    start_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (user) {
      fetchPlans()
      fetchSessions()
    }
  }, [user])

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlans(data || [])
    } catch (error) {
      console.error('Error fetching study plans:', error)
      toast.error('Failed to load study plans')
    } finally {
      setLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('study_plan_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('session_date', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching study sessions:', error)
    }
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.goal.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const startDate = new Date(formData.start_date)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + formData.total_days)

      const { data, error } = await supabase
        .from('study_plans')
        .insert({
          user_id: user!.id,
          title: formData.title,
          description: formData.description,
          subjects: formData.subjects.filter(s => s.trim()),
          daily_hours: formData.daily_hours,
          total_days: formData.total_days,
          goal: formData.goal,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          plan_data: generatePlanData(formData)
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Study plan created successfully!')
      setShowCreateForm(false)
      resetForm()
      fetchPlans()
    } catch (error) {
      console.error('Error creating study plan:', error)
      toast.error('Failed to create study plan')
    }
  }

  const generatePlanData = (data: any) => {
    const sessions = []
    const startDate = new Date(data.start_date)
    
    for (let day = 0; day < data.total_days; day++) {
      const sessionDate = new Date(startDate)
      sessionDate.setDate(sessionDate.getDate() + day)
      
      const subjectIndex = day % data.subjects.length
      const subject = data.subjects[subjectIndex] || 'General Study'
      
      sessions.push({
        day: day + 1,
        date: sessionDate.toISOString().split('T')[0],
        subject,
        duration: data.daily_hours * 60,
        type: day % 7 === 6 ? 'review' : 'study'
      })
    }
    
    return { sessions }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      subjects: [''],
      daily_hours: 2,
      total_days: 30,
      goal: '',
      start_date: new Date().toISOString().split('T')[0]
    })
  }

  const addSubject = () => {
    setFormData(prev => ({
      ...prev,
      subjects: [...prev.subjects, '']
    }))
  }

  const updateSubject = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.map((s, i) => i === index ? value : s)
    }))
  }

  const removeSubject = (index: number) => {
    if (formData.subjects.length > 1) {
      setFormData(prev => ({
        ...prev,
        subjects: prev.subjects.filter((_, i) => i !== index)
      }))
    }
  }

  const togglePlanActive = async (planId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('study_plans')
        .update({ is_active: !isActive })
        .eq('id', planId)

      if (error) throw error
      
      fetchPlans()
      toast.success(isActive ? 'Plan deactivated' : 'Plan activated')
    } catch (error) {
      console.error('Error updating plan:', error)
      toast.error('Failed to update plan')
    }
  }

  const getPlanProgress = (plan: StudyPlan) => {
    const planSessions = sessions.filter(s => s.plan_id === plan.id)
    const completedSessions = planSessions.filter(s => s.completed)
    const totalSessions = plan.plan_data?.sessions?.length || plan.total_days
    
    return {
      completed: completedSessions.length,
      total: totalSessions,
      percentage: totalSessions > 0 ? Math.round((completedSessions.length / totalSessions) * 100) : 0
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
          <Calendar className="w-6 h-6 text-blue-600" />
          Study Planner
        </h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          Create Plan
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Create New Study Plan</h3>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Plan Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="e.g., Final Exam Preparation"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                placeholder="Describe your study plan goals and approach..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subjects
              </label>
              {formData.subjects.map((subject, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => updateSubject(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Subject name"
                  />
                  {formData.subjects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubject(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addSubject}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Subject
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Daily Hours
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.daily_hours}
                  onChange={(e) => setFormData({ ...formData, daily_hours: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Days
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.total_days}
                  onChange={(e) => setFormData({ ...formData, total_days: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Hours
                </label>
                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-gray-800 dark:text-white font-medium">
                  {formData.daily_hours * formData.total_days} hours
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Goal *
              </label>
              <input
                type="text"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g., Pass final exams with 85%+ average"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Plan
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  resetForm()
                }}
                className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
            No study plans yet
          </h3>
          <p className="text-gray-400 dark:text-gray-500 mb-4">
            Create your first study plan to organize your learning journey
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
          >
            Create Your First Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const progress = getPlanProgress(plan)
            const isActive = plan.is_active
            const startDate = new Date(plan.start_date)
            const endDate = new Date(plan.end_date)
            const today = new Date()
            const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

            return (
              <div
                key={plan.id}
                className={`border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
                  isActive
                    ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        {plan.title}
                      </h3>
                      {isActive && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-medium rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                        {plan.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => togglePlanActive(plan.id, isActive)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300'
                        : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300'
                    }`}
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Goal: {plan.goal}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{plan.daily_hours}h/day</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{plan.total_days} days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{plan.subjects.length} subjects</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {plan.subjects.map((subject, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs rounded-full"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Progress</span>
                    <span className="font-medium text-gray-800 dark:text-white">
                      {progress.completed}/{progress.total} sessions ({progress.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                    <span>
                      Started: {startDate.toLocaleDateString()}
                    </span>
                    <span>
                      {daysRemaining > 0 ? `${daysRemaining} days left` : 'Completed'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}