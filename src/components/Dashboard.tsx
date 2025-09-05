import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Sidebar } from './Sidebar'
import { StudyStats } from './StudyStats'
import { StudyTimer } from './StudyTimer'
import { FileManager } from './FileManager'
import { TaskManager } from './TaskManager'
import { StudyCalendar } from './StudyCalendar'
import StudyGroups from './StudyGroups'
import GoogleDriveViewer from './GoogleDriveViewer'
import { PDFQuizUploader } from './PDFQuizUploader'
import { FlashcardReview } from './FlashcardReview'
import { NotesEditor } from './NotesEditor'
import { SharedNotes } from './SharedNotes'
import { UserProfile } from './UserProfile'
import { StudyPlanner } from './StudyPlanner'
import { AIAssistant } from './AIAssistant'
import { Settings } from './Settings'
import { LogOut, User, Settings as SettingsIcon, Moon, Sun, Menu, X } from 'lucide-react'
import toast from 'react-hot-toast'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('stats')
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  // Get current date and time
  const getCurrentDateTime = () => {
    const now = new Date()
    return {
      date: now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  const { date, time } = getCurrentDateTime()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="lg:ml-64 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
            
            {/* Center - Date and Time */}
            <div className="hidden md:block text-center">
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-white">{date}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{time}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="hidden sm:inline">{user?.email}</span>
              </div>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
              
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <Settings />
            </div>
          </div>
        </div>
      )}

      <div className="lg:ml-64 px-4 sm:px-6 lg:px-8 py-8">
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
          {activeTab === 'notes' && <NotesEditor />}
          {activeTab === 'shared-notes' && <SharedNotes />}
          {activeTab === 'profile' && <UserProfile />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </div>
      
      <AIAssistant />
    </div>
  )
}