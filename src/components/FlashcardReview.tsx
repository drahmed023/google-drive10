import React, { useState, useEffect } from 'react'
import { Zap, ChevronLeft, ChevronRight, Eye, EyeOff, Shuffle, CheckCircle, RotateCcw, Trash2, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface SavedFlashcard {
  id: string
  user_id: string
  front: string
  back: string
  difficulty: 'easy' | 'medium' | 'hard'
  source_file: string
  mastered: boolean
  review_count: number
  last_reviewed: string
  created_at: string
}

export function FlashcardReview() {
  const [flashcards, setFlashcards] = useState<SavedFlashcard[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'not_mastered' | 'mastered'>('all')
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchFlashcards()
    }
  }, [user, filter])

  const fetchFlashcards = async () => {
    try {
      let query = supabase
        .from('saved_flashcards')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (filter === 'not_mastered') {
        query = query.eq('mastered', false)
      } else if (filter === 'mastered') {
        query = query.eq('mastered', true)
      }

      const { data, error } = await query

      if (error) throw error
      setFlashcards(data || [])
      setCurrentCardIndex(0)
      setShowBack(false)
    } catch (error) {
      console.error('Error fetching flashcards:', error)
      toast.error('Failed to load flashcards')
    } finally {
      setLoading(false)
    }
  }

  const markAsMastered = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('saved_flashcards')
        .update({ 
          mastered: true,
          review_count: flashcards[currentCardIndex].review_count + 1,
          last_reviewed: new Date().toISOString()
        })
        .eq('id', cardId)

      if (error) throw error
      
      setFlashcards(prev => prev.map(card => 
        card.id === cardId 
          ? { ...card, mastered: true, review_count: card.review_count + 1, last_reviewed: new Date().toISOString() }
          : card
      ))
      
      toast.success('Card marked as mastered!')
    } catch (error) {
      console.error('Error updating flashcard:', error)
      toast.error('Failed to update flashcard')
    }
  }

  const updateReviewCount = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('saved_flashcards')
        .update({ 
          review_count: flashcards[currentCardIndex].review_count + 1,
          last_reviewed: new Date().toISOString()
        })
        .eq('id', cardId)

      if (error) throw error
      
      setFlashcards(prev => prev.map(card => 
        card.id === cardId 
          ? { ...card, review_count: card.review_count + 1, last_reviewed: new Date().toISOString() }
          : card
      ))
    } catch (error) {
      console.error('Error updating review count:', error)
    }
  }

  const deleteFlashcard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this flashcard?')) return

    try {
      const { error } = await supabase
        .from('saved_flashcards')
        .delete()
        .eq('id', cardId)

      if (error) throw error
      
      setFlashcards(prev => prev.filter(card => card.id !== cardId))
      
      if (currentCardIndex >= flashcards.length - 1) {
        setCurrentCardIndex(Math.max(0, flashcards.length - 2))
      }
      
      toast.success('Flashcard deleted!')
    } catch (error) {
      console.error('Error deleting flashcard:', error)
      toast.error('Failed to delete flashcard')
    }
  }

  const nextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
      setShowBack(false)
    }
  }

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1)
      setShowBack(false)
    }
  }

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5)
    setFlashcards(shuffled)
    setCurrentCardIndex(0)
    setShowBack(false)
    toast.success('Cards shuffled!')
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
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

  if (flashcards.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6">
          <Zap className="w-6 h-6 text-green-600" />
          Flashcard Review
        </h2>
        <div className="text-center py-12">
          <Zap className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
            No flashcards found
          </h3>
          <p className="text-gray-400 dark:text-gray-500">
            Create some flashcards from your PDF files to start reviewing!
          </p>
        </div>
      </div>
    )
  }

  const currentCard = flashcards[currentCardIndex]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-green-600" />
          Flashcard Review
        </h2>
        
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Cards</option>
            <option value="not_mastered">Not Mastered</option>
            <option value="mastered">Mastered</option>
          </select>
          
          <button
            onClick={shuffleCards}
            className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Shuffle Cards"
          >
            <Shuffle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
          <span>From: {currentCard.source_file}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-green-600 to-teal-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(currentCard.difficulty)}`}>
              {currentCard.difficulty.charAt(0).toUpperCase() + currentCard.difficulty.slice(1)}
            </span>
            {currentCard.mastered && (
              <div className="flex items-center gap-1 text-green-600">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm">Mastered</span>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Reviewed {currentCard.review_count} times
          </div>
        </div>

        <div 
          className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl p-8 min-h-[200px] flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-lg border-2 border-green-200 dark:border-green-800"
          onClick={() => {
            setShowBack(!showBack)
            if (!showBack) {
              updateReviewCount(currentCard.id)
            }
          }}
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

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevCard}
          disabled={currentCardIndex === 0}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          {showBack && !currentCard.mastered && (
            <button
              onClick={() => markAsMastered(currentCard.id)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Star className="w-4 h-4" />
              Mark as Mastered
            </button>
          )}
          
          <button
            onClick={() => deleteFlashcard(currentCard.id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete Card"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={nextCard}
          disabled={currentCardIndex === flashcards.length - 1}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {flashcards.filter(card => card.mastered).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Mastered</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {flashcards.reduce((sum, card) => sum + card.review_count, 0)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Total Reviews</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {flashcards.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Total Cards</div>
        </div>
      </div>
    </div>
  )
}