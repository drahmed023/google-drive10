import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { StudyStats } from './StudyStats'
import { StudyTimer } from './StudyTimer'
import { FileManager } from './FileManager'
import { TaskManager } from './TaskManager'
import { StudyCalendar } from './StudyCalendar'
import StudyGroups from './StudyGroups'
import { Settings } from './Settings'
import GoogleDriveViewer from './GoogleDriveViewer'
import { PDFQuizUploader } from './PDFQuizUploader'
import { FlashcardReview } from './FlashcardReview'
import { AIAssistant } from './AIAssistant'
import { LogOut, BarChart3, Clock, FolderOpen, User, GraduationCap, CheckSquare, Calendar, Users, Settings as SettingsIcon, Zap, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('stats')
  const [showSettings, setShowSettings] = useState(false)
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

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
    { id: 'drive', name: 'Google Drive & Quiz', icon: FolderOpen },
    { id: 'pdf-quiz', name: 'PDF Quiz Generator', icon: GraduationCap },
    { id: 'flashcard-review', name: 'Flashcard Review', icon: Zap },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
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
                <p className="text-sm text-gray-600 dark:text-gray-300">Your personal study companion</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="hidden sm:inline">{user?.email}</span>
              </div>
              
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.name}</span>
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
          {activeTab === 'drive' && <GoogleDriveViewer />}
          {activeTab === 'pdf-quiz' && <PDFQuizUploader />}
          {activeTab === 'flashcard-review' && <FlashcardReview />}
        </div>
      </div>
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <SettingsIcon className="w-6 h-6" />
                Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <Settings />
            </div>
          </div>
        </div>
      )}
      
      <AIAssistant />
    </div>
  )
}