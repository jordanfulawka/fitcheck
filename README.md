# FitCheck

FitCheck is a job application tracker that uses AI to analyze how well your resume matches a job description. Paste in a job posting, upload your resume, and get an instant match score, strengths, gaps, and a personalized cover letter draft.

## Features

- **Google OAuth** — one-click sign in, no passwords
- **Application tracking** — log every job you apply to with company, role, status, notes, and date
- **Resume upload** — upload your resume as a PDF once and reuse it across all applications
- **AI analysis** powered by Claude (Anthropic):
  - Match score (0–100)
  - Summary of overall fit
  - Strengths from your resume that align with the job description
  - Missing keywords and skill gaps
  - Concrete suggestions to improve your resume for the role
  - A tailored cover letter draft
- **Cached results** — analyses are saved so you never pay for the same analysis twice

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database & Auth | Supabase (Postgres + Google OAuth) |
| Styling | Tailwind CSS |
| AI | Anthropic API (Claude) |
| Deployment | Vercel |

## Security

- All database queries are scoped to the authenticated user via Supabase RLS policies
- The Anthropic API key is never exposed to the browser — all AI calls happen server-side
- Resume files in storage are private and only accessible by the owning user
