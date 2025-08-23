import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface Flashcard {
  id: string
  front: string
  back: string
  difficulty: 'easy' | 'medium' | 'hard'
}

interface FlashcardRequest {
  fileContent: string
  fileName: string
  cardCount: number
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
}

async function generateFlashcardsWithGemini(content: string, cardCount: number, difficulty: string): Promise<Flashcard[]> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyCYsL7v_v0OmtxEckHYQ1j-g2J1eQKv6H8'
  
  const prompt = `
  Based on the following content, generate ${cardCount} flashcards with ${difficulty === 'mixed' ? 'mixed difficulty levels' : difficulty + ' difficulty'}.
  
  Content: ${content.substring(0, 4000)}
  
  Please respond with a JSON array of flashcards in this exact format:
  [
    {
      "id": "1",
      "front": "Question or term on the front of the card",
      "back": "Answer or definition on the back of the card",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
  
  Requirements:
  - Front should contain a question, term, or concept
  - Back should contain the answer, definition, or explanation
  - Make cards educational and focused on key concepts
  - Vary difficulty levels if mixed is selected
  - Keep content clear and concise
  - Focus on the most important information from the content
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
    
    const flashcards = JSON.parse(jsonMatch[0])
    return flashcards
  } catch (error) {
    console.error('Error generating flashcards with Gemini:', error)
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

    const { fileContent, fileName, cardCount, difficulty }: FlashcardRequest = await req.json()

    if (!fileContent || !cardCount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating ${cardCount} ${difficulty} flashcards for file: ${fileName}`)
    
    const flashcards = await generateFlashcardsWithGemini(fileContent, cardCount, difficulty)
    
    return new Response(
      JSON.stringify({ 
        flashcards,
        fileName,
        generatedAt: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error generating flashcards:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate flashcards. Please try again.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})