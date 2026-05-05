import { NextRequest, NextResponse } from 'next/server'

const rooms = new Map<string, Set<ReadableStreamDefaultController>>()

function getRoomOrCreate(code: string) {
  if (!rooms.has(code)) rooms.set(code, new Set())
  return rooms.get(code)!
}

function broadcast(code: string, event: unknown) {
  const encoder = new TextEncoder()
  const data = encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
  rooms.get(code)?.forEach(ctrl => {
    try { ctrl.enqueue(data) } catch { /* disconnected */ }
  })
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl
      const room = getRoomOrCreate(code)
      room.add(controller)
      const count = room.size

      // Notify this client of connection
      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', payload: { code, count } })}\n\n`))

      // Notify everyone that a new member joined
      if (count > 1) {
        broadcast(code, { type: 'joined', payload: { count } })
      }
    },
    cancel() {
      rooms.get(code)?.delete(controller)
      const count = rooms.get(code)?.size ?? 0
      if (count === 0) {
        rooms.delete(code)
      } else {
        broadcast(code, { type: 'left', payload: { count } })
      }
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

  const event = await req.json()
  const clients = rooms.get(code)
  if (!clients || clients.size === 0) {
    return NextResponse.json({ error: 'room not found' }, { status: 404 })
  }

  broadcast(code, event)
  return NextResponse.json({ ok: true, recipients: clients.size })
}
