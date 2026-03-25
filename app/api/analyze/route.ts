import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const PROMPT = `You are an expert career coach and recruiter with 10+ years of experience reviewing resumes and job descriptions.

You will be given a candidate's resume and a job description. Analyze how well the candidate matches the role and return a detailed assessment.

RESUME:
"""
{{RESUME_TEXT}}
"""

JOB DESCRIPTION:
"""
{{JOB_DESCRIPTION}}
"""

Return ONLY a valid JSON object with exactly this structure — no preamble, no markdown, no explanation outside the JSON:

{
  "match_score": <integer 0–100>,
  "summary": "<2 sentences max — overall fit in plain language>",
  "strengths": [
    "<specific thing from resume that matches JD>",
    "<another strength>",
    "<another strength>"
  ],
  "missing_keywords": [
    "<skill or keyword in JD not found in resume>",
    "<another gap>"
  ],
  "suggestions": [
    "<one concrete thing the candidate could add or reframe on their resume>",
    "<another suggestion>"
  ],
  "cover_letter_draft": "<3 paragraphs. Para 1: strong opener referencing the company and role. Para 2: 2–3 specific examples from their resume that map to the JD. Para 3: closing with enthusiasm and call to action. Do not use generic filler phrases like 'I am writing to express my interest'.>"
}`

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { applicationId } = await req.json()

  const [{ data: application }, { data: resume }] = await Promise.all([
    supabase.from('applications').select('*').eq('id', applicationId).eq('user_id', user.id).single(),
    supabase.from('resumes').select('*').eq('user_id', user.id).single()
  ])

  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  if (!resume?.content) return NextResponse.json({ error: 'No resume found. Please upload your resume first.' }, { status: 404 })

  const filledPrompt = PROMPT
    .replace('{{RESUME_TEXT}}', resume.content)
    .replace('{{JOB_DESCRIPTION}}', application.job_description)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: filledPrompt }]
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Strip markdown code fences if present
  const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  let analysis
  try {
    analysis = JSON.parse(cleaned)
  } catch {
    console.error('Raw AI response:', rawText)
    return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 })
  }

  const { data: saved, error: dbError } = await supabase.from('ai_analyses').upsert({
    application_id: applicationId,
    match_score: analysis.match_score,
    summary: analysis.summary,
    strengths: analysis.strengths,
    missing_keywords: analysis.missing_keywords,
    suggestions: analysis.suggestions,
    cover_letter_draft: analysis.cover_letter_draft,
  }, { onConflict: 'application_id' }).select().single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ analysis: saved })
}
