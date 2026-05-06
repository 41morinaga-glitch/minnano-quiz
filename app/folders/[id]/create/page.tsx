'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getFolders } from '@/lib/storage'
import { Folder } from '@/lib/types'
import QuestionForm from '@/components/QuestionForm'

export default function CreateQuestionPage() {
  const params = useParams()
  const folderId = params.id as string
  const [folder, setFolder] = useState<Folder | null>(null)

  useEffect(() => {
    const found = getFolders().find(f => f.id === folderId)
    if (found) setFolder(found)
  }, [folderId])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="font-bold text-foreground hover:opacity-80 transition-opacity shrink-0">
            みんなのクイズ
          </Link>
          <span className="text-muted-foreground shrink-0">/</span>
          <Link href={`/folders/${folderId}`} className="font-semibold text-foreground hover:opacity-80 transition-opacity truncate min-w-0">
            {folder ? `${folder.emoji} ${folder.name}` : '…'}
          </Link>
          <span className="text-muted-foreground shrink-0">/</span>
          <h1 className="font-bold shrink-0">問題を作る</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <QuestionForm folderId={folderId} />
      </main>
    </div>
  )
}
