import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.24.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

interface ScheduleItem {
  subject: string
  topic?: string
  day_of_week: number
  start_time: string
  end_time: string
  priority: string
  notes?: string
}

interface OptimizationRequest {
  action: 'optimize' | 'suggest' | 'summarize' | 'generate_questions' | 'spaced_repetition'
  schedule: {
    title: string
    items: ScheduleItem[]
  }
  language: 'ar' | 'en'
  additional_context?: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const getPrompt = (request: OptimizationRequest): string => {
  const isArabic = request.language === 'ar'
  const days = isArabic ? DAYS_AR : DAYS

  const scheduleText = request.schedule.items.map(item => {
    const day = days[item.day_of_week]
    return `${day}: ${item.subject}${item.topic ? ' - ' + item.topic : ''} (${item.start_time} - ${item.end_time}, Priority: ${item.priority})`
  }).join('\n')

  const prompts = {
    optimize: isArabic
      ? `أنت مستشار تعليمي خبير. قم بتحليل جدول المذاكرة التالي واقترح تحسينات لتحقيق أقصى كفاءة دراسية:\n\n${scheduleText}\n\nقدم:\n1. تقييم شامل للجدول الحالي\n2. نقاط القوة والضعف\n3. اقتراحات محددة للتحسين\n4. توزيع أفضل للوقت بناءً على الأولويات\n5. نصائح لزيادة الإنتاجية\n\nقدم إجابتك بتنسيق JSON مع المفاتيح: evaluation, strengths, weaknesses, suggestions, time_distribution, productivity_tips`
      : `You are an expert educational advisor. Analyze this study schedule and suggest improvements for maximum study efficiency:\n\n${scheduleText}\n\nProvide:\n1. Comprehensive evaluation of current schedule\n2. Strengths and weaknesses\n3. Specific improvement suggestions\n4. Better time distribution based on priorities\n5. Tips to increase productivity\n\nProvide your answer in JSON format with keys: evaluation, strengths, weaknesses, suggestions, time_distribution, productivity_tips`,

    suggest: isArabic
      ? `بناءً على جدول المذاكرة التالي:\n\n${scheduleText}\n\nاقترح:\n1. خطة مذاكرة إضافية لتعزيز التعلم\n2. أوقات مراجعة مثالية\n3. فترات راحة موصى بها\n4. تقنيات دراسية مناسبة لكل مادة\n5. جدول للمراجعة المتكررة (Spaced Repetition)\n\nقدم إجابتك بتنسيق JSON`
      : `Based on this study schedule:\n\n${scheduleText}\n\nSuggest:\n1. Additional study plan to enhance learning\n2. Ideal review times\n3. Recommended break periods\n4. Suitable study techniques for each subject\n5. Spaced repetition schedule\n\nProvide your answer in JSON format`,

    summarize: isArabic
      ? `قم بتلخيص جدول المذاكرة التالي وتقديم رؤى ذكية:\n\n${scheduleText}\n\nقدم:\n1. ملخص عام للجدول\n2. إجمالي ساعات الدراسة الأسبوعية\n3. توزيع الوقت حسب الأولوية\n4. المواد الأكثر تركيزاً\n5. توصيات سريعة\n\nقدم إجابتك بتنسيق JSON`
      : `Summarize this study schedule and provide smart insights:\n\n${scheduleText}\n\nProvide:\n1. General summary of schedule\n2. Total weekly study hours\n3. Time distribution by priority\n4. Most focused subjects\n5. Quick recommendations\n\nProvide your answer in JSON format`,

    generate_questions: isArabic
      ? `بناءً على جدول المذاكرة:\n\n${scheduleText}\n\nأنشئ أسئلة تدريبية (MCQs) لكل مادة. قدم 5 أسئلة متعددة الخيارات مع الإجابات الصحيحة لكل مادة.\n\nقدم إجابتك بتنسيق JSON مع مصفوفة questions، كل سؤال يحتوي على: subject, question, options (array), correct_answer, explanation`
      : `Based on this study schedule:\n\n${scheduleText}\n\nGenerate practice questions (MCQs) for each subject. Provide 5 multiple choice questions with correct answers for each subject.\n\nProvide your answer in JSON format with questions array, each containing: subject, question, options (array), correct_answer, explanation`,

    spaced_repetition: isArabic
      ? `قم بإنشاء خطة مراجعة متكررة (Spaced Repetition) لجدول المذاكرة:\n\n${scheduleText}\n\nاقترح:\n1. جدول مراجعة بفواصل زمنية (1 يوم، 3 أيام، 7 أيام، 14 يوم، 30 يوم)\n2. أولويات المراجعة\n3. تقنيات المراجعة الفعالة\n4. مؤشرات التقدم\n\nقدم إجابتك بتنسيق JSON`
      : `Create a spaced repetition review plan for this study schedule:\n\n${scheduleText}\n\nSuggest:\n1. Review schedule with intervals (1 day, 3 days, 7 days, 14 days, 30 days)\n2. Review priorities\n3. Effective review techniques\n4. Progress indicators\n\nProvide your answer in JSON format`
  }

  return prompts[request.action]
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const request: OptimizationRequest = await req.json()

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    const prompt = getPrompt(request)

    console.log('Generating AI analysis for:', request.action, 'Language:', request.language)

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    let parsedResponse
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        parsedResponse = { raw_text: text }
      }
    } catch (e) {
      parsedResponse = { raw_text: text }
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: request.action,
        language: request.language,
        analysis: parsedResponse,
        schedule_title: request.schedule.title,
        items_count: request.schedule.items.length
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error in AI optimization:', error)

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
