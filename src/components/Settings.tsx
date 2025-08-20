import React, { useState } from 'react'
import { Settings as SettingsIcon, Palette, Moon, Sun, Bell, Volume2, VolumeX } from 'lucide-react'
import { useTheme, colorThemes } from '../contexts/ThemeContext'
import toast from 'react-hot-toast'

export function Settings() {
  const { theme, primaryColor, preferences, toggleTheme, setPrimaryColor, updatePreferences } = useTheme()
  const [saving, setSaving] = useState(false)

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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6">
        <SettingsIcon className="w-6 h-6" />
        Settings
      </h2>

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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  theme === 'dark' ? 'bg-purple-600' : 'bg-gray-200'
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(colorThemes).map(([colorName, colorConfig]) => (
                  <button
                    key={colorName}
                    onClick={() => handleColorChange(colorName)}
                    disabled={saving}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      primaryColor === colorName
                        ? 'border-gray-400 dark:border-gray-500 ring-2 ring-purple-500'
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  preferences?.notifications_enabled ? 'bg-purple-600' : 'bg-gray-200'
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  preferences?.sound_enabled ? 'bg-purple-600' : 'bg-gray-200'
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
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Study Preferences</h3>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              More study customization options coming soon! This will include default study durations, 
              break intervals, and productivity goals.
            </p>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}