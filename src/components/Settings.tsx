import React, { useState } from 'react'
import { Settings as SettingsIcon, Palette, Moon, Sun, Bell, Volume2, VolumeX, Clock, Target, BookOpen, Zap } from 'lucide-react'
import { useTheme, colorThemes } from '../contexts/ThemeContext'
import toast from 'react-hot-toast'

export function Settings() {
  const { theme, primaryColor, preferences, toggleTheme, setPrimaryColor, updatePreferences } = useTheme()
  const [saving, setSaving] = useState(false)
  const [studyPreferences, setStudyPreferences] = useState({
    defaultStudyDuration: 25,
    defaultBreakDuration: 5,
    dailyStudyGoal: 120, // minutes
    reminderEnabled: true,
    reminderTime: '09:00'
  })

  const handleNotificationToggle = async () => {
    if (!preferences) return
    
    setSaving(true)
    try {
      await updatePreferences({ 
        notifications_enabled: !preferences.notifications_enabled 
      })
      toast.success('Notification settings updated!')
    } catch (error) {
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSoundToggle = async () => {
    if (!preferences) return
    
    setSaving(true)
    try {
      await updatePreferences({ 
        sound_enabled: !preferences.sound_enabled 
      })
      toast.success('Sound settings updated!')
    } catch (error) {
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleColorChange = async (color: string) => {
    setSaving(true)
    try {
      await setPrimaryColor(color)
      toast.success('Theme color updated!')
    } catch (error) {
      toast.error('Failed to update theme')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Theme Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Appearance
        </h3>
        
        <div className="space-y-4">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white">Dark Mode</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Switch between light and dark themes
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 ring-primary focus:ring-offset-2 ${
                theme === 'dark' ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Color Theme Selection */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-800 dark:text-white mb-3">Primary Color</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(colorThemes).map(([colorName, colorConfig]) => (
                <button
                  key={colorName}
                  onClick={() => handleColorChange(colorName)}
                  disabled={saving}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    primaryColor === colorName
                      ? 'border-gray-400 dark:border-gray-500 ring-2 ring-primary'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className={`w-full h-8 rounded bg-gradient-to-r ${colorConfig.primary} mb-2`}></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {colorName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" />
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white">Push Notifications</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Receive notifications for study reminders and updates
                </p>
              </div>
            </div>
            <button
              onClick={handleNotificationToggle}
              disabled={saving || !preferences}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 ring-primary focus:ring-offset-2 ${
                preferences?.notifications_enabled ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences?.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              {preferences?.sound_enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white">Sound Notifications</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Play sounds when timer completes or notifications arrive
                </p>
              </div>
            </div>
            <button
              onClick={handleSoundToggle}
              disabled={saving || !preferences}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 ring-primary focus:ring-offset-2 ${
                preferences?.sound_enabled ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences?.sound_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Study Preferences */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Study Preferences
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <h4 className="font-medium text-gray-800 dark:text-white">Default Study Duration</h4>
              </div>
              <select
                value={studyPreferences.defaultStudyDuration}
                onChange={(e) => setStudyPreferences(prev => ({ ...prev, defaultStudyDuration: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value={15}>15 minutes</option>
                <option value={25}>25 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-green-600" />
                <h4 className="font-medium text-gray-800 dark:text-white">Default Break Duration</h4>
              </div>
              <select
                value={studyPreferences.defaultBreakDuration}
                onChange={(e) => setStudyPreferences(prev => ({ ...prev, defaultBreakDuration: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-gray-800 dark:text-white">Daily Study Goal</h4>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="30"
                max="480"
                step="30"
                value={studyPreferences.dailyStudyGoal}
                onChange={(e) => setStudyPreferences(prev => ({ ...prev, dailyStudyGoal: Number(e.target.value) }))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-800 dark:text-white min-w-[80px]">
                {Math.floor(studyPreferences.dailyStudyGoal / 60)}h {studyPreferences.dailyStudyGoal % 60}m
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" />
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white">Daily Study Reminder</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Get reminded to start your daily study session
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={studyPreferences.reminderTime}
                onChange={(e) => setStudyPreferences(prev => ({ ...prev, reminderTime: e.target.value }))}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled={!studyPreferences.reminderEnabled}
              />
              <button
                onClick={() => setStudyPreferences(prev => ({ ...prev, reminderEnabled: !prev.reminderEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 ring-primary focus:ring-offset-2 ${
                  studyPreferences.reminderEnabled ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    studyPreferences.reminderEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Account</h3>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Theme:</span>
              <span className="text-sm font-medium text-gray-800 dark:text-white capitalize">
                {theme} mode
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Primary Color:</span>
              <span className="text-sm font-medium text-gray-800 dark:text-white capitalize">
                {primaryColor}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Notifications:</span>
              <span className="text-sm font-medium text-gray-800 dark:text-white">
                {preferences?.notifications_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Sound:</span>
              <span className="text-sm font-medium text-gray-800 dark:text-white">
                {preferences?.sound_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Daily Goal:</span>
              <span className="text-sm font-medium text-gray-800 dark:text-white">
                {Math.floor(studyPreferences.dailyStudyGoal / 60)}h {studyPreferences.dailyStudyGoal % 60}m
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}