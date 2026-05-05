'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveQuestion, generateId } from '@/lib/storage'
import { Question, AnswerType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Minus } from 'lucide-react'

interface Props {
  folderId: string
  initial?: Question
}

const TYPES: { value: AnswerType; label: string; desc: string }[] = [
  { value: 'free', label: '記述式', desc: '自由に書き込む' },
  { value: 'choice2', label: '2択', desc: '選択肢から2つ' },
  { value: 'choice4', label: '4択', desc: '選択肢から4つ' },
]

export default function QuestionForm({ folderId, initial }: Props) {
  const router = useRouter()

  const [type, setType] = useState<AnswerType>(initial?.type ?? 'choice4')
  const [text, setText] = useState(initial?.text ?? '')
  const [choices, setChoices] = useState<string[]>(
    initial?.choices ?? ['', '', '', '']
  )
  const [answer, setAnswer] = useState(initial?.answer ?? '')
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleTypeChange(t: AnswerType) {
    setType(t)
    if (t === 'choice2') setChoices(prev => [prev[0] ?? '', prev[1] ?? ''])
    if (t === 'choice4') setChoices(prev => [prev[0] ?? '', prev[1] ?? '', prev[2] ?? '', prev[3] ?? ''])
    setAnswer('')
  }

  function updateChoice(i: number, val: string) {
    setChoices(prev => prev.map((c, idx) => idx === i ? val : c))
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!text.trim()) errs.text = '問題文を入力してください'
    if (type !== 'free') {
      const filled = choices.filter(c => c.trim())
      const needed = type === 'choice2' ? 2 : 4
      if (filled.length < needed) errs.choices = `選択肢を${needed}つ入力してください`
      if (!answer.trim()) errs.answer = '正解を選んでください'
    } else {
      if (!answer.trim()) errs.answer = '答えを入力してください'
    }
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const question: Question = {
      id: initial?.id ?? generateId(),
      folderId,
      text: text.trim(),
      type,
      choices: type === 'free' ? [] : choices.map(c => c.trim()),
      answer: answer.trim(),
      explanation: explanation.trim(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
    saveQuestion(question)
    router.push(`/folders/${folderId}`)
  }

  return (
    <div className="space-y-6">
      {/* Answer type selector */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-3 block">解答形式</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => handleTypeChange(t.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                type === t.value
                  ? 'border-primary bg-primary/8 text-primary'
                  : 'border-border hover:border-primary/30 hover:bg-muted/50'
              }`}
            >
              <div className="font-bold text-sm">{t.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Question text */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">問題文</label>
        <Textarea
          value={text}
          onChange={e => { setText(e.target.value); setErrors(p => ({ ...p, text: '' })) }}
          placeholder="例：日本で一番高い山はなんでしょう？"
          className="rounded-xl resize-none min-h-[100px] text-base"
          rows={3}
        />
        {errors.text && <p className="text-destructive text-xs mt-1">{errors.text}</p>}
      </div>

      {/* Choices (for choice types) */}
      {type !== 'free' && (
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">選択肢</label>
          <div className="space-y-2">
            {choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => setAnswer(c.trim())}
                  className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-sm font-bold transition-all ${
                    answer === c.trim() && c.trim()
                      ? 'bg-primary text-primary-foreground scale-110'
                      : 'bg-muted text-muted-foreground hover:bg-primary/20'
                  }`}
                  title="正解に設定"
                >
                  {String.fromCharCode(65 + i)}
                </button>
                <Input
                  value={c}
                  onChange={e => { updateChoice(i, e.target.value); setErrors(p => ({ ...p, choices: '', answer: '' })) }}
                  placeholder={`選択肢 ${String.fromCharCode(65 + i)}`}
                  className="rounded-xl flex-1"
                />
              </div>
            ))}
          </div>
          {errors.choices && <p className="text-destructive text-xs mt-1">{errors.choices}</p>}
          {errors.answer && <p className="text-destructive text-xs mt-1">{errors.answer}</p>}
          {!errors.answer && answer && (
            <p className="text-primary text-xs mt-1 font-medium">✓ 正解：{answer}</p>
          )}
          <p className="text-muted-foreground text-xs mt-2">丸いボタンをタップして正解を選んでください</p>
        </div>
      )}

      {/* Free text answer */}
      {type === 'free' && (
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">答え</label>
          <Input
            value={answer}
            onChange={e => { setAnswer(e.target.value); setErrors(p => ({ ...p, answer: '' })) }}
            placeholder="例：富士山"
            className="rounded-xl"
          />
          {errors.answer && <p className="text-destructive text-xs mt-1">{errors.answer}</p>}
        </div>
      )}

      {/* Explanation */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          解説
          <span className="ml-2 text-xs font-normal">(任意)</span>
        </label>
        <Textarea
          value={explanation}
          onChange={e => setExplanation(e.target.value)}
          placeholder="答えの解説を書いてみよう（なくてもOK）"
          className="rounded-xl resize-none"
          rows={2}
        />
      </div>

      {/* Save button */}
      <Button onClick={handleSave} className="w-full rounded-xl h-12 text-base font-bold">
        {initial ? '保存する' : '問題を追加する'}
      </Button>
    </div>
  )
}
