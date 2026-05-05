'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getQuestions } from '@/lib/storage'
import { Question } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import QuestionForm from '@/components/QuestionForm'

export default function EditQuestionPage() {
  const params = useParams()
  const router = useRouter()
  const folderId = params.id as string
  const qid = params.qid as string

  const [question, setQuestion] = useState<Question | null>(null)

  useEffect(() => {
    const questions = getQuestions(folderId)
    const found = questions.find(q => q.id === qid)
    if (!found) { router.push(`/folders/${folderId}`); return }
    setQuestion(found)
  }, [folderId, qid, router])

  if (!question) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href={`/folders/${folderId}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">問題を編集</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <QuestionForm folderId={folderId} initial={question} />
      </main>
    </div>
  )
}
