import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { StudyStats } from './StudyStats'
import { StudyTimer } from './StudyTimer'
import { FileManager } from './FileManager'
import { TaskManager } from './TaskManager'
import { StudyCalendar } from './StudyCalendar'
import { StudyGroups } from './StudyGroups'
import { Settings } from './Settings'
import { LogOut, BarChart3, Clock, FolderOpen, User, GraduationCap, CheckSquare, Calendar, Users, Settings as SettingsIcon } from 'lucide-react'
import toast from 'react-hot-toast'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('stats')
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully!')
    } catch (error) {
      toast.error('Error signing out')
    }
  }

  const tabs = [
    { id: 'stats', name: 'Statistics', icon: BarChart3 },
    { id: 'timer', name: 'Study Timer', icon: Clock },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'files', name: 'Files', icon: FolderOpen },
    { id: 'groups', name: 'Study Groups', icon: Users },
    { id: 'settings', name: 'Settings', icon: SettingsIcon },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  StudyFlow
                </h1>
                <p className="text-sm text-gray-600">Your personal study companion</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">{user?.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="transition-all duration-300 ease-in-out">
          {activeTab === 'stats' && <StudyStats />}
          {activeTab === 'timer' && <StudyTimer />}
          {activeTab === 'tasks' && <TaskManager />}
          {activeTab === 'calendar' && <StudyCalendar />}
          {activeTab === 'files' && <FileManager />}
          {activeTab === 'groups' && <StudyGroups />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </div>
    </div>
  )
}