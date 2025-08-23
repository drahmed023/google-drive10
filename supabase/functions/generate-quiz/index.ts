import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface QuizQuestion {
  id: string
  question: string
  type: 'mcq' | 'true_false'
  options?: string[]
  correct_answer: string | boolean
  explanation?: string
}

interface QuizRequest {
  fileContent: string
  fileName: string
  questionCount: number
  quizType: 'mcq' | 'true_false' | 'mixed'
}

async function generateQuizWithGemini(content: string, questionCount: number, quizType: string): Promise<QuizQuestion[]> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyCYsL7v_v0OmtxEckHYQ1j-g2J1eQKv6H8'
  
  const prompt = `
  Based on the following content, generate ${questionCount} ${quizType === 'mixed' ? 'mixed (MCQ and True/False)' : quizType} questions.
  
  Content: ${content.substring(0, 4000)} // Limit content to avoid token limits
  
  Please respond with a JSON array of questions in this exact format:
  [
    {
      "id": "1",
      "question": "Question text here?",
      "type": "mcq" or "true_false",
      "options": ["Option A", "Option B", "Option C", "Option D"] (only for MCQ),
      "correct_answer": "Option A" or true/false,
      "explanation": "Brief explanation of the correct answer"
    }
  ]
  
  Requirements:
  - Questions should be clear and educational
  - For MCQ: provide 4 options with only one correct answer
  - For True/False: the correct_answer should be true or false (boolean)
  - Include brief explanations
  - Make questions challenging but fair
  - Focus on key concepts from the content
  `

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API response:', errorText)
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini API')
    }
    
    const generatedText = data.candidates[0].content.parts[0].text
    
    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Gemini response')
    }
    
    const questions = JSON.parse(jsonMatch[0])
    return questions
  } catch (error) {
    console.error('Error generating quiz with Gemini:', error)
    throw error
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { fileContent, fileName, questionCount, quizType }: QuizRequest = await req.json()

    if (!fileContent || !questionCount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating ${questionCount} ${quizType} questions for file: ${fileName}`)
    
    const questions = await generateQuizWithGemini(fileContent, questionCount, quizType)
    
    return new Response(
      JSON.stringify({ 
        questions,
        fileName,
        generatedAt: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error generating quiz:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate quiz. Please try again.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})