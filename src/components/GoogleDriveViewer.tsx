import React, { useState, useEffect } from 'react'
import { 
  FolderOpen, 
  File, 
  Download, 
  Eye, 
  Search, 
  ChevronRight, 
  ChevronDown,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime: string
  webViewLink: string
  webContentLink?: string
  iconLink?: string
}

interface DriveFolder {
  id: string
  name: string
  files: DriveFile[]
  folders: DriveFolder[]
}

export function GoogleDriveViewer() {
  const [driveData, setDriveData] = useState<DriveFolder | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null)

  useEffect(() => {
    fetchDriveData()
  }, [])

  const fetchDriveData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch Google Drive data')
      }

      const data = await response.json()
      setDriveData(data)
    } catch (error) {
      console.error('Error fetching Google Drive data:', error)
      toast.error('Failed to load Google Drive files')
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />
    if (mimeType.includes('document')) return <FileText className="w-4 h-4 text-blue-500" />
    if (mimeType.includes('spreadsheet')) return <FileText className="w-4 h-4 text-green-500" />
    if (mimeType.includes('presentation')) return <FileText className="w-4 h-4 text-orange-500" />
    if (mimeType.includes('image')) return <Image className="w-4 h-4 text-purple-500" />
    if (mimeType.includes('video')) return <Video className="w-4 h-4 text-red-600" />
    if (mimeType.includes('audio')) return <Music className="w-4 h-4 text-pink-500" />
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="w-4 h-4 text-gray-500" />
    return <File className="w-4 h-4 text-gray-500" />
  }

  const formatFileSize = (bytes: string) => {
    if (!bytes) return 'Unknown size'
    const size = parseInt(bytes)
    if (size === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(size) / Math.log(k))
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const handleFilePreview = (file: DriveFile) => {
    setSelectedFile(file)
    window.open(file.webViewLink, '_blank')
  }

  const handleFileDownload = (file: DriveFile) => {
    if (file.webContentLink) {
      window.open(file.webContentLink, '_blank')
    } else {
      toast.error('Download link not available for this file')
    }
  }

  const filterFiles = (files: DriveFile[]) => {
    if (!searchTerm) return files
    return files.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const renderFolder = (folder: DriveFolder, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const filteredFiles = filterFiles(folder.files)
    const hasMatchingContent = filteredFiles.length > 0 || 
      folder.folders.some(subfolder => hasMatchingFiles(subfolder))

    if (searchTerm && !hasMatchingContent) return null

    return (
      <div key={folder.id} className="mb-2">
        {folder.name && (
          <div
            className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
            onClick={() => toggleFolder(folder.id)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
            <FolderOpen className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-800 dark:text-white">{folder.name}</span>
            <span className="text-xs text-gray-500 ml-auto">
              {folder.files.length + folder.folders.length} items
            </span>
          </div>
        )}

        {(isExpanded || !folder.name) && (
          <div className="space-y-1">
            {/* Render subfolders */}
            {folder.folders.map(subfolder => renderFolder(subfolder, depth + 1))}
            
            {/* Render files */}
            {filteredFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }}
              >
                {getFileIcon(file.mimeType)}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-800 dark:text-white truncate">
                    {file.name}
                  </h4>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {file.size && <span>{formatFileSize(file.size)}</span>}
                    <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleFilePreview(file)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleFileDownload(file)}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const hasMatchingFiles = (folder: DriveFolder): boolean => {
    if (!searchTerm) return true
    return filterFiles(folder.files).length > 0 || 
           folder.folders.some(subfolder => hasMatchingFiles(subfolder))
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading Google Drive files...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-blue-500" />
          Google Drive Files
        </h2>
        <button
          onClick={fetchDriveData}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
        >
          Refresh
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto scrollbar-thin">
        {driveData ? (
          renderFolder(driveData)
        ) : (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
              No files found
            </h3>
            <p className="text-gray-400 dark:text-gray-500">
              Unable to load Google Drive files
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default GoogleDriveViewer