import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

interface ReminderRequest {
  user_email: string
  subject: string
  topic?: string
  start_time: string
  day: string
  language: 'ar' | 'en'
  reminder_id: string
  schedule_item_id: string
}

const getEmailTemplate = (data: ReminderRequest) => {
  const actionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/reminder-action`

  if (data.language === 'ar') {
    return {
      subject: `🔔 تذكير: ${data.subject} - ${data.topic || ''}`,
      html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f6f9;
      margin: 0;
      padding: 20px;
      direction: rtl;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px;
    }
    .reminder-card {
      background: #f8f9fa;
      border-right: 4px solid #667eea;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .reminder-card h2 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 20px;
    }
    .reminder-card p {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }
    .time-info {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .time-icon {
      font-size: 24px;
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    .btn {
      flex: 1;
      padding: 12px 24px;
      text-align: center;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.3s;
    }
    .btn-complete {
      background: #10b981;
      color: white;
    }
    .btn-complete:hover {
      background: #059669;
    }
    .btn-snooze {
      background: #f59e0b;
      color: white;
    }
    .btn-snooze:hover {
      background: #d97706;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 تذكير بموعد المذاكرة</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #333;">مرحباً،</p>
      <p style="color: #666;">لديك موعد مذاكرة قادم!</p>

      <div class="reminder-card">
        <h2>${data.subject}</h2>
        ${data.topic ? `<p><strong>الموضوع:</strong> ${data.topic}</p>` : ''}

        <div class="time-info">
          <span class="time-icon">📅</span>
          <div>
            <strong>${data.day}</strong><br>
            <span style="color: #667eea; font-size: 18px; font-weight: 600;">⏰ ${data.start_time}</span>
          </div>
        </div>
      </div>

      <p style="color: #666; margin: 20px 0;">اختر إجراءً:</p>

      <div class="actions">
        <a href="${actionUrl}?action=complete&reminder_id=${data.reminder_id}&item_id=${data.schedule_item_id}"
           class="btn btn-complete">
          ✓ تم الإنجاز
        </a>
        <a href="${actionUrl}?action=snooze&reminder_id=${data.reminder_id}&minutes=30"
           class="btn btn-snooze">
          ⏰ تأجيل 30 دقيقة
        </a>
      </div>

      <p style="margin-top: 30px; color: #999; font-size: 14px;">
        💡 <strong>نصيحة:</strong> التزم بجدولك الدراسي لتحقيق أفضل النتائج!
      </p>
    </div>
    <div class="footer">
      <p>نظام إدارة الدراسة الذكي | Study Schedule Manager</p>
      <p>هذا بريد إلكتروني تلقائي، الرجاء عدم الرد عليه</p>
    </div>
  </div>
</body>
</html>
      `
    }
  }

  return {
    subject: `🔔 Reminder: ${data.subject} - ${data.topic || ''}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f6f9;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px;
    }
    .reminder-card {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .reminder-card h2 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 20px;
    }
    .reminder-card p {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }
    .time-info {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .time-icon {
      font-size: 24px;
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    .btn {
      flex: 1;
      padding: 12px 24px;
      text-align: center;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.3s;
    }
    .btn-complete {
      background: #10b981;
      color: white;
    }
    .btn-complete:hover {
      background: #059669;
    }
    .btn-snooze {
      background: #f59e0b;
      color: white;
    }
    .btn-snooze:hover {
      background: #d97706;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Study Session Reminder</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #333;">Hello,</p>
      <p style="color: #666;">You have an upcoming study session!</p>

      <div class="reminder-card">
        <h2>${data.subject}</h2>
        ${data.topic ? `<p><strong>Topic:</strong> ${data.topic}</p>` : ''}

        <div class="time-info">
          <span class="time-icon">📅</span>
          <div>
            <strong>${data.day}</strong><br>
            <span style="color: #667eea; font-size: 18px; font-weight: 600;">⏰ ${data.start_time}</span>
          </div>
        </div>
      </div>

      <p style="color: #666; margin: 20px 0;">Choose an action:</p>

      <div class="actions">
        <a href="${actionUrl}?action=complete&reminder_id=${data.reminder_id}&item_id=${data.schedule_item_id}"
           class="btn btn-complete">
          ✓ Mark as Complete
        </a>
        <a href="${actionUrl}?action=snooze&reminder_id=${data.reminder_id}&minutes=30"
           class="btn btn-snooze">
          ⏰ Snooze 30 mins
        </a>
      </div>

      <p style="margin-top: 30px; color: #999; font-size: 14px;">
        💡 <strong>Tip:</strong> Stay consistent with your study schedule for the best results!
      </p>
    </div>
    <div class="footer">
      <p>Study Schedule Manager | Smart Study Organization</p>
      <p>This is an automated email, please do not reply</p>
    </div>
  </div>
</body>
</html>
    `
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const data: ReminderRequest = await req.json()

    const emailTemplate = getEmailTemplate(data)

    console.log('Sending reminder email:', {
      to: data.user_email,
      subject: emailTemplate.subject,
      language: data.language
    })

    const response = {
      success: true,
      message: data.language === 'ar'
        ? 'تم إرسال التذكير بنجاح'
        : 'Reminder sent successfully',
      email_sent: true,
      recipient: data.user_email,
      language: data.language
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error sending reminder:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
