import { Folder, Question, QuizResult, Settings } from './types'

const KEYS = {
  folders: 'quiz_folders',
  questions: 'quiz_questions',
  settings: 'quiz_settings',
  results: 'quiz_results',
}

const DEFAULT_SETTINGS: Settings = {
  playerName: '',
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

export function getFolders(): Folder[] {
  return load<Folder[]>(KEYS.folders, [])
}

export function saveFolder(folder: Folder): void {
  const folders = getFolders()
  const idx = folders.findIndex(f => f.id === folder.id)
  if (idx >= 0) folders[idx] = folder
  else folders.push(folder)
  save(KEYS.folders, folders)
}

export function deleteFolder(id: string): void {
  save(KEYS.folders, getFolders().filter(f => f.id !== id))
  save(KEYS.questions, getQuestions().filter(q => q.folderId !== id))
  save(KEYS.results, getResults().filter(r => r.folderId !== id))
}

export function getQuestions(folderId?: string): Question[] {
  const all = load<Question[]>(KEYS.questions, [])
  return folderId ? all.filter(q => q.folderId === folderId) : all
}

export function saveQuestion(question: Question): void {
  const questions = getQuestions()
  const idx = questions.findIndex(q => q.id === question.id)
  if (idx >= 0) questions[idx] = question
  else questions.push(question)
  save(KEYS.questions, questions)
}

export function deleteQuestion(id: string): void {
  save(KEYS.questions, getQuestions().filter(q => q.id !== id))
}

export function getSettings(): Settings {
  const stored = load<Partial<Settings>>(KEYS.settings, {})
  return { ...DEFAULT_SETTINGS, ...stored }
}

export function saveSettings(settings: Settings): void {
  save(KEYS.settings, settings)
}

export function getResults(folderId?: string): QuizResult[] {
  const all = load<QuizResult[]>(KEYS.results, [])
  return folderId ? all.filter(r => r.folderId === folderId) : all
}

export function saveResult(result: QuizResult): void {
  const results = getResults()
  results.push(result)
  save(KEYS.results, results)
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
