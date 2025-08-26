import React, { useState, useEffect } from 'react'
import { Share2, Eye, User, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface SharedNote {
  id: string
  user_id: string
  title: string
  content: string
  is_shared: boolean
  created_at: string
  updated_at: string
  user_email?: string
}

export function SharedNotes() {
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([])
  const [selectedNote, setSelectedNote] = useState<SharedNote | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    fetchSharedNotes()
  }, [])

  const fetchSharedNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          users!notes_user_id_fkey(email)
        `)
        .eq('is_shared', true)
        .order('updated_at', { ascending: false })

      if (error) throw error
      
      const notesWithEmail = data.map(note => ({
        ...note,
        user_email: note.users?.email || 'Unknown User'
      }))
      
      setSharedNotes(notesWithEmail)
    } catch (error) {
      console.error('Error fetching shared notes:', error)
      toast.error('Failed to load shared notes')
    } finally {
      setLoading(false)
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Share2 className="w-6 h-6 text-green-600" />
          Shared Notes
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Discover notes shared by the community
        </p>
      </div>

      <div className="flex h-[600px]">
        {/* Notes List */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-2 max-h-[550px] overflow-y-auto">
            {sharedNotes.length === 0 ? (
              <div className="text-center py-8">
                <Share2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No shared notes yet</p>
              </div>
            ) : (
              sharedNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedNote?.id === note.id
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <h4 className="font-medium text-gray-800 dark:text-white truncate">
                    {note.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <User className="w-3 h-3" />
                    <span>{note.user_email}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Note Viewer */}
        <div className="flex-1 flex flex-col">
          {selectedNote ? (
            <>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {selectedNote.title}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>By {selectedNote.user_email}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Updated {new Date(selectedNote.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto">
                <div 
                  className="prose prose-gray dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedNote.content }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Eye className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Select a note to view
                </h3>
                <p className="text-gray-400 dark:text-gray-500">
                  Choose a shared note from the list to read its content
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}