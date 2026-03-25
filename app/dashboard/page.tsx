'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AddApplicationForm from '@/components/AddApplicationForm'
import ResumeUpload from '@/components/ResumeUpload'
import AnalysisResult from '@/components/AnalysisResult'

interface Application {
  id: string
  company: string
  role: string
  job_url: string | null
  status: string
  applied_at: string | null
  created_at: string
  ai_analyses?: { match_score: number }[] | null
}

interface Resume {
  file_url: string
  created_at: string
}

interface Analysis {
  match_score: number
  summary: string
  strengths: string[]
  missing_keywords: string[]
  suggestions: string[]
  cover_letter_draft: string
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  applied:      { label: 'Applied',      classes: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  interviewing: { label: 'Interviewing', classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  offer:        { label: 'Offer',        classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  rejected:     { label: 'Rejected',     classes: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'
  return <span className={`text-sm font-semibold tabular-nums ${color}`}>{score}<span className="text-gray-400 font-normal text-xs">/100</span></span>
}

export default function DashboardPage() {
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [showResumeUpload, setShowResumeUpload] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [resume, setResume] = useState<Resume | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analysisApp, setAnalysisApp] = useState<Application | null>(null)

  const fetchData = useCallback(async () => {
    const [{ data: apps }, { data: resumeData }] = await Promise.all([
      supabase
        .from('applications')
        .select('id, company, role, job_url, status, applied_at, created_at, ai_analyses(match_score)')
        .order('created_at', { ascending: false }),
      supabase.from('resumes').select('file_url, created_at').single()
    ])
    setApplications(apps ?? [])
    setResume(resumeData)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleStatusChange(id: string, status: string) {
    await supabase.from('applications').update({ status }).eq('id', id)
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  async function handleView(app: Application) {
    const { data } = await supabase.from('ai_analyses').select('*').eq('application_id', app.id).single()
    if (data) { setAnalysis(data); setAnalysisApp(app) }
  }

  async function handleAnalyze(app: Application) {
    setAnalyzingId(app.id)
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: app.id }),
    })
    const data = await res.json()
    setAnalyzingId(null)
    if (data.error) { alert(data.error); return }
    setAnalysis(data.analysis)
    setAnalysisApp(app)
    fetchData()
  }

  function getAnalysis(app: Application) {
    if (!app.ai_analyses) return null
    return Array.isArray(app.ai_analyses) ? app.ai_analyses[0] : app.ai_analyses as unknown as { match_score: number }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900 tracking-tight">FitCheck</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
          >
            Sign out
          </button>
          <button
            onClick={() => setShowResumeUpload(true)}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {resume ? 'Update Resume' : 'Upload Resume'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Application
          </button>
        </div>
      </header>

      <main className="px-8 py-8 max-w-screen-xl mx-auto">
        {/* Stats row */}
        {!loading && applications.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {(['applied', 'interviewing', 'offer', 'rejected'] as const).map(s => {
              const count = applications.filter(a => a.status === s).length
              const { label, classes } = statusConfig[s]
              return (
                <div key={s} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Resume banner */}
        {!loading && !resume && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6 text-sm text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Upload your resume to enable AI analysis on your applications.
            </div>
            <button onClick={() => setShowResumeUpload(true)} className="text-amber-900 font-medium underline underline-offset-2 hover:text-amber-700">
              Upload now
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Loading...</div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 border-dashed flex flex-col items-center justify-center py-24 text-center">
            <p className="text-gray-500 font-medium mb-1">No applications yet</p>
            <p className="text-gray-400 text-sm mb-5">Start tracking your job search by adding your first application.</p>
            <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Add Application
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3 font-medium w-[22%]">Company</th>
                  <th className="px-6 py-3 font-medium w-[28%]">Role</th>
                  <th className="px-6 py-3 font-medium w-[15%]">Status</th>
                  <th className="px-6 py-3 font-medium w-[12%]">Applied</th>
                  <th className="px-6 py-3 font-medium w-[10%]">Fit Score</th>
                  <th className="px-6 py-3 font-medium w-[13%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {applications.map((app) => {
                  const cached = getAnalysis(app)
                  return (
                    <tr key={app.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 truncate">
                        {app.job_url ? (
                          <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline transition-colors">
                            {app.company}
                          </a>
                        ) : app.company}
                      </td>
                      <td className="px-6 py-4 text-gray-600 truncate">{app.role}</td>
                      <td className="px-6 py-4">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusConfig[app.status]?.classes}`}
                        >
                          <option value="applied">Applied</option>
                          <option value="interviewing">Interviewing</option>
                          <option value="offer">Offer</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {cached ? <ScoreBadge score={cached.match_score} /> : <span className="text-gray-300 text-sm">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 justify-end">
                          {cached ? (
                            <>
                              <button onClick={() => handleView(app)} className="text-blue-600 text-xs font-medium hover:underline">
                                View
                              </button>
                              <button
                                onClick={() => handleAnalyze(app)}
                                disabled={analyzingId === app.id || !resume}
                                className="text-gray-400 text-xs font-medium hover:text-gray-600 hover:underline disabled:opacity-40"
                              >
                                {analyzingId === app.id ? 'Analyzing...' : 'Re-analyze'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleAnalyze(app)}
                              disabled={analyzingId === app.id || !resume}
                              className="text-blue-600 text-xs font-medium hover:underline disabled:opacity-40"
                            >
                              {analyzingId === app.id ? 'Analyzing...' : 'Analyze'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add Application Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Add Application</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-8 py-6">
              <AddApplicationForm onSuccess={() => { setShowForm(false); fetchData() }} />
            </div>
          </div>
        </div>
      )}

      {/* Resume Upload Modal */}
      {showResumeUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">{resume ? 'Update Resume' : 'Upload Resume'}</h2>
              <button onClick={() => setShowResumeUpload(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-8 py-6">
              {resume && (
                <p className="text-sm text-gray-500 mb-4">Last uploaded {new Date(resume.created_at).toLocaleDateString()}. Uploading a new file will replace it.</p>
              )}
              <ResumeUpload onSuccess={() => { setShowResumeUpload(false); fetchData() }} />
            </div>
          </div>
        </div>
      )}

      {/* Analysis Modal */}
      {analysis && analysisApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="text-base font-semibold text-gray-900">FitCheck Analysis</h2>
                <p className="text-sm text-gray-400 mt-0.5">{analysisApp.role} at {analysisApp.company}</p>
              </div>
              <button onClick={() => { setAnalysis(null); setAnalysisApp(null) }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-8 py-6">
              <AnalysisResult analysis={analysis} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
