import React, { useState, useRef } from 'react'
import { Upload, FileText, Brain, Zap, Download, Eye, Trash2 } from 'lucide-react'
import { QuizGenerator } from './QuizGenerator'
import { FlashcardGenerator } from './FlashcardGenerator'
import toast from 'react-hot-toast'

interface UploadedFile {
  id: string
  name: string
  content: string
  uploadedAt: Date
}

export function PDFQuizUploader() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  const [showQuizGenerator, setShowQuizGenerator] = useState(false)
  const [showFlashcardGenerator, setShowFlashcardGenerator] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.includes('pdf') && !file.type.includes('text') && !file.name.endsWith('.txt')) {
      toast.error('Please upload PDF or text files only')
      return
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setUploading(true)

    try {
      let content = ''
      
      if (file.type.includes('text') || file.name.endsWith('.txt')) {
        // Read text file
        content = await file.text()
      } else if (file.type.includes('pdf')) {
        // For PDF files, we'll use a placeholder content
        // In a real implementation, you'd use a PDF parsing library
        content = `PDF Content from ${file.name}\n\nThis is a placeholder for PDF content extraction. In a real implementation, the PDF would be parsed to extract text content for quiz generation.`
      }

      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: file.name,
        content,
        uploadedAt: new Date()
      }

      setFiles(prev => [newFile, ...prev])
      toast.success('File uploaded successfully!')
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

  const handleDeleteFile = (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return
    
    setFiles(prev => prev.filter(f => f.id !== fileId))
    toast.success('File deleted successfully!')
  }

  const handleGenerateQuiz = (file: UploadedFile) => {
    setSelectedFile(file)
    setShowQuizGenerator(true)
  }

  const handleGenerateFlashcards = (file: UploadedFile) => {
    setSelectedFile(file)
    setShowFlashcardGenerator(true)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-600" />
          AI Quiz & Flashcard Generator
        </h2>
        
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload PDF/Text'}
          </button>
        </div>
      </div>

      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              AI-Powered Learning Tools
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Upload PDF or text files to generate interactive quizzes</li>
              <li>• Create flashcards automatically from your content</li>
              <li>• Choose question types: Multiple Choice, True/False, or Mixed</li>
              <li>• Get instant feedback and detailed explanations</li>
              <li>• Track your learning progress with smart analytics</li>
            </ul>
          </div>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
            No files uploaded yet
          </h3>
          <p className="text-gray-400 dark:text-gray-500 mb-4">
            Upload your first PDF or text file to start generating quizzes and flashcards
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
          >
            <Upload className="w-5 h-5" />
            Upload Your First File
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div key={file.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-purple-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-800 dark:text-white truncate" title={file.name}>
                      {file.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {file.uploadedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteFile(file.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Content length: {file.content.length} characters
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => handleGenerateQuiz(file)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
                >
                  <Brain className="w-4 h-4" />
                  Generate Quiz
                </button>
                <button
                  onClick={() => handleGenerateFlashcards(file)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-105"
                >
                  <Zap className="w-4 h-4" />
                  Generate Flashcards
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showQuizGenerator && selectedFile && (
        <QuizGenerator
          fileContent={selectedFile.content}
          fileName={selectedFile.name}
          onClose={() => {
            setShowQuizGenerator(false)
            setSelectedFile(null)
          }}
        />
      )}

      {showFlashcardGenerator && selectedFile && (
        <FlashcardGenerator
          fileContent={selectedFile.content}
          fileName={selectedFile.name}
          onClose={() => {
            setShowFlashcardGenerator(false)
            setSelectedFile(null)
          }}
        />
      )}
    </div>
  )
}