'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onSuccess: () => void
}

export default function ResumeUpload({ onSuccess }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function extractTextFromPDF(file: File): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: unknown) => (item as { str: string }).str)
        .join(' ')
      fullText += pageText + '\n'
    }

    return fullText.trim()
  }

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      return
    }

    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not logged in.')
      setLoading(false)
      return
    }

    // Extract text from PDF
    let content: string
    try {
      content = await extractTextFromPDF(file)
    } catch {
      setError('Failed to read PDF. Please try another file.')
      setLoading(false)
      return
    }

    // Upload file to Supabase Storage
    const filePath = `${user.id}/resume.pdf`
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setLoading(false)
      return
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(filePath)

    // Save to resumes table
    const { error: dbError } = await supabase.from('resumes').upsert({
      user_id: user.id,
      file_url: publicUrl,
      content,
    }, { onConflict: 'user_id' })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onSuccess()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {loading ? (
          <p className="text-sm text-gray-500">Uploading and reading your resume...</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">Drag and drop your resume here, or</p>
            <label className="cursor-pointer bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Browse file
              <input
                type="file"
                accept=".pdf"
                onChange={handleInputChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-400 mt-3">PDF only</p>
          </>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  )
}
