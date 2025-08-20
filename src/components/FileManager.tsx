import React, { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Download, Trash2, Search, Filter, FolderOpen, File } from 'lucide-react'
import { supabase, StudyFile } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function FileManager() {
  const [files, setFiles] = useState<StudyFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      fetchFiles()
    }
  }, [user])

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('study_files')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFiles(data || [])
    } catch (error) {
      console.error('Error fetching files:', error)
      toast.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setUploading(true)

    try {
      // Upload file to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('study-files')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Save file metadata to database
      const { error: dbError } = await supabase
        .from('study_files')
        .insert({
          user_id: user.id,
          name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type
        })

      if (dbError) throw dbError

      toast.success('File uploaded successfully!')
      fetchFiles()
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDownload = async (file: StudyFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('study-files')
        .download(file.file_path)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Failed to download file')
    }
  }

  const handleDelete = async (file: StudyFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('study-files')
        .remove([file.file_path])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('study_files')
        .delete()
        .eq('id', file.id)

      if (dbError) throw dbError

      toast.success('File deleted successfully!')
      fetchFiles()
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error('Failed to delete file')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('document') || fileType.includes('word')) return '📝'
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊'
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📊'
    if (fileType.startsWith('video/')) return '🎥'
    if (fileType.startsWith('audio/')) return '🎵'
    return '📄'
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || file.file_type.startsWith(filterType)
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FolderOpen className="w-6 h-6" />
          Study Files
        </h2>
        
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            multiple={false}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white min-w-[140px]"
          >
            <option value="all">All Files</option>
            <option value="image">Images</option>
            <option value="application/pdf">PDFs</option>
            <option value="application">Documents</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
          </select>
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            {files.length === 0 ? 'No files uploaded yet' : 'No files match your search'}
          </h3>
          <p className="text-gray-400">
            {files.length === 0 
              ? 'Upload your first study file to get started' 
              : 'Try adjusting your search or filter criteria'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-2xl">{getFileIcon(file.file_type)}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-800 truncate" title={file.name}>
                      {file.name}
                    </h3>
                    <p className="text-sm text-gray-500">{formatFileSize(file.file_size)}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 mb-3">
                Uploaded {new Date(file.created_at).toLocaleDateString()}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(file)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={() => handleDelete(file)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}