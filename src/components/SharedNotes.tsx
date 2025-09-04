import React, { useState, useEffect } from 'react'
import { Share2, Eye, User, Calendar, Search, Tag, BookOpen, Clock, Heart, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface SharedNote {
  id: string
  user_id: string
  title: string
  content: string
  is_shared: boolean
  tags: string[]
  word_count: number
  reading_time: number
  created_at: string
  updated_at: string
  users?: {
    email: string
  }
}

export function SharedNotes() {
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([])
  const [selectedNote, setSelectedNote] = useState<SharedNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTag, setFilterTag] = useState('')
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
      
      setSharedNotes(data || [])
    } catch (error) {
      console.error('Error fetching shared notes:', error)
      toast.error('Failed to load shared notes')
    } finally {
      setLoading(false)
    }
  }

  const filteredNotes = sharedNotes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTag = !filterTag || (note.tags && note.tags.includes(filterTag))
    return matchesSearch && matchesTag
  })

  const allTags = Array.from(new Set(sharedNotes.flatMap(note => note.tags || [])))

  const getUserEmail = (note: SharedNote) => {
    return note.users?.email || 'Unknown User'
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
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
          <Share2 className="w-6 h-6 text-green-600" />
          Shared Notes
        </h2>
        
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search shared notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          {allTags.length > 0 && (
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[140px]"
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex h-[600px]">
        {/* Notes List */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <div className="space-y-3">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8">
                <Share2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {sharedNotes.length === 0 ? 'No shared notes yet' : 'No matching notes'}
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`p-4 rounded-lg cursor-pointer transition-all border ${
                    selectedNote?.id === note.id
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <h4 className="font-medium text-gray-800 dark:text-white truncate mb-2">
                    {note.title}
                  </h4>
                  
                  {/* Author and Date */}
                  <div className="flex items-center gap-3 mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{getUserEmail(note)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {note.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{note.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {note.word_count > 0 && (
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span>{note.word_count} words</span>
                      </div>
                    )}
                    {note.reading_time > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{note.reading_time} min</span>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {note.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
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
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                  {selectedNote.title}
                </h3>
                
                {/* Author Info */}
                <div className="flex items-center gap-6 mb-4 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium">{getUserEmail(selectedNote)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Updated {new Date(selectedNote.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Tags */}
                {selectedNote.tags && selectedNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedNote.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  {selectedNote.word_count > 0 && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{selectedNote.word_count} words</span>
                    </div>
                  )}
                  {selectedNote.reading_time > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{selectedNote.reading_time} minute read</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Share2 className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Public</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto">
                {selectedNote.content ? (
                  <div 
                    className="prose prose-lg prose-gray dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedNote.content }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <StickyNote className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>This note appears to be empty</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                    <span>Created: {new Date(selectedNote.created_at).toLocaleDateString()}</span>
                    <span>By: {getUserEmail(selectedNote)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + '/shared-note/' + selectedNote.id)
                        toast.success('Note link copied to clipboard!')
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
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

      {/* Stats Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>{sharedNotes.length} shared notes available</span>
          <div className="flex items-center gap-4">
            <span>{allTags.length} unique tags</span>
            <span>
              {sharedNotes.reduce((sum, note) => sum + (note.word_count || 0), 0).toLocaleString()} total words
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}