import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface AIRequest {
  message: string
}

async function getAIResponse(message: string): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyCYsL7v_v0OmtxEckHYQ1j-g2J1eQKv6H8'
  
  const prompt = `You are a helpful AI study assistant. You help students with academic questions, study tips, and general knowledge. 
  Please provide a helpful, accurate, and educational response to the following question or request:
  
  "${message}"
  
  Keep your response concise but informative, and always encourage learning and academic growth.`

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
          maxOutputTokens: 500,
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API response:', errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini API')
    }
    
    return data.candidates[0].content.parts[0].text
  } catch (error) {
    console.error('Error getting AI response:', error)
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

    const { message }: AIRequest = await req.json()

    if (!message || !message.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`AI Assistant request: ${message}`)
    
    const response = await getAIResponse(message.trim())
    
    return new Response(
      JSON.stringify({ 
        response,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error in AI assistant:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to get AI response. Please try again.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})