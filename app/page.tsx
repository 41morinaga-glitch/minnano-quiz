'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getFolders, saveFolder, deleteFolder, generateId } from '@/lib/storage'
import { Folder } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Settings, Plus, Trash2, FolderOpen, Users } from 'lucide-react'

const EMOJIS = ['📚', '🎯', '🌟', '🦁', '🌈', '🍕', '🎮', '🔬', '🎵', '🏆', '🌍', '🚀']

export default function HomePage() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Folder | null>(null)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📚')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    setFolders(getFolders())
  }, [])

  function openCreate() {
    setEditTarget(null)
    setName('')
    setEmoji('📚')
    setOpen(true)
  }

  function openEdit(folder: Folder) {
    setEditTarget(folder)
    setName(folder.name)
    setEmoji(folder.emoji)
    setOpen(true)
  }

  function handleSave() {
    if (!name.trim()) return
    const folder: Folder = {
      id: editTarget?.id ?? generateId(),
      name: name.trim(),
      emoji,
      createdAt: editTarget?.createdAt ?? new Date().toISOString(),
    }
    saveFolder(folder)
    setFolders(getFolders())
    setOpen(false)
  }

  function handleDelete(id: string) {
    deleteFolder(id)
    setFolders(getFolders())
    setDeleteConfirm(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">みんなのクイズ</h1>
            <p className="text-sm text-muted-foreground mt-0.5">問題を作って、みんなで楽しもう！</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/room">
              <Button variant="ghost" size="icon" className="rounded-full" title="親子で遊ぶ">
                <Users className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="rounded-full" title="設定">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {folders.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="text-6xl mb-4">📂</div>
            <p className="text-muted-foreground text-lg mb-2">まだフォルダがありません</p>
            <p className="text-muted-foreground text-sm mb-6">フォルダを作って問題を追加しよう！</p>
            <Button onClick={openCreate} className="rounded-full px-6">
              <Plus className="w-4 h-4 mr-2" />
              フォルダを作る
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {folders.map((folder, i) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                index={i}
                onEdit={() => openEdit(folder)}
                onDelete={() => setDeleteConfirm(folder.id)}
              />
            ))}
          </div>
        )}

        {folders.length > 0 && (
          <div className="fixed bottom-6 right-6">
            <Button
              onClick={openCreate}
              size="lg"
              className="rounded-full w-14 h-14 shadow-lg"
              title="フォルダを追加"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        )}
      </main>

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'フォルダを編集' : '新しいフォルダ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">アイコン</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`text-2xl p-1.5 rounded-lg transition-all ${
                      emoji === e
                        ? 'bg-primary/15 ring-2 ring-primary scale-110'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">フォルダ名</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例：理科クイズ、家族で挑戦！"
                className="rounded-xl"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                autoFocus
              />
            </div>
            <Button onClick={handleSave} disabled={!name.trim()} className="w-full rounded-xl">
              {editTarget ? '保存する' : '作成する'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>フォルダを削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            フォルダ内の問題もすべて削除されます。この操作は取り消せません。
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl">
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
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

function FolderCard({
  folder,
  index,
  onEdit,
  onDelete,
}: {
  folder: Folder
  index: number
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="group relative bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <Link href={`/folders/${folder.id}`} className="block">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{folder.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg text-foreground truncate">{folder.name}</p>
            <div className="flex items-center gap-1 text-muted-foreground text-sm mt-0.5">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>タップして開く</span>
            </div>
          </div>
        </div>
      </Link>

      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.preventDefault(); onEdit() }}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="編集"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={e => { e.preventDefault(); onDelete() }}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="削除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
