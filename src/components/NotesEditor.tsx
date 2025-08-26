import React, { useState, useEffect, useRef } from 'react'
import { 
  Save, 
  Share2, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Type,
  Plus,
  Trash2,
  Eye,
  Edit3
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface Note {
  id: string
  user_id: string
  title: string
  content: string
  is_shared: boolean
  created_at: string
  updated_at: string
  user_email?: string
}

export function NotesEditor() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchNotes()
    }
  }, [user])

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
      toast.error('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  const createNewNote = () => {
    setSelectedNote(null)
    setTitle('Untitled Note')
    setContent('')
    setIsEditing(true)
  }

  const selectNote = (note: Note) => {
    setSelectedNote(note)
    setTitle(note.title)
    setContent(note.content)
    setIsEditing(false)
  }

  const saveNote = async () => {
    if (!user || !title.trim()) return

    setSaving(true)
    try {
      if (selectedNote) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            title: title.trim(),
            content: content,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedNote.id)

        if (error) throw error
        toast.success('Note updated successfully!')
      } else {
        // Create new note
        const { data, error } = await supabase
          .from('notes')
          .insert({
            user_id: user.id,
            title: title.trim(),
            content: content
          })
          .select()
          .single()

        if (error) throw error
        setSelectedNote(data)
        toast.success('Note created successfully!')
      }

      fetchNotes()
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving note:', error)
      toast.error('Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  const shareNote = async () => {
    if (!selectedNote) return

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          is_shared: !selectedNote.is_shared,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedNote.id)

      if (error) throw error
      
      setSelectedNote(prev => prev ? { ...prev, is_shared: !prev.is_shared } : null)
      fetchNotes()
      toast.success(selectedNote.is_shared ? 'Note made private' : 'Note shared publicly!')
    } catch (error) {
      console.error('Error sharing note:', error)
      toast.error('Failed to update sharing status')
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error
      
      if (selectedNote?.id === noteId) {
        setSelectedNote(null)
        setTitle('')
        setContent('')
      }
      
      fetchNotes()
      toast.success('Note deleted successfully!')
    } catch (error) {
      console.error('Error deleting note:', error)
      toast.error('Failed to delete note')
    }
  }

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML)
    }
  }

  const handleEditorChange = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      <div className="flex h-[600px]">
        {/* Notes List */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">My Notes</h3>
            <button
              onClick={createNewNote}
              className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedNote?.id === note.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 dark:text-white truncate">
                      {note.title}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </p>
                    {note.is_shared && (
                      <div className="flex items-center gap-1 mt-1">
                        <Share2 className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600">Shared</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNote(note.id)
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {selectedNote || isEditing ? (
            <>
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-xl font-semibold bg-transparent border-none outline-none text-gray-800 dark:text-white flex-1"
                    placeholder="Note title..."
                    disabled={!isEditing && selectedNote}
                  />
                  <div className="flex items-center gap-2">
                    {selectedNote && (
                      <>
                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={shareNote}
                          className={`p-2 rounded-lg transition-colors ${
                            selectedNote.is_shared
                              ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
                              : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={saveNote}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => formatText('bold')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <Bold className="w-4 h-4" />
                    </button>
                    <button onClick={() => formatText('italic')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <Italic className="w-4 h-4" />
                    </button>
                    <button onClick={() => formatText('underline')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <Underline className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button onClick={() => formatText('insertUnorderedList')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <List className="w-4 h-4" />
                    </button>
                    <button onClick={() => formatText('insertOrderedList')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <ListOrdered className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button onClick={() => formatText('justifyLeft')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => formatText('justifyCenter')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button onClick={() => formatText('justifyRight')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <AlignRight className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button onClick={() => formatText('hiliteColor', '#ffff00')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <Highlighter className="w-4 h-4" />
                    </button>
                    <select 
                      onChange={(e) => formatText('fontSize', e.target.value)}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                    >
                      <option value="3">Normal</option>
                      <option value="1">Small</option>
                      <option value="4">Large</option>
                      <option value="6">Extra Large</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 p-4">
                {isEditing ? (
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleEditorChange}
                    dangerouslySetInnerHTML={{ __html: content }}
                    className="w-full h-full border border-gray-200 dark:border-gray-600 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    style={{ minHeight: '300px' }}
                  />
                ) : (
                  <div 
                    className="w-full h-full p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <StickyNote className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                  No note selected
                </h3>
                <p className="text-gray-400 dark:text-gray-500 mb-4">
                  Select a note from the list or create a new one
                </p>
                <button
                  onClick={createNewNote}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Create New Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}