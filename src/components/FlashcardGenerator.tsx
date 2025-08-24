import React, { useState, useEffect } from 'react'
import { Zap, RotateCcw, ChevronLeft, ChevronRight, Eye, EyeOff, Shuffle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface Flashcard {
  id: string
  front: string
  back: string
  difficulty: 'easy' | 'medium' | 'hard'
}

interface FlashcardGeneratorProps {
  fileContent: string
  fileName: string
  onClose: () => void
}

export function FlashcardGenerator({ fileContent, fileName, onClose }: FlashcardGeneratorProps) {
  const [step, setStep] = useState<'setup' | 'generating' | 'study' | 'results'>('setup')
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [studiedCards, setStudiedCards] = useState<Set<string>>(new Set())
  const [savedCards, setSavedCards] = useState<Set<string>>(new Set())
  const [cardSettings, setCardSettings] = useState({
    cardCount: 10,
    difficulty: 'mixed' as 'easy' | 'medium' | 'hard' | 'mixed'
  })
  const { user } = useAuth()

  const generateFlashcards = async () => {
    setStep('generating')
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-flashcards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileContent: fileContent.substring(0, 4000),
          fileName,
          cardCount: cardSettings.cardCount,
          difficulty: cardSettings.difficulty
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate flashcards')
      }

      const data = await response.json()
      setFlashcards(data.flashcards)
      setStep('study')
      toast.success('Flashcards generated successfully!')
    } catch (error) {
      console.error('Error generating flashcards:', error)
      toast.error('Failed to generate flashcards')
      setStep('setup')
    }
  }

  const nextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
      setShowBack(false)
    } else {
      setStep('results')
    }
  }

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1)
      setShowBack(false)
    }
  }

  const markAsStudied = () => {
    const currentCard = flashcards[currentCardIndex]
    setStudiedCards(prev => new Set([...prev, currentCard.id]))
    toast.success('Card marked as studied!')
  }

  const saveFlashcard = async (flashcard: Flashcard) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('saved_flashcards')
        .insert({
          user_id: user.id,
          front: flashcard.front,
          back: flashcard.back,
          difficulty: flashcard.difficulty,
          source_file: fileName
        })

      if (error) throw error
      
      setSavedCards(prev => new Set([...prev, flashcard.id]))
      toast.success('Flashcard saved for review!')
    } catch (error) {
      console.error('Error saving flashcard:', error)
      toast.error('Failed to save flashcard')
    }
  }

  const saveAllFlashcards = async () => {
    if (!user) return

    try {
      const flashcardsToSave = flashcards.map(card => ({
        user_id: user.id,
        front: card.front,
        back: card.back,
        difficulty: card.difficulty,
        source_file: fileName
      }))

      const { error } = await supabase
        .from('saved_flashcards')
        .insert(flashcardsToSave)

      if (error) throw error
      
      setSavedCards(new Set(flashcards.map(card => card.id)))
      toast.success('All flashcards saved for review!')
    } catch (error) {
      console.error('Error saving flashcards:', error)
      toast.error('Failed to save flashcards')
    }
  }

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5)
    setFlashcards(shuffled)
    setCurrentCardIndex(0)
    setShowBack(false)
    toast.success('Cards shuffled!')
  }

  const restartStudy = () => {
    setStep('setup')
    setCurrentCardIndex(0)
    setShowBack(false)
    setStudiedCards(new Set())
    setSavedCards(new Set())
    setFlashcards([])
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (step === 'setup') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Generate Flashcards
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              From file: {fileName}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Cards
              </label>
              <select
                value={cardSettings.cardCount}
                onChange={(e) => setCardSettings(prev => ({ ...prev, cardCount: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={5}>5 Cards</option>
                <option value={10}>10 Cards</option>
                <option value={15}>15 Cards</option>
                <option value={20}>20 Cards</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty Level
              </label>
              <select
                value={cardSettings.difficulty}
                onChange={(e) => setCardSettings(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="mixed">Mixed Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200 mb-2">
                <Zap className="w-4 h-4" />
                <span className="font-medium">Flashcard Features</span>
              </div>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>• Interactive front and back cards</li>
                <li>• Progress tracking</li>
                <li>• Shuffle and review options</li>
                <li>• Difficulty-based learning</li>
                <li>• Save cards for later review</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={generateFlashcards}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all transform hover:scale-105"
            >
              Generate Cards
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'generating') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Generating Flashcards...
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            AI is creating personalized flashcards from your content
          </p>
        </div>
      </div>
    )
  }

  if (step === 'study') {
    const currentCard = flashcards[currentCardIndex]
    const progress = ((currentCardIndex + 1) / flashcards.length) * 100

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Flashcards: {fileName}
              </h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={shuffleCards}
                  className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Shuffle Cards"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button
                  onClick={saveAllFlashcards}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Save All Cards"
                >
                  Save All
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {currentCardIndex + 1} / {flashcards.length}
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-600 to-teal-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Flashcard */}
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(currentCard.difficulty)}`}>
                  {currentCard.difficulty.charAt(0).toUpperCase() + currentCard.difficulty.slice(1)}
                </span>
                <div className="flex items-center gap-2">
                  {studiedCards.has(currentCard.id) && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Studied</span>
                    </div>
                  )}
                  {savedCards.has(currentCard.id) && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm">Saved</span>
                    </div>
                  )}
                </div>
              </div>

              <div 
                className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl p-8 min-h-[200px] flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-lg border-2 border-green-200 dark:border-green-800"
                onClick={() => setShowBack(!showBack)}
              >
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    {showBack ? currentCard.back : currentCard.front}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    {showBack ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>Click to {showBack ? 'hide' : 'reveal'} answer</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevCard}
                disabled={currentCardIndex === 0}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-2">
                {showBack && !studiedCards.has(currentCard.id) && (
                  <button
                    onClick={markAsStudied}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Studied
                  </button>
                )}
                
                {!savedCards.has(currentCard.id) && (
                  <button
                    onClick={() => saveFlashcard(currentCard)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    Save Card
                  </button>
                )}
              </div>

              <button
                onClick={nextCard}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all transform hover:scale-105"
              >
                {currentCardIndex === flashcards.length - 1 ? 'Finish' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'results') {
    const studiedCount = studiedCards.size
    const savedCount = savedCards.size
    const studiedPercentage = Math.round((studiedCount / flashcards.length) * 100)

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Study Session Complete!
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              File: {fileName}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{studiedPercentage}%</div>
              <div className="text-sm text-green-800 dark:text-green-300">Completion Rate</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{studiedCount}</div>
              <div className="text-sm text-blue-800 dark:text-blue-300">Cards Studied</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{savedCount}</div>
              <div className="text-sm text-yellow-800 dark:text-yellow-300">Cards Saved</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{flashcards.length}</div>
              <div className="text-sm text-purple-800 dark:text-purple-300">Total Cards</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={restartStudy}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Study Again
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all transform hover:scale-105"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}