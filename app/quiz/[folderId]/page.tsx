'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getFolders, getQuestions, getSettings, saveResult, generateId } from '@/lib/storage'
import { Folder, Question, Settings } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, ChevronRight, RotateCcw, RefreshCw } from 'lucide-react'

type Phase = 'question' | 'reveal' | 'finish'

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const folderId = params.folderId as string

  const [folder, setFolder] = useState<Folder | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [settings, setSettings] = useState<Settings>({ playerName: '' })
  const startIndex = Math.max(0, parseInt(searchParams.get('start') ?? '0', 10) || 0)
  const [current, setCurrent] = useState(startIndex)
  const [phase, setPhase] = useState<Phase>('question')
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [freeInput, setFreeInput] = useState('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [results, setResults] = useState<boolean[]>([])       // 最終正誤（1問1エントリ、handleNext時に確定）
  const [wrongCounts, setWrongCounts] = useState<number[]>([]) // 問題ごとの不正解回数
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([])

  useEffect(() => {
    const folders = getFolders()
    const found = folders.find(f => f.id === folderId)
    if (!found) { router.push('/'); return }
    setFolder(found)
    const qs = getQuestions(folderId)
    if (qs.length === 0) { router.push(`/folders/${folderId}`); return }
    setQuestions(qs)
    setSettings(getSettings())
  }, [folderId, router])

  const q = questions[current]

  useEffect(() => {
    if (!q || q.type === 'free') return
    setShuffledChoices([...q.choices].sort(() => Math.random() - 0.5))
  }, [current, q?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function recordAnswer(correct: boolean, answer: string) {
    setSelectedAnswer(answer)
    setIsCorrect(correct)
    if (!correct) {
      setWrongCounts(prev => {
        const next = [...prev]
        next[current] = (next[current] || 0) + 1
        return next
      })
    }
    setPhase('reveal')
  }

  function handleSelect(choice: string) {
    if (!choice.trim()) return
    recordAnswer(choice === q.answer, choice)
  }

  function handleFreeSubmit() {
    if (!freeInput.trim()) return
    const ans = freeInput.trim()
    recordAnswer(ans === q.answer, ans)
  }

  function handleRetry() {
    setSelectedAnswer('')
    setFreeInput('')
    setIsCorrect(null)
    setPhase('question')
  }

  function handleNext() {
    const newResults = [...results, isCorrect!]
    if (current + 1 >= questions.length) {
      const finalScore = newResults.filter(Boolean).length
      saveResult({
        id: generateId(),
        folderId,
        playerName: settings.playerName || 'プレイヤー',
        score: finalScore,
        total: questions.length,
        date: new Date().toISOString(),
      })
      setResults(newResults)
      setPhase('finish')
    } else {
      setResults(newResults)
      setCurrent(c => c + 1)
      setSelectedAnswer('')
      setFreeInput('')
      setIsCorrect(null)
      setPhase('question')
    }
  }

  function handleRestart() {
    setCurrent(0)
    setSelectedAnswer('')
    setFreeInput('')
    setIsCorrect(null)
    setResults([])
    setWrongCounts([])
    setPhase('question')
  }

  if (!folder || !q) return null

  const progress = (current / questions.length) * 100

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 pt-4 pb-2">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push(`/folders/${folderId}`)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1.5">
              <span>{folder.emoji} {folder.name}</span>
              <span>{current + 1} / {questions.length}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 flex flex-col">
        {phase === 'question' && (
          <QuestionPhase
            question={q}
            wrongCount={wrongCounts[current] || 0}
            shuffledChoices={shuffledChoices}
            freeInput={freeInput}
            setFreeInput={setFreeInput}
            onSelect={handleSelect}
            onFreeSubmit={handleFreeSubmit}
          />
        )}

        {phase === 'reveal' && (
          <RevealPhase
            question={q}
            selectedAnswer={selectedAnswer}
            isCorrect={isCorrect!}
            onNext={handleNext}
            onRetry={handleRetry}
            isLast={current + 1 >= questions.length}
          />
        )}

        {phase === 'finish' && (
          <FinishPhase
            score={results.filter(Boolean).length}
            total={questions.length}
            results={results}
            wrongCounts={wrongCounts}
            questions={questions}
            onRestart={handleRestart}
            onBack={() => router.push(`/folders/${folderId}`)}
          />
        )}
      </main>
    </div>
  )
}

function QuestionPhase({
  question,
  wrongCount,
  shuffledChoices,
  freeInput,
  setFreeInput,
  onSelect,
  onFreeSubmit,
}: {
  question: Question
  wrongCount: number
  shuffledChoices: string[]
  freeInput: string
  setFreeInput: (v: string) => void
  onSelect: (v: string) => void
  onFreeSubmit: () => void
}) {
  return (
    <div className="flex flex-col gap-5 animate-scale-in">
      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
        {wrongCount > 0 && (
          <p className="text-xs text-red-500 font-medium mb-2">
            ミス {wrongCount}回 — もう一度チャレンジ！
          </p>
        )}
        <p className="text-xl font-bold leading-relaxed text-foreground">{question.text}</p>
      </div>

      {question.type !== 'free' ? (
        <div className="grid grid-cols-1 gap-3">
          {shuffledChoices.map((choice, i) => (
            <button
              key={i}
              onClick={() => onSelect(choice)}
              disabled={!choice.trim()}
              className="flex items-center gap-3 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 active:scale-[0.98] transition-all text-left font-medium disabled:opacity-30"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-bold shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-foreground">{choice}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            value={freeInput}
            onChange={e => setFreeInput(e.target.value)}
            placeholder="答えを書いてください"
            className="rounded-2xl h-14 text-base px-4"
            onKeyDown={e => e.key === 'Enter' && onFreeSubmit()}
            autoFocus
          />
          <Button
            onClick={onFreeSubmit}
            disabled={!freeInput.trim()}
            className="w-full rounded-2xl h-12 text-base font-bold"
          >
            答える
          </Button>
        </div>
      )}
    </div>
  )
}

function RevealPhase({
  question,
  selectedAnswer,
  isCorrect,
  onNext,
  onRetry,
  isLast,
}: {
  question: Question
  selectedAnswer: string
  isCorrect: boolean
  onNext: () => void
  onRetry: () => void
  isLast: boolean
}) {
  return (
    <div className="flex flex-col gap-4 animate-scale-in">
      <div className={`rounded-3xl p-6 text-center ${
        isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
      }`}>
        <div className="text-5xl mb-2">{isCorrect ? '🎉' : '😅'}</div>
        <p className={`text-2xl font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
          {isCorrect ? '正解！！' : '不正解…'}
        </p>
        {!isCorrect && (
          <p className="text-muted-foreground text-sm mt-1">あなたの答え：{selectedAnswer}</p>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs text-muted-foreground mb-1 font-medium">正解</p>
        <p className="text-xl font-bold text-foreground">{question.answer}</p>
      </div>

      {question.explanation && (
        <div className="bg-muted/50 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1 font-medium">解説</p>
          <p className="text-base text-foreground leading-relaxed">{question.explanation}</p>
        </div>
      )}

      {!isCorrect && (
        <Button
          variant="outline"
          onClick={onRetry}
          className="w-full rounded-2xl h-12 text-base font-bold gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          問題に戻って再チャレンジ
        </Button>
      )}

      <Button onClick={onNext} className="w-full rounded-2xl h-12 text-base font-bold">
        {isLast ? '結果を見る' : '次の問題へ'}
        <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </div>
  )
}

function FinishPhase({
  score,
  total,
  results,
  wrongCounts,
  questions,
  onRestart,
  onBack,
}: {
  score: number
  total: number
  results: boolean[]
  wrongCounts: number[]
  questions: Question[]
  onRestart: () => void
  onBack: () => void
}) {
  const pct = Math.round((score / total) * 100)
  const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🎉' : pct >= 40 ? '👍' : '💪'
  const totalWrong = wrongCounts.reduce((sum, n) => sum + (n || 0), 0)

  return (
    <div className="flex flex-col gap-4 animate-scale-in pb-6">
      <div className="bg-card border border-border rounded-3xl p-8 text-center">
        <div className="text-6xl mb-4">{emoji}</div>
        <p className="text-5xl font-bold text-foreground mb-1">
          {score} <span className="text-2xl text-muted-foreground">/ {total}</span>
        </p>
        <p className="text-muted-foreground text-lg">正解率 {pct}%</p>
        {totalWrong > 0 && (
          <p className="text-sm text-red-400 mt-1">ミス合計 {totalWrong}回</p>
        )}
      </div>

      <div className="space-y-2">
        {questions.map((q, i) => {
          const misses = wrongCounts[i] || 0
          return (
            <div key={q.id} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3">
              <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold shrink-0 ${
                results[i] ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {results[i] ? '○' : '✕'}
              </span>
              <p className="text-sm text-foreground flex-1 line-clamp-1">{q.text}</p>
              <div className="flex items-center gap-2 shrink-0">
                {misses > 0 && (
                  <span className="text-xs bg-red-50 text-red-400 px-1.5 py-0.5 rounded-full font-medium">
                    {misses}ミス
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{q.answer}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 rounded-2xl h-12 font-bold">
          もどる
        </Button>
        <Button onClick={onRestart} className="flex-1 rounded-2xl h-12 font-bold gap-2">
          <RotateCcw className="w-4 h-4" />
          もう一度
        </Button>
      </div>
    </div>
  )
}
