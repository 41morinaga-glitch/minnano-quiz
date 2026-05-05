'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getFolders, getQuestions } from '@/lib/storage'
import { Folder, Question } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Copy, Check, Send, Trophy, Clock } from 'lucide-react'

// host: 問題を出す側 / join: 答える側
type Role = 'host' | 'join'

type Phase =
  | 'waiting-member'   // 相手の入室待ち
  | 'idle'             // 接続済み・待機中
  | 'waiting-answer'   // [host] 問題送信済み・回答待ち
  | 'got-answer'       // [host] 回答受信・判定待ち
  | 'answering'        // [join] 問題受信・回答入力中
  | 'waiting-result'   // [join] 回答送信済み・結果待ち
  | 'result'           // 結果表示（両者）

export default function RoomPage() {
  const [step, setStep] = useState<'select' | 'room'>('select')
  const [role, setRole] = useState<Role>('host')
  const [code, setCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [memberCount, setMemberCount] = useState(0)
  const [phase, setPhase] = useState<Phase>('waiting-member')
  const [copied, setCopied] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [receivedAnswer, setReceivedAnswer] = useState('')
  const [myAnswer, setMyAnswer] = useState('')
  const [result, setResult] = useState<boolean | null>(null)

  // ref で最新の role を SSE ハンドラ内で参照
  const roleRef = useRef<Role>('host')
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => { setFolders(getFolders()) }, [])

  // 部屋にいる間、ブラウザバックや誤操作を警告
  useEffect(() => {
    if (step !== 'room') return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [step])

  useEffect(() => () => esRef.current?.close(), [])

  function connect(roomCode: string) {
    esRef.current?.close()
    const es = new EventSource(`/api/room?code=${roomCode}`)
    esRef.current = es

    es.onmessage = (e) => {
      const event = JSON.parse(e.data)
      const r = roleRef.current

      switch (event.type) {
        case 'connected':
          setMemberCount(event.payload.count)
          setPhase(event.payload.count >= 2 ? 'idle' : 'waiting-member')
          break
        case 'joined':
          setMemberCount(event.payload.count)
          setPhase(prev => prev === 'waiting-member' ? 'idle' : prev)
          break
        case 'left':
          setMemberCount(event.payload.count)
          if (event.payload.count < 2) setPhase('waiting-member')
          break
        case 'question':
          if (r === 'join') {
            setCurrentQuestion(event.payload)
            setMyAnswer('')
            setResult(null)
            setPhase('answering')
          }
          break
        case 'answer':
          if (r === 'host') {
            setReceivedAnswer(event.payload.answer)
            setPhase('got-answer')
          }
          break
        case 'result':
          setResult(event.payload.correct)
          setPhase('result')
          break
      }
    }
  }

  async function post(event: object) {
    await fetch(`/api/room?code=${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  }

  function startHost() {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString()
    roleRef.current = 'host'
    setRole('host')
    setCode(newCode)
    setStep('room')
    setPhase('waiting-member')
    setMemberCount(1)
    connect(newCode)
  }

  function startJoin() {
    if (joinCode.length !== 6) return
    roleRef.current = 'join'
    setRole('join')
    setCode(joinCode)
    setStep('room')
    setPhase('waiting-member')
    connect(joinCode)
  }

  async function sendQuestion() {
    if (!selectedFolder || memberCount < 2) return
    const qs = getQuestions(selectedFolder)
    if (!qs.length) return
    const q = qs[Math.floor(Math.random() * qs.length)]
    setCurrentQuestion(q)
    setReceivedAnswer('')
    setResult(null)
    setPhase('waiting-answer')
    await post({ type: 'question', payload: q })
  }

  async function sendAnswer() {
    if (!myAnswer.trim()) return
    await post({ type: 'answer', payload: { answer: myAnswer } })
    setPhase('waiting-result')
  }

  async function sendResult(correct: boolean) {
    setResult(correct)
    setPhase('result')
    await post({ type: 'result', payload: { correct } })
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function exitRoom() {
    esRef.current?.close()
    setStep('select')
    setCode('')
    setJoinCode('')
    setMemberCount(0)
    setPhase('waiting-member')
    setCurrentQuestion(null)
    setReceivedAnswer('')
    setMyAnswer('')
    setResult(null)
  }

  // 参加者は問題に答えるまで退出できない
  const exitLocked = role === 'join' && (phase === 'answering' || phase === 'waiting-result')

  // ===== SELECT SCREEN =====
  if (step === 'select') {
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
              <p className="text-xs text-muted-foreground">2台の端末でつながってクイズを出し合おう</p>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* 説明 */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-sm space-y-2">
            <p className="font-bold text-foreground">📱 つなぎ方</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>問題を出す人が「問題を出す」を押してコードを確認</li>
              <li>答える人が「答える」を押してコードを入力</li>
              <li>つながったら問題を送ってスタート！</li>
            </ol>
          </div>

          {/* 問題を出す側 */}
          <button
            onClick={startHost}
            className="w-full bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-2xl p-6 text-left transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
                🎤
              </div>
              <div>
                <p className="font-bold text-lg">問題を出す</p>
                <p className="text-muted-foreground text-sm">部屋を作ってコードを相手に教える</p>
              </div>
            </div>
          </button>

          {/* 答える側 */}
          <div className="bg-card border-2 border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-3xl">
                ✏️
              </div>
              <div>
                <p className="font-bold text-lg">答える</p>
                <p className="text-muted-foreground text-sm">相手から聞いたコードを入力して入室</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6桁のコード"
                className="rounded-xl text-center text-2xl font-bold tracking-widest h-14"
                maxLength={6}
                inputMode="numeric"
              />
              <Button
                onClick={startJoin}
                disabled={joinCode.length !== 6}
                className="rounded-xl px-6 h-14 font-bold"
              >
                入室
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ===== ROOM SCREEN =====
  const paired = memberCount >= 2

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xl">{role === 'host' ? '🎤' : '✏️'}</span>
            <div>
              <p className="font-bold">{role === 'host' ? '問題を出す' : '答える'}</p>
              <p className="text-xs text-muted-foreground">
                {paired ? '🟢 つながっています' : '🟡 相手の入室を待っています…'}
              </p>
            </div>
          </div>

          {/* コードとコピー */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">コード</p>
              <p className="text-xl font-bold tracking-widest text-primary">{code}</p>
            </div>
            <button
              onClick={copyCode}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="コードをコピー"
            >
              {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ===== HOST VIEW ===== */}
        {role === 'host' && (
          <>
            {/* 相手待ち */}
            {phase === 'waiting-member' && (
              <div className="text-center py-12 animate-fade-in-up">
                <div className="text-6xl mb-4 animate-pulse">📲</div>
                <p className="text-xl font-bold mb-2">相手の入室を待っています</p>
                <p className="text-muted-foreground text-sm mb-6">
                  コード <span className="font-bold text-primary text-lg tracking-widest">{code}</span> を相手に教えてください
                </p>
                <button
                  onClick={copyCode}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-primary/30 text-primary font-medium hover:bg-primary/5 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'コピーしました！' : 'コードをコピー'}
                </button>
              </div>
            )}

            {/* 接続済み：問題を送る */}
            {(phase === 'idle') && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                  <p className="text-green-700 font-bold text-lg">🎉 つながりました！</p>
                  <p className="text-green-600 text-sm">問題を選んで送りましょう</p>
                </div>

                {folders.length === 0 ? (
                  <div className="bg-muted/50 rounded-2xl p-6 text-center text-muted-foreground">
                    <p className="text-4xl mb-2">📂</p>
                    <p className="text-sm">ホーム画面でフォルダと問題を先に作ってください</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">フォルダを選んで送る</p>
                    {folders.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFolder(f.id)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                          selectedFolder === f.id
                            ? 'border-primary bg-primary/8 shadow-sm'
                            : 'border-border hover:border-primary/40 bg-card'
                        }`}
                      >
                        <span className="text-2xl">{f.emoji}</span>
                        <span className="font-medium flex-1">{f.name}</span>
                        <span className="text-xs text-muted-foreground">{getQuestions(f.id).length}問</span>
                      </button>
                    ))}
                    <Button
                      onClick={sendQuestion}
                      disabled={!selectedFolder}
                      className="w-full rounded-2xl h-12 text-base font-bold gap-2"
                    >
                      <Send className="w-4 h-4" />
                      ランダムで問題を送る
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 回答待ち */}
            {phase === 'waiting-answer' && currentQuestion && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5 text-center">
                  <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2 animate-pulse" />
                  <p className="font-bold text-yellow-700 text-lg">回答待ち中…</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">送った問題</p>
                  <p className="font-medium text-foreground">{currentQuestion.text}</p>
                  <p className="text-xs text-muted-foreground mt-2">正解：<span className="text-foreground font-medium">{currentQuestion.answer}</span></p>
                </div>
              </div>
            )}

            {/* 回答受信・判定 */}
            {phase === 'got-answer' && currentQuestion && (
              <div className="space-y-4 animate-scale-in">
                <div className="bg-card border-2 border-primary/30 rounded-2xl p-5">
                  <p className="text-xs text-muted-foreground mb-1">問題</p>
                  <p className="font-medium text-foreground mb-4">{currentQuestion.text}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">正解</p>
                      <p className="font-bold text-foreground">{currentQuestion.answer}</p>
                    </div>
                    <div className="bg-primary/5 rounded-xl p-3 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-0.5">相手の回答</p>
                      <p className="font-bold text-foreground">{receivedAnswer}</p>
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground font-medium">どちらにしますか？</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => sendResult(true)}
                    className="rounded-2xl h-14 text-lg font-bold bg-green-500 hover:bg-green-600"
                  >
                    ✅ 正解！
                  </Button>
                  <Button
                    onClick={() => sendResult(false)}
                    variant="outline"
                    className="rounded-2xl h-14 text-lg font-bold border-red-300 text-red-600 hover:bg-red-50"
                  >
                    ❌ 不正解
                  </Button>
                </div>
              </div>
            )}

            {/* 結果表示（host） */}
            {phase === 'result' && (
              <div className="space-y-4 animate-scale-in">
                <div className={`rounded-3xl p-8 text-center ${result ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                  <div className="text-6xl mb-3">{result ? '🎉' : '😅'}</div>
                  <p className={`text-2xl font-bold ${result ? 'text-green-700' : 'text-red-600'}`}>
                    {result ? '正解！！' : '不正解…'}
                  </p>
                </div>
                <Button onClick={() => setPhase('idle')} className="w-full rounded-2xl h-12 font-bold">
                  次の問題を送る
                </Button>
              </div>
            )}
          </>
        )}

        {/* ===== JOIN VIEW ===== */}
        {role === 'join' && (
          <>
            {/* 相手待ち / 接続待ち */}
            {phase === 'waiting-member' && (
              <div className="text-center py-12 animate-fade-in-up">
                <div className="text-6xl mb-4 animate-pulse">🔗</div>
                <p className="text-xl font-bold mb-2">接続しています…</p>
                <p className="text-muted-foreground text-sm">コード <span className="font-bold text-primary">{code}</span> の部屋に入っています</p>
              </div>
            )}

            {/* 問題待ち */}
            {phase === 'idle' && (
              <div className="text-center py-12 animate-fade-in-up">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-xl font-bold mb-2">つながりました！</p>
                <p className="text-muted-foreground text-sm">問題が届くのを待っています…</p>
              </div>
            )}

            {/* 問題が届いた！回答中 */}
            {phase === 'answering' && currentQuestion && (
              <div className="space-y-4 animate-scale-in">
                <div className="bg-primary/5 border-2 border-primary/30 rounded-3xl p-6">
                  <p className="text-xs text-primary font-bold mb-3 uppercase tracking-wider">問題が届きました！</p>
                  <p className="text-xl font-bold leading-relaxed text-foreground">{currentQuestion.text}</p>
                </div>
                <div className="space-y-3">
                  <Input
                    value={myAnswer}
                    onChange={e => setMyAnswer(e.target.value)}
                    placeholder="答えを入力"
                    className="rounded-2xl h-14 text-base px-4"
                    onKeyDown={e => e.key === 'Enter' && sendAnswer()}
                    autoFocus
                  />
                  <Button
                    onClick={sendAnswer}
                    disabled={!myAnswer.trim()}
                    className="w-full rounded-2xl h-12 text-base font-bold gap-2"
                  >
                    <Send className="w-4 h-4" />
                    回答を送る
                  </Button>
                </div>
              </div>
            )}

            {/* 回答送信済み・結果待ち */}
            {phase === 'waiting-result' && (
              <div className="text-center py-12 animate-fade-in-up">
                <Clock className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
                <p className="text-xl font-bold mb-2">結果を待っています…</p>
                <p className="text-muted-foreground text-sm">相手が確認しています</p>
              </div>
            )}

            {/* 結果表示（join） */}
            {phase === 'result' && (
              <div className="space-y-4 animate-scale-in">
                <div className={`rounded-3xl p-8 text-center ${result ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                  <div className="text-6xl mb-3">{result ? '🎉' : '😅'}</div>
                  <p className={`text-2xl font-bold ${result ? 'text-green-700' : 'text-red-600'}`}>
                    {result ? '正解！！' : '不正解…'}
                  </p>
                  {currentQuestion && (
                    <p className="text-sm text-muted-foreground mt-2">正解：{currentQuestion.answer}</p>
                  )}
                </div>
                <Button onClick={() => setPhase('idle')} className="w-full rounded-2xl h-12 font-bold">
                  次の問題を待つ
                </Button>
              </div>
            )}
          </>
        )}

        {/* 退出ボタン */}
        <div className="pt-2">
          {exitLocked ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
              <p className="text-amber-700 font-medium text-sm">📝 まず回答を送ってから退出できます</p>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={exitRoom}
              className="w-full rounded-2xl h-12 font-bold text-muted-foreground"
            >
              部屋を退出する
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
