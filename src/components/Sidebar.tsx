import React from 'react'
import { 
  BarChart3, 
  Clock, 
  CheckSquare, 
  Calendar, 
  FolderOpen, 
  Users, 
  GraduationCap, 
  Zap, 
  FileText,
  StickyNote,
  Share2,
  User
} from 'lucide-react'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: SidebarProps) {
  const tabs = [
    { id: 'stats', name: 'Statistics', icon: BarChart3 },
    { id: 'timer', name: 'Study Timer', icon: Clock },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'files', name: 'Files', icon: FolderOpen },
    { id: 'groups', name: 'Study Group', icon: Users },
    { id: 'drive', name: 'Google Drive', icon: FolderOpen },
    { id: 'pdf-quiz', name: 'PDF Quiz Generator', icon: GraduationCap },
    { id: 'flashcard-review', name: 'Flashcard Review', icon: Zap },
    { id: 'notes', name: 'My Notes', icon: StickyNote },
    { id: 'shared-notes', name: 'Shared Notes', icon: Share2 },
    { id: 'profile', name: 'Profile', icon: User },
  ]

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                StudyFlow
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Study Dashboard</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-2 overflow-y-auto h-full pb-20">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setIsOpen(false) // Close sidebar on mobile after selection
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}