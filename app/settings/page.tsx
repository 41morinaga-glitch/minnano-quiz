'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSettings, saveSettings } from '@/lib/storage'
import { Settings } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, User } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ playerName: '' })
  const [nameSaved, setNameSaved] = useState(false)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  function saveName() {
    saveSettings(settings)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">設定</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">プレイヤー</h2>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">プレイヤー名</p>
                <p className="text-sm text-muted-foreground">履歴に表示される名前です</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={settings.playerName}
                onChange={e => setSettings(s => ({ ...s, playerName: e.target.value }))}
                placeholder="例：パパ、ママ、たろう"
                className="rounded-xl flex-1"
                onKeyDown={e => e.key === 'Enter' && saveName()}
                maxLength={20}
              />
              <Button onClick={saveName} className="rounded-xl shrink-0">
                {nameSaved ? '✓ 保存済み' : '保存'}
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-2xl p-4 text-sm text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground">データについて</p>
          <p>クイズのデータはこの端末にのみ保存されます。サーバーには送信されません。</p>
          <p>ブラウザのデータを削除するとクイズが消えるのでご注意ください。</p>
        </div>
      </main>
    </div>
  )
}
