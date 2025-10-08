import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.55.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const reminder_id = url.searchParams.get('reminder_id')
    const item_id = url.searchParams.get('item_id')
    const minutes = url.searchParams.get('minutes')

    if (!action || !reminder_id) {
      throw new Error('Missing required parameters')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (action === 'complete' && item_id) {
      const { error: updateError } = await supabase
        .from('schedule_items')
        .update({ completed: true })
        .eq('id', item_id)

      if (updateError) throw updateError

      const { error: logError } = await supabase
        .from('reminder_logs')
        .insert({
          reminder_id,
          status: 'completed',
          action_taken: 'complete'
        })

      if (logError) throw logError

      return new Response(
        `
<!DOCTYPE html>
<html dir="auto">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Completed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 400px;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #10b981;
      margin: 0 0 10px 0;
    }
    p {
      color: #666;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Task Completed!</h1>
    <p>Great job! You've marked this study session as complete.</p>
  </div>
</body>
</html>
        `,
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html',
          },
        }
      )
    }

    if (action === 'snooze' && minutes) {
      const snoozeUntil = new Date()
      snoozeUntil.setMinutes(snoozeUntil.getMinutes() + parseInt(minutes))

      const { error: logError } = await supabase
        .from('reminder_logs')
        .insert({
          reminder_id,
          status: 'snoozed',
          action_taken: 'snooze',
          snoozed_until: snoozeUntil.toISOString()
        })

      if (logError) throw logError

      return new Response(
        `
<!DOCTYPE html>
<html dir="auto">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Snoozed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 400px;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #f59e0b;
      margin: 0 0 10px 0;
    }
    p {
      color: #666;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⏰</div>
    <h1>Reminder Snoozed</h1>
    <p>We'll remind you again in ${minutes} minutes.</p>
  </div>
</body>
</html>
        `,
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html',
          },
        }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Error processing reminder action:', error)

    return new Response(
      `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Error</title>
  <style>
    body {
      font-family: sans-serif;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: white;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .icon { font-size: 48px; margin-bottom: 20px; }
    h1 { color: #ef4444; margin: 0 0 10px 0; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>Error</h1>
    <p>${error.message}</p>
  </div>
</body>
</html>
      `,
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
        },
      }
    )
  }
})
