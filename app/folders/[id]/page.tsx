'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getFolders, getQuestions, getResults,
  deleteQuestion, moveQuestion, copyQuestion,
} from '@/lib/storage'
import { Folder, Question, QuizResult } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus, Play, Pencil, Trash2, FileText,
  CheckSquare, History, MoreVertical, FolderInput, Copy,
} from 'lucide-react'

const TYPE_LABEL: Record<string, string> = {
  free: '記述',
  choice2: '2択',
  choice4: '4択',
}

const TYPE_COLOR: Record<string, string> = {
  free: 'bg-blue-100 text-blue-700',
  choice2: 'bg-orange-100 text-orange-700',
  choice4: 'bg-purple-100 text-purple-700',
}

type Tab = 'questions' | 'history'
type ActionTarget = { question: Question; type: 'menu' | 'move' | 'copy' | 'delete' }

export default function FolderPage() {
  const params = useParams()
  const router = useRouter()
  const folderId = params.id as string

  const [folder, setFolder] = useState<Folder | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [results, setResults] = useState<QuizResult[]>([])
  const [allFolders, setAllFolders] = useState<Folder[]>([])
  const [tab, setTab] = useState<Tab>('questions')
  const [action, setAction] = useState<ActionTarget | null>(null)

  useEffect(() => {
    const folders = getFolders()
    const found = folders.find(f => f.id === folderId)
    if (!found) { router.push('/'); return }
    setFolder(found)
    setAllFolders(folders)
    setQuestions(getQuestions(folderId))
    setResults(getResults(folderId).reverse())
  }, [folderId, router])

  function refresh() {
    setQuestions(getQuestions(folderId))
    setAllFolders(getFolders())
  }

  function handleDelete(id: string) {
    deleteQuestion(id)
    refresh()
    setAction(null)
  }

  function handleMove(question: Question, targetId: string) {
    moveQuestion(question.id, targetId)
    refresh()
    setAction(null)
  }

  function handleCopy(question: Question, targetId: string) {
    copyQuestion(question, targetId)
    refresh()
    setAction(null)
  }

  const otherFolders = allFolders.filter(f => f.id !== folderId)

  if (!folder) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="font-bold text-foreground hover:opacity-80 transition-opacity shrink-0">
            みんなのクイズ
          </Link>
          <span className="text-muted-foreground shrink-0">/</span>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-3xl">{folder.emoji}</span>
            <h1 className="text-xl font-bold truncate">{folder.name}</h1>
          </div>
          {questions.length > 0 && (
            <Link href={`/quiz/${folderId}`}>
              <Button size="sm" className="rounded-full shrink-0 gap-1.5">
                <Play className="w-4 h-4" />
                スタート
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          <button
            onClick={() => setTab('questions')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'questions'
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            問題 {questions.length > 0 && <span className="text-xs">({questions.length})</span>}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'history'
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-4 h-4" />
            履歴 {results.length > 0 && <span className="text-xs">({results.length})</span>}
          </button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {/* Questions tab */}
        {tab === 'questions' && (
          <>
            {questions.length === 0 ? (
              <div className="text-center py-16 animate-fade-in-up">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-muted-foreground text-lg mb-2">まだ問題がありません</p>
                <p className="text-muted-foreground text-sm mb-6">最初の問題を作ってみよう！</p>
                <Link href={`/folders/${folderId}/create`}>
                  <Button className="rounded-full px-6">
                    <Plus className="w-4 h-4 mr-2" />
                    問題を作る
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={i}
                    folderId={folderId}
                    onMenu={() => setAction({ question: q, type: 'menu' })}
                  />
                ))}
              </div>
            )}

            {questions.length > 0 && (
              <div className="fixed bottom-6 right-6">
                <Link href={`/folders/${folderId}/create`}>
                  <Button size="lg" className="rounded-full w-14 h-14 shadow-lg" title="問題を追加">
                    <Plus className="w-6 h-6" />
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div className="py-2 animate-fade-in-up">
            {results.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-muted-foreground text-lg mb-2">まだ履歴がありません</p>
                <p className="text-muted-foreground text-sm">クイズをやってみよう！</p>
              </div>
            ) : (
              <>
                <BestScores results={results} />
                <div className="mt-5">
                  <p className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wider">すべての記録</p>
                  <div className="space-y-2">
                    {results.map((r, i) => (
                      <HistoryCard key={r.id} result={r} index={i} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* アクションメニュー */}
      <Dialog
        open={action?.type === 'menu'}
        onOpenChange={open => !open && setAction(null)}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base line-clamp-1 pr-4">
              {action?.question.text}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-1">
            <Link href={`/folders/${folderId}/edit/${action?.question.id}`} onClick={() => setAction(null)}>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left">
                <Pencil className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="font-medium">編集する</span>
              </button>
            </Link>
            <button
              onClick={() => action && setAction({ ...action, type: 'move' })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left"
            >
              <FolderInput className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="font-medium">別のフォルダに移動</span>
            </button>
            <button
              onClick={() => action && setAction({ ...action, type: 'copy' })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left"
            >
              <Copy className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="font-medium">コピーして別のフォルダに追加</span>
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={() => action && setAction({ ...action, type: 'delete' })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-destructive transition-colors text-left"
            >
              <Trash2 className="w-5 h-5 shrink-0" />
              <span className="font-medium">削除する</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 移動先フォルダ選択 */}
      <Dialog
        open={action?.type === 'move'}
        onOpenChange={open => !open && setAction(null)}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>移動先のフォルダを選択</DialogTitle>
          </DialogHeader>
          {otherFolders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">他のフォルダがありません</p>
          ) : (
            <div className="flex flex-col gap-2 pt-1 max-h-72 overflow-y-auto">
              {otherFolders.map(f => (
                <button
                  key={f.id}
                  onClick={() => action && handleMove(action.question, f.id)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <span className="text-2xl shrink-0">{f.emoji}</span>
                  <span className="font-medium">{f.name}</span>
                </button>
              ))}
            </div>
          )}
          <Button variant="outline" onClick={() => setAction(null)} className="rounded-xl mt-1">
            キャンセル
          </Button>
        </DialogContent>
      </Dialog>

      {/* コピー先フォルダ選択 */}
      <Dialog
        open={action?.type === 'copy'}
        onOpenChange={open => !open && setAction(null)}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>コピー先のフォルダを選択</DialogTitle>
          </DialogHeader>
          {allFolders.filter(f => true).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">フォルダがありません</p>
          ) : (
            <div className="flex flex-col gap-2 pt-1 max-h-72 overflow-y-auto">
              {allFolders.map(f => (
                <button
                  key={f.id}
                  onClick={() => action && handleCopy(action.question, f.id)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <span className="text-2xl shrink-0">{f.emoji}</span>
                  <div className="min-w-0">
                    <span className="font-medium">{f.name}</span>
                    {f.id === folderId && (
                      <span className="text-xs text-muted-foreground ml-2">（このフォルダ）</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          <Button variant="outline" onClick={() => setAction(null)} className="rounded-xl mt-1">
            キャンセル
          </Button>
        </DialogContent>
      </Dialog>

      {/* 削除確認 */}
      <Dialog
        open={action?.type === 'delete'}
        onOpenChange={open => !open && setAction(null)}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>問題を削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">この操作は取り消せません。</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setAction(null)} className="flex-1 rounded-xl">
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => action && handleDelete(action.question.id)}
              className="flex-1 rounded-xl"
            >
              削除する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BestScores({ results }: { results: QuizResult[] }) {
  const byPlayer = results.reduce<Record<string, QuizResult[]>>((acc, r) => {
    if (!acc[r.playerName]) acc[r.playerName] = []
    acc[r.playerName].push(r)
    return acc
  }, {})

  const players = Object.entries(byPlayer).map(([name, rs]) => {
    const best = rs.reduce((b, r) => (r.score / r.total > b.score / b.total ? r : b))
    const avg = Math.round(rs.reduce((sum, r) => sum + r.score / r.total * 100, 0) / rs.length)
    return { name, best, avg, count: rs.length }
  }).sort((a, b) => b.best.score / b.best.total - a.best.score / a.best.total)

  if (players.length === 0) return null

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wider">ランキング</p>
      <div className="space-y-2">
        {players.map((p, i) => {
          const pct = Math.round(p.best.score / p.best.total * 100)
          return (
            <div key={p.name} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl shrink-0">{medals[i] ?? '🏅'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.count}回プレイ　平均 {p.avg}%</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-primary">{pct}%</p>
                <p className="text-xs text-muted-foreground">ベスト</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HistoryCard({ result, index }: { result: QuizResult; index: number }) {
  const pct = Math.round(result.score / result.total * 100)
  const date = new Date(result.date)
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🎉' : pct >= 40 ? '👍' : '💪'

  return (
    <div
      className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 animate-fade-in-up"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <span className="text-xl shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm">{result.playerName}</p>
        <p className="text-xs text-muted-foreground">{dateStr}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-foreground">{result.score}<span className="text-muted-foreground font-normal text-xs"> / {result.total}</span></p>
        <p className={`text-xs font-medium ${pct === 100 ? 'text-yellow-500' : pct >= 70 ? 'text-green-600' : 'text-muted-foreground'}`}>
          {pct}%
        </p>
      </div>
    </div>
  )
}

function QuestionCard({
  question,
  index,
  folderId,
  onMenu,
}: {
  question: Question
  index: number
  folderId: string
  onMenu: () => void
}) {
  const Icon = question.type === 'free' ? FileText : CheckSquare

  return (
    <div
      className="group relative bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200 animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Link href={`/quiz/${folderId}?start=${index}`} className="flex items-start gap-3 pr-10">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLOR[question.type]}`}>
              <Icon className="w-3 h-3" />
              {TYPE_LABEL[question.type]}
            </span>
          </div>
          <p className="font-medium text-foreground leading-relaxed line-clamp-2">{question.text}</p>
          {question.explanation && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">解説あり</p>
          )}
        </div>
      </Link>

      <button
        onClick={e => { e.stopPropagation(); onMenu() }}
        className="absolute top-3 right-3 p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
        title="操作メニュー"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
  )
}
