export type AnswerType = 'free' | 'choice2' | 'choice4'

export type Question = {
  id: string
  folderId: string
  text: string
  type: AnswerType
  choices: string[]
  answer: string
  explanation: string
  createdAt: string
}

export type Folder = {
  id: string
  name: string
  emoji: string
  createdAt: string
}

export type Settings = {
  playerName: string
}

export type QuizResult = {
  id: string
  folderId: string
  playerName: string
  score: number
  total: number
  date: string
}

export type Room = {
  code: string
  questions: Question[]
  currentIndex: number
  answer: string | null
  phase: 'waiting' | 'question' | 'answered' | 'reveal'
}
