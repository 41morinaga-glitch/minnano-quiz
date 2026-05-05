import { NextRequest, NextResponse } from 'next/server'

type RoomEvent = {
  type: string
  payload: unknown
}

// In-memory rooms: code → array of SSE response controllers
const rooms = new Map<string, Set<ReadableStreamDefaultController>>()

function getRoomOrCreate(code: string): Set<ReadableStreamDefaultController> {
  if (!rooms.has(code)) rooms.set(code, new Set())
  return rooms.get(code)!
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl
      getRoomOrCreate(code).add(controller)
      // Send initial connected event
      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', payload: { code } })}\n\n`))
    },
    cancel() {
      rooms.get(code)?.delete(controller)
      if (rooms.get(code)?.size === 0) rooms.delete(code)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function POST(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  const event: RoomEvent = await req.json()
  const clients = rooms.get(code)

  if (!clients || clients.size === 0) {
    return NextResponse.json({ error: 'room not found or empty' }, { status: 404 })
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(`data: ${JSON.stringify(event)}\n\n`)

  clients.forEach(ctrl => {
    try { ctrl.enqueue(data) } catch { /* client disconnected */ }
  })

  return NextResponse.json({ ok: true, recipients: clients.size })
}
