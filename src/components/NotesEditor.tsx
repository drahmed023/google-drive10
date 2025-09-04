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
  Plus,
  Trash2,
  Eye,
  Edit3,
  StickyNote,
  Search,
  Filter,
  Tag,
  Clock,
  BookOpen
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
  tags: string[]
  word_count: number
  reading_time: number
  created_at: string
  updated_at: string
}

export function NotesEditor() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTag, setFilterTag] = useState('')
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
    setTags([])
    setIsEditing(true)
  }

  const selectNote = (note: Note) => {
    setSelectedNote(note)
    setTitle(note.title)
    setContent(note.content)
    setTags(note.tags || [])
    setIsEditing(false)
  }

  const saveNote = async () => {
    if (!user || !title.trim()) {
      toast.error('Title is required')
      return
    }

    setSaving(true)
    try {
      const noteData = {
        title: title.trim(),
        content: content,
        tags: tags,
        updated_at: new Date().toISOString()
      }

      if (selectedNote) {
        // Update existing note
        const { data, error } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', selectedNote.id)
          .select()
          .single()

        if (error) throw error
        setSelectedNote(data)
        toast.success('Note updated successfully!')
      } else {
        // Create new note
        const { data, error } = await supabase
          .from('notes')
          .insert({
            user_id: user.id,
            ...noteData
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
      const { data, error } = await supabase
        .from('notes')
        .update({
          is_shared: !selectedNote.is_shared,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedNote.id)
        .select()
        .single()

      if (error) throw error
      
      setSelectedNote(data)
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
        setTags([])
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

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTag = !filterTag || (note.tags && note.tags.includes(filterTag))
    return matchesSearch && matchesTag
  })

  const allTags = Array.from(new Set(notes.flatMap(note => note.tags || [])))

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
      <div className="flex h-[700px]">
        {/* Notes List */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">My Notes</h3>
              <button
                onClick={createNewNote}
                className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8">
                <StickyNote className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {notes.length === 0 ? 'No notes yet' : 'No matching notes'}
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => (
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
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(note.updated_at).toLocaleDateString()}
                      </p>
                      
                      {/* Tags */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                              {tag}
                            </span>
                          ))}
                          {note.tags.length > 2 && (
                            <span className="text-xs text-gray-500">+{note.tags.length - 2}</span>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {note.word_count > 0 && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span>{note.word_count} words</span>
                          </div>
                        )}
                        {note.reading_time > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{note.reading_time} min read</span>
                          </div>
                        )}
                      </div>

                      {note.is_shared && (
                        <div className="flex items-center gap-1 mt-2">
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
              ))
            )}
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
                    className="text-xl font-semibold bg-transparent border-none outline-none text-gray-800 dark:text-white flex-1 focus:ring-2 focus:ring-purple-500 rounded px-2 py-1"
                    placeholder="Note title..."
                    readOnly={!isEditing && selectedNote}
                  />
                  <div className="flex items-center gap-2">
                    {selectedNote && (
                      <>
                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title={isEditing ? 'Preview' : 'Edit'}
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
                          title={selectedNote.is_shared ? 'Make Private' : 'Share Publicly'}
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={saveNote}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 transform hover:scale-105"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Tags */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                      >
                        {tag}
                        {isEditing && (
                          <button
                            onClick={() => removeTag(tag)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Add tag..."
                        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={addTag}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Formatting Toolbar */}
                {isEditing && (
                  <div className="flex items-center gap-1 flex-wrap p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <button 
                      onClick={() => formatText('bold')} 
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Bold"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => formatText('italic')} 
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => formatText('underline')} 
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Underline"
                    >
                      <Underline className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button 
                      onClick={() => formatText('insertUnorderedList')} 
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Bullet List"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => formatText('insertOrderedList')} 
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Numbered List"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button 
                      onClick={() => formatText('justifyLeft')} 
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Align Left"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => formatText('justifyCenter')} 
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Align Center"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => formatText('justifyRight')} 
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Align Right"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button 
                      onClick={() => formatText('hiliteColor', '#ffff00')} 
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Highlight"
                    >
                      <Highlighter className="w-4 h-4" />
                    </button>
                    <select 
                      onChange={(e) => formatText('fontSize', e.target.value)}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      title="Font Size"
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
              <div className="flex-1 p-4 overflow-y-auto">
                {isEditing ? (
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleEditorChange}
                    dangerouslySetInnerHTML={{ __html: content }}
                    className="w-full h-full border border-gray-200 dark:border-gray-600 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white overflow-y-auto"
                    style={{ minHeight: '400px' }}
                    placeholder="Start writing your note..."
                  />
                ) : (
                  <div className="w-full h-full">
                    {content ? (
                      <div 
                        className="prose prose-gray dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        dangerouslySetInnerHTML={{ __html: content }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                          <StickyNote className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p>This note is empty</p>
                          <button
                            onClick={() => setIsEditing(true)}
                            className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            Start Writing
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stats Footer */}
              {selectedNote && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-4">
                      <span>Created: {new Date(selectedNote.created_at).toLocaleDateString()}</span>
                      <span>Updated: {new Date(selectedNote.updated_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {selectedNote.word_count > 0 && (
                        <span>{selectedNote.word_count} words</span>
                      )}
                      {selectedNote.reading_time > 0 && (
                        <span>{selectedNote.reading_time} min read</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
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