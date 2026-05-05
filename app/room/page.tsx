'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getFolders, getQuestions } from '@/lib/storage'
import { Folder, Question } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Copy, Check, Users, Send } from 'lucide-react'

type RoomEvent =
  | { type: 'connected'; payload: { code: string } }
  | { type: 'question'; payload: Question }
  | { type: 'answer'; payload: { answer: string; questionId: string } }
  | { type: 'reveal'; payload: { correct: boolean } }
  | { type: 'ping' }

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default function RoomPage() {
  const [mode, setMode] = useState<'select' | 'host' | 'join'>('select')
  const [code, setCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [connected, setConnected] = useState(false)
  const [copied, setCopied] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [receivedQuestion, setReceivedQuestion] = useState<Question | null>(null)
  const [myAnswer, setMyAnswer] = useState('')
  const [waitingAnswer, setWaitingAnswer] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    setFolders(getFolders())
  }, [])

  function addLog(msg: string) {
    setLog(prev => [...prev.slice(-20), msg])
  }

  function connect(roomCode: string) {
    eventSourceRef.current?.close()
    const es = new EventSource(`/api/room?code=${roomCode}`)
    eventSourceRef.current = es

    es.onmessage = (e) => {
      const event: RoomEvent = JSON.parse(e.data)
      if (event.type === 'connected') {
        setConnected(true)
        addLog('接続しました！')
      }
      if (event.type === 'question') {
        setReceivedQuestion(event.payload)
        setMyAnswer('')
        addLog(`問題が届きました：${event.payload.text.slice(0, 20)}…`)
      }
      if (event.type === 'answer') {
        addLog(`回答が届きました：${event.payload.answer}`)
        setWaitingAnswer(false)
      }
      if (event.type === 'reveal') {
        addLog(event.payload.correct ? '正解！🎉' : '不正解…😅')
      }
    }

    es.onerror = () => {
      setConnected(false)
      addLog('接続が切れました。再接続中…')
    }
  }

  async function sendEvent(roomCode: string, event: RoomEvent) {
    await fetch(`/api/room?code=${roomCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  }

  function handleHostStart() {
    const newCode = generateCode()
    setCode(newCode)
    setMode('host')
    connect(newCode)
  }

  function handleJoin() {
    if (joinCode.length !== 6) return
    setCode(joinCode)
    setMode('join')
    connect(joinCode)
  }

  async function handleSendQuestion() {
    if (!selectedFolder) return
    const questions = getQuestions(selectedFolder)
    if (questions.length === 0) return
    const q = questions[Math.floor(Math.random() * questions.length)]
    await sendEvent(code, { type: 'question', payload: q })
    setWaitingAnswer(true)
    addLog(`問題を送りました：${q.text.slice(0, 20)}…`)
  }

  async function handleSendAnswer() {
    if (!myAnswer.trim() || !receivedQuestion) return
    await sendEvent(code, { type: 'answer', payload: { answer: myAnswer, questionId: receivedQuestion.id } })
    addLog(`回答を送りました：${myAnswer}`)
    setMyAnswer('')
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    return () => { eventSourceRef.current?.close() }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">親子で遊ぶ</h1>
            <p className="text-xs text-muted-foreground">2つの端末をつないでクイズを送り合おう</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Select mode */}
        {mode === 'select' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="bg-muted/50 rounded-2xl p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">🔗 つなぎ方</p>
              <p>一方が「部屋を作る」、もう一方が「部屋に入る」でルームコードを共有します。</p>
            </div>

            <button
              onClick={handleHostStart}
              className="w-full bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-2xl p-6 text-left transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
                  🏠
                </div>
                <div>
                  <p className="font-bold text-lg">部屋を作る</p>
                  <p className="text-muted-foreground text-sm">ルームコードを作って相手に教える</p>
                </div>
              </div>
            </button>

            <div className="bg-card border-2 border-border rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-2xl">
                  🚪
                </div>
                <div>
                  <p className="font-bold text-lg">部屋に入る</p>
                  <p className="text-muted-foreground text-sm">相手から聞いたコードを入力する</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6桁のコード"
                  className="rounded-xl text-center text-lg font-bold tracking-widest"
                  maxLength={6}
                />
                <Button onClick={handleJoin} disabled={joinCode.length !== 6} className="rounded-xl px-5">
                  入る
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Connected room */}
        {mode !== 'select' && (
          <div className="space-y-4 animate-fade-in-up">
            {/* Code display */}
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">ルームコード</p>
                <p className="text-3xl font-bold tracking-widest text-primary">{code}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium ${
                  connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                  {connected ? '接続中' : '待機中'}
                </div>
                <button onClick={copyCode} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
                </button>
              </div>
            </div>

            {/* Host: send question */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <p className="font-medium flex items-center gap-2">
                <Send className="w-4 h-4" /> 問題を送る
              </p>
              {folders.length === 0 ? (
                <p className="text-muted-foreground text-sm">まずホーム画面でフォルダと問題を作ってください</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2">
                    {folders.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFolder(f.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          selectedFolder === f.id
                            ? 'border-primary bg-primary/8'
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <span className="text-2xl">{f.emoji}</span>
                        <span className="font-medium">{f.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {getQuestions(f.id).length}問
                        </span>
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={handleSendQuestion}
                    disabled={!selectedFolder || !connected || waitingAnswer}
                    className="w-full rounded-xl"
                  >
                    {waitingAnswer ? '回答待ち中…' : 'ランダムで問題を送る'}
                  </Button>
                </>
              )}
            </div>

            {/* Received question */}
            {receivedQuestion && (
              <div className="bg-primary/5 border-2 border-primary/30 rounded-2xl p-4 space-y-3 animate-scale-in">
                <p className="font-medium text-primary">届いた問題！</p>
                <p className="text-foreground font-medium leading-relaxed">{receivedQuestion.text}</p>
                <div className="flex gap-2">
                  <Input
                    value={myAnswer}
                    onChange={e => setMyAnswer(e.target.value)}
                    placeholder="答えを入力"
                    className="rounded-xl"
                    onKeyDown={e => e.key === 'Enter' && handleSendAnswer()}
                  />
                  <Button onClick={handleSendAnswer} disabled={!myAnswer.trim()} className="rounded-xl shrink-0">
                    送る
                  </Button>
                </div>
              </div>
            )}

            {/* Log */}
            {log.length > 0 && (
              <div className="bg-muted/50 rounded-2xl p-4 space-y-1.5 max-h-40 overflow-y-auto">
                <p className="text-xs text-muted-foreground font-medium mb-2">ログ</p>
                {log.slice().reverse().map((l, i) => (
                  <p key={i} className="text-sm text-muted-foreground">{l}</p>
                ))}
              </div>
            )}

            <Button variant="outline" onClick={() => { eventSourceRef.current?.close(); setMode('select'); setConnected(false); setLog([]) }} className="w-full rounded-xl">
              部屋を退出する
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
