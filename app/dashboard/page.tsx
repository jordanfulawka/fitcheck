'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AddApplicationForm from '@/components/AddApplicationForm'

interface Application {
  id: string
  company: string
  role: string
  job_url: string | null
  status: string
  applied_at: string | null
  created_at: string
}

const statusColors: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-700',
  interviewing: 'bg-yellow-100 text-yellow-700',
  offer: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function DashboardPage() {
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  const fetchApplications = useCallback(async () => {
    const { data } = await supabase
      .from('applications')
      .select('id, company, role, job_url, status, applied_at, created_at')
      .order('created_at', { ascending: false })

    setApplications(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  function handleSuccess() {
    setShowForm(false)
    fetchApplications()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">FitCheck</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Application
        </button>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <p className="text-gray-400 text-sm text-center">Loading...</p>
        ) : applications.length === 0 ? (
          <p className="text-gray-400 text-sm text-center">No applications yet. Add your first one!</p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Applied</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {app.job_url ? (
                        <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {app.company}
                        </a>
                      ) : (
                        app.company
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{app.role}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[app.status]}`}>
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {app.applied_at
                        ? new Date(app.applied_at).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Add Application</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <AddApplicationForm onSuccess={handleSuccess} />
          </div>
        </div>
      )}
    </div>
  )
}
