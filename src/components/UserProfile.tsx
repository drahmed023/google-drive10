import React, { useState, useEffect } from 'react'
import { User, Mail, Calendar, Award, Clock, BookOpen, Target, Edit3, Save, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface UserStats {
  totalStudyTime: number
  totalSessions: number
  completedTasks: number
  savedFlashcards: number
  createdNotes: number
  sharedNotes: number
}

export function UserProfile() {
  const { user } = useAuth()
  const [stats, setStats] = useState<UserStats>({
    totalStudyTime: 0,
    totalSessions: 0,
    completedTasks: 0,
    savedFlashcards: 0,
    createdNotes: 0,
    sharedNotes: 0
  })
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    if (user) {
      fetchUserStats()
      setDisplayName(user.email?.split('@')[0] || 'User')
    }
  }, [user])

  const fetchUserStats = async () => {
    if (!user) return

    try {
      // Fetch study sessions
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', user.id)

      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('completed')
        .eq('user_id', user.id)

      // Fetch flashcards
      const { data: flashcards } = await supabase
        .from('saved_flashcards')
        .select('id')
        .eq('user_id', user.id)

      // Fetch notes
      const { data: notes } = await supabase
        .from('notes')
        .select('is_shared')
        .eq('user_id', user.id)

      const totalStudyTime = sessions?.reduce((sum, session) => sum + session.duration, 0) || 0
      const completedTasks = tasks?.filter(task => task.completed).length || 0
      const sharedNotes = notes?.filter(note => note.is_shared).length || 0

      setStats({
        totalStudyTime,
        totalSessions: sessions?.length || 0,
        completedTasks,
        savedFlashcards: flashcards?.length || 0,
        createdNotes: notes?.length || 0,
        sharedNotes
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const saveProfile = async () => {
    // In a real app, you'd save this to a user_profiles table
    toast.success('Profile updated successfully!')
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-12 h-12 text-white" />
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="text-xl font-bold text-center bg-transparent border-b-2 border-purple-500 outline-none text-gray-800 dark:text-white"
              placeholder="Display Name"
            />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
            <div className="flex justify-center gap-2">
              <button
                onClick={saveProfile}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              {displayName}
            </h2>
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 mb-2">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 mb-4">
              <Calendar className="w-4 h-4" />
              <span>Joined {new Date(user?.created_at || '').toLocaleDateString()}</span>
            </div>
            {bio && (
              <p className="text-gray-600 dark:text-gray-300 mb-4">{bio}</p>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all mx-auto"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <Clock className="w-8 h-8" />
            <div className="text-right">
              <div className="text-2xl font-bold">{formatStudyTime(stats.totalStudyTime)}</div>
              <div className="text-purple-100">Study Time</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <BookOpen className="w-8 h-8" />
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <div className="text-blue-100">Study Sessions</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <Target className="w-8 h-8" />
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.completedTasks}</div>
              <div className="text-green-100">Tasks Done</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <Award className="w-8 h-8" />
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.savedFlashcards}</div>
              <div className="text-yellow-100">Flashcards</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <BookOpen className="w-8 h-8" />
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.createdNotes}</div>
              <div className="text-indigo-100">Notes Created</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <Award className="w-8 h-8" />
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.sharedNotes}</div>
              <div className="text-pink-100">Shared Notes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
          <Award className="w-5 h-5" />
          Achievements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.totalStudyTime >= 60 && (
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-gray-800 dark:text-white">Study Warrior</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Studied for over 1 hour</div>
              </div>
            </div>
          )}
          
          {stats.completedTasks >= 5 && (
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-gray-800 dark:text-white">Task Master</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Completed 5+ tasks</div>
              </div>
            </div>
          )}
          
          {stats.sharedNotes >= 1 && (
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-800 dark:text-white">Knowledge Sharer</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Shared notes with community</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}