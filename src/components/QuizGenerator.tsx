import React, { useState } from 'react'
import { Brain, FileText, Play, CheckCircle, XCircle, RotateCcw, Trophy, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface QuizQuestion {
  id: string
  question: string
  type: 'mcq' | 'true_false'
  options?: string[]
  correct_answer: string | boolean
  explanation?: string
}

interface QuizGeneratorProps {
  fileContent: string
  fileName: string
  onClose: () => void
}

export function QuizGenerator({ fileContent, fileName, onClose }: QuizGeneratorProps) {
  const [step, setStep] = useState<'setup' | 'generating' | 'quiz' | 'results'>('setup')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<string, string | boolean>>({})
  const [quizSettings, setQuizSettings] = useState({
    questionCount: 10,
    quizType: 'mixed' as 'mcq' | 'true_false' | 'mixed'
  })
  const [timeLeft, setTimeLeft] = useState(0)
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null)

  React.useEffect(() => {
    let interval: NodeJS.Timeout
    if (step === 'quiz' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitQuiz()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [step, timeLeft])

  const generateQuiz = async () => {
    setStep('generating')
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileContent: fileContent.substring(0, 4000), // Limit content
          fileName,
          questionCount: quizSettings.questionCount,
          quizType: quizSettings.quizType
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate quiz')
      }

      const data = await response.json()
      setQuestions(data.questions)
      setTimeLeft(quizSettings.questionCount * 60) // 1 minute per question
      setQuizStartTime(new Date())
      setStep('quiz')
      toast.success('تم إنشاء الاختبار بنجاح!')
    } catch (error) {
      console.error('Error generating quiz:', error)
      toast.error('فشل في إنشاء الاختبار')
      setStep('setup')
    }
  }

  const handleAnswerSelect = (answer: string | boolean) => {
    setUserAnswers(prev => ({
      ...prev,
      [questions[currentQuestionIndex].id]: answer
    }))
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      handleSubmitQuiz()
    }
  }

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmitQuiz = () => {
    setStep('results')
  }

  const calculateResults = () => {
    let correct = 0
    const results = questions.map(question => {
      const userAnswer = userAnswers[question.id]
      const isCorrect = userAnswer === question.correct_answer
      if (isCorrect) correct++
      
      return {
        question,
        userAnswer,
        isCorrect,
        correctAnswer: question.correct_answer
      }
    })

    const percentage = Math.round((correct / questions.length) * 100)
    const timeTaken = quizStartTime ? Math.round((Date.now() - quizStartTime.getTime()) / 1000) : 0

    return { results, correct, total: questions.length, percentage, timeTaken }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const restartQuiz = () => {
    setStep('setup')
    setCurrentQuestionIndex(0)
    setUserAnswers({})
    setQuestions([])
    setTimeLeft(0)
    setQuizStartTime(null)
  }

  if (step === 'setup') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              إنشاء اختبار تفاعلي
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              من ملف: {fileName}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                عدد الأسئلة
              </label>
              <select
                value={quizSettings.questionCount}
                onChange={(e) => setQuizSettings(prev => ({ ...prev, questionCount: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={5}>5 أسئلة</option>
                <option value={10}>10 أسئلة</option>
                <option value={15}>15 سؤال</option>
                <option value={20}>20 سؤال</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع الاختبار
              </label>
              <select
                value={quizSettings.quizType}
                onChange={(e) => setQuizSettings(prev => ({ ...prev, quizType: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="mixed">مختلط (اختيار متعدد + صح/خطأ)</option>
                <option value="mcq">اختيار من متعدد فقط</option>
                <option value="true_false">صح وخطأ فقط</option>
              </select>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">معلومات الاختبار</span>
              </div>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• الوقت المحدد: {quizSettings.questionCount} دقيقة</li>
                <li>• يتم التصحيح تلقائياً</li>
                <li>• ستظهر النتائج والأخطاء</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={generateQuiz}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
            >
              إنشاء الاختبار
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            جاري إنشاء الاختبار...
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            يتم تحليل المحتوى وإنشاء الأسئلة بواسطة الذكاء الاصطناعي
          </p>
        </div>
      </div>
    )
  }

  if (step === 'quiz') {
    const currentQuestion = questions[currentQuestionIndex]
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                اختبار: {fileName}
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-red-600">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono">{formatTime(timeLeft)}</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {currentQuestionIndex + 1} / {questions.length}
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                {currentQuestion.question}
              </h3>

              {currentQuestion.type === 'mcq' ? (
                <div className="space-y-3">
                  {currentQuestion.options?.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(option)}
                      className={`w-full p-4 text-right rounded-lg border-2 transition-all ${
                        userAnswers[currentQuestion.id] === option
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          userAnswers[currentQuestion.id] === option
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-300'
                        }`}>
                          {userAnswers[currentQuestion.id] === option && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                        <span className="text-gray-800 dark:text-white">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {[true, false].map((value) => (
                    <button
                      key={value.toString()}
                      onClick={() => handleAnswerSelect(value)}
                      className={`w-full p-4 text-right rounded-lg border-2 transition-all ${
                        userAnswers[currentQuestion.id] === value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          userAnswers[currentQuestion.id] === value
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-300'
                        }`}>
                          {userAnswers[currentQuestion.id] === value && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                        <span className="text-gray-800 dark:text-white">
                          {value ? 'صحيح' : 'خطأ'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                السؤال السابق
              </button>
              
              <button
                onClick={nextQuestion}
                disabled={!userAnswers[currentQuestion.id]}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {currentQuestionIndex === questions.length - 1 ? 'إنهاء الاختبار' : 'السؤال التالي'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'results') {
    const { results, correct, total, percentage, timeTaken } = calculateResults()

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                percentage >= 80 ? 'bg-green-100 text-green-600' :
                percentage >= 60 ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                <Trophy className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                نتائج الاختبار
              </h2>
              <div className="flex items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-300">
                <span>الملف: {fileName}</span>
                <span>الوقت المستغرق: {Math.floor(timeTaken / 60)}:{(timeTaken % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{percentage}%</div>
                <div className="text-sm text-blue-800 dark:text-blue-300">النتيجة النهائية</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{correct}</div>
                <div className="text-sm text-green-800 dark:text-green-300">إجابات صحيحة</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{total - correct}</div>
                <div className="text-sm text-red-800 dark:text-red-300">إجابات خاطئة</div>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              مراجعة الأسئلة
            </h3>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={result.question.id}
                  className={`p-4 rounded-lg border-2 ${
                    result.isCorrect
                      ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-200 bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded-full ${
                      result.isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {result.isCorrect ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : (
                        <XCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 dark:text-white mb-2">
                        {index + 1}. {result.question.question}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">إجابتك: </span>
                          <span className={result.isCorrect ? 'text-green-600' : 'text-red-600'}>
                            {result.question.type === 'true_false' 
                              ? (result.userAnswer ? 'صحيح' : 'خطأ')
                              : result.userAnswer?.toString()
                            }
                          </span>
                        </div>
                        {!result.isCorrect && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-300">الإجابة الصحيحة: </span>
                            <span className="text-green-600">
                              {result.question.type === 'true_false'
                                ? (result.correctAnswer ? 'صحيح' : 'خطأ')
                                : result.correctAnswer?.toString()
                              }
                            </span>
                          </div>
                        )}
                        {result.question.explanation && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-800 dark:text-blue-200">
                            <strong>التفسير:</strong> {result.question.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <button
                onClick={restartQuiz}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                إعادة الاختبار
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}