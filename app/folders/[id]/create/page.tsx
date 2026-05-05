'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import QuestionForm from '@/components/QuestionForm'

export default function CreateQuestionPage() {
  const params = useParams()
  const folderId = params.id as string

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href={`/folders/${folderId}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">問題を作る</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <QuestionForm folderId={folderId} />
      </main>
    </div>
  )
}
