import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, UserPreferences } from '../lib/supabase'
import { useAuth } from './AuthContext'

interface ThemeContextType {
  theme: 'light' | 'dark'
  primaryColor: string
  preferences: UserPreferences | null
  toggleTheme: () => void
  setPrimaryColor: (color: string) => void
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const colorThemes = {
  purple: {
    primary: 'from-purple-600 to-blue-600',
    primaryHover: 'from-purple-700 to-blue-700',
    accent: 'purple-600',
    accentHover: 'purple-700',
    bg: 'bg-purple-600',
    bgHover: 'bg-purple-700',
    text: 'text-purple-600',
    border: 'border-purple-500'
  },
  blue: {
    primary: 'from-blue-600 to-indigo-600',
    primaryHover: 'from-blue-700 to-indigo-700',
    accent: 'blue-600',
    accentHover: 'blue-700',
    bg: 'bg-blue-600',
    bgHover: 'bg-blue-700',
    text: 'text-blue-600',
    border: 'border-blue-500'
  },
  green: {
    primary: 'from-green-600 to-emerald-600',
    primaryHover: 'from-green-700 to-emerald-700',
    accent: 'green-600',
    accentHover: 'green-700',
    bg: 'bg-green-600',
    bgHover: 'bg-green-700',
    text: 'text-green-600',
    border: 'border-green-500'
  },
  orange: {
    primary: 'from-orange-600 to-red-600',
    primaryHover: 'from-orange-700 to-red-700',
    accent: 'orange-600',
    accentHover: 'orange-700',
    bg: 'bg-orange-600',
    bgHover: 'bg-orange-700',
    text: 'text-orange-600',
    border: 'border-orange-500'
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [primaryColor, setPrimaryColorState] = useState('purple')
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadUserPreferences()
    } else {
      // Reset preferences when user logs out
      setPreferences(null)
      setTheme('light')
      setPrimaryColorState('purple')
    }
  }, [user])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    
    // Apply CSS custom properties for dynamic theming
    const root = document.documentElement
    const colorConfig = colorThemes[primaryColor as keyof typeof colorThemes]
    
    if (colorConfig) {
      // Extract color values from Tailwind classes
      const colorMap = {
        purple: { primary: '#8b5cf6', primaryHover: '#7c3aed', accent: '#8b5cf6' },
        blue: { primary: '#3b82f6', primaryHover: '#2563eb', accent: '#3b82f6' },
        green: { primary: '#10b981', primaryHover: '#059669', accent: '#10b981' },
        orange: { primary: '#f59e0b', primaryHover: '#d97706', accent: '#f59e0b' }
      }
      
      const colors = colorMap[primaryColor as keyof typeof colorMap]
      if (colors) {
        root.style.setProperty('--primary-color', colors.primary)
        root.style.setProperty('--primary-hover', colors.primaryHover)
        root.style.setProperty('--accent-color', colors.accent)
      }
    }
  }, [theme])

  useEffect(() => {
    // Update primary color CSS variables
    const root = document.documentElement
    const colorMap = {
      purple: { primary: '#8b5cf6', primaryHover: '#7c3aed', accent: '#8b5cf6' },
      blue: { primary: '#3b82f6', primaryHover: '#2563eb', accent: '#3b82f6' },
      green: { primary: '#10b981', primaryHover: '#059669', accent: '#10b981' },
      orange: { primary: '#f59e0b', primaryHover: '#d97706', accent: '#f59e0b' }
    }
    
    const colors = colorMap[primaryColor as keyof typeof colorMap]
    if (colors) {
      root.style.setProperty('--primary-color', colors.primary)
      root.style.setProperty('--primary-hover', colors.primaryHover)
      root.style.setProperty('--accent-color', colors.accent)
    }
  }, [primaryColor, theme])

  const loadUserPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setPreferences(data)
        setTheme(data.theme)
        setPrimaryColorState(data.primary_color)
      } else {
        // Create default preferences
        const defaultPrefs = {
          user_id: user!.id,
          theme: 'light' as const,
          primary_color: 'purple',
          notifications_enabled: true,
          sound_enabled: true
        }

        const { data: newPrefs, error: createError } = await supabase
          .from('user_preferences')
          .insert(defaultPrefs)
          .select()
          .single()

        if (createError) throw createError
        setPreferences(newPrefs)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    await updatePreferences({ theme: newTheme })
  }

  const setPrimaryColor = async (color: string) => {
    setPrimaryColorState(color)
    await updatePreferences({ primary_color: color })
  }

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user || !preferences) return

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      setPreferences(data)
    } catch (error) {
      console.error('Error updating preferences:', error)
    }
  }

  return (
    <ThemeContext.Provider value={{
      theme,
      primaryColor,
      preferences,
      toggleTheme,
      setPrimaryColor,
      updatePreferences
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}