'use client'

interface Analysis {
  match_score: number
  summary: string
  strengths: string[]
  missing_keywords: string[]
  suggestions: string[]
  cover_letter_draft: string
}

interface Props {
  analysis: Analysis
}

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 75 ? 'text-green-600' :
    score >= 50 ? 'text-yellow-600' :
    'text-red-600'

  const bg =
    score >= 75 ? 'bg-green-50 border-green-200' :
    score >= 50 ? 'bg-yellow-50 border-yellow-200' :
    'bg-red-50 border-red-200'

  return (
    <div className={`inline-flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 ${bg}`}>
      <span className={`text-3xl font-bold ${color}`}>{score}</span>
      <span className="text-xs text-gray-500">/ 100</span>
    </div>
  )
}

export default function AnalysisResult({ analysis }: Props) {
  return (
    <div className="space-y-6">
      {/* Score + summary */}
      <div className="flex items-center gap-6">
        <ScoreCircle score={analysis.match_score} />
        <p className="text-sm text-gray-600 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Strengths */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Strengths</h3>
        <ul className="space-y-1">
          {analysis.strengths.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-green-500 mt-0.5">✓</span>
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Missing keywords */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Missing Keywords</h3>
        <div className="flex flex-wrap gap-2">
          {analysis.missing_keywords.map((k, i) => (
            <span key={i} className="bg-red-50 text-red-700 text-xs font-medium px-2 py-1 rounded-full border border-red-200">
              {k}
            </span>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Suggestions</h3>
        <ul className="space-y-1">
          {analysis.suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-blue-500 mt-0.5">→</span>
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Cover letter */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Cover Letter Draft</h3>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {analysis.cover_letter_draft}
        </div>
      </div>
    </div>
  )
}
