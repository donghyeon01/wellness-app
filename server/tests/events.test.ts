import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import http from 'node:http'
import type { Express } from 'express'
import { createApp } from '@/app'
import { prisma } from '@/lib/prisma'
import { MemorySessionStore } from '@/sessions/memory'
import { TestClient, startServer } from './helpers'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

interface TestUser {
  id: string
  email: string
  password: string
  name: string
}

interface TestEvent {
  id: string
  userId: string
  title: string
  description: string | null
  start: Date
  end: Date
}

interface FindUniqueArgs {
  where: { id?: string; email?: string }
}

interface CreateUserArgs {
  data: { email: string; password: string; name: string }
}

interface EventWhere {
  userId?: string
  id?: string
  start?: { lt?: Date }
  end?: { gt?: Date }
}

interface FindManyArgs {
  where: EventWhere
}

interface FindFirstArgs {
  where: EventWhere
}

interface CreateEventArgs {
  data: {
    userId: string
    title: string
    description: string | null
    start: Date
    end: Date
  }
}

interface UpdateEventArgs {
  where: { id: string }
  data: Partial<Pick<TestEvent, 'title' | 'description' | 'start' | 'end'>>
}

interface DeleteEventArgs {
  where: { id: string }
}

interface EventsBody {
  events: TestEvent[]
}

interface EventBody {
  event: TestEvent
}

let app: Express
let server: http.Server
let port: number

const users: TestUser[] = []
const events: TestEvent[] = []

function setupPrisma() {
  users.length = 0
  events.length = 0

  ;(prisma.user.create as unknown as Mock).mockImplementation(async (args: CreateUserArgs) => {
    const id = `u${users.length + 1}`
    const user: TestUser = { id, ...args.data }
    users.push(user)
    return { id: user.id, email: user.email, name: user.name }
  })
  ;(prisma.user.findUnique as unknown as Mock).mockImplementation(
    async (args: FindUniqueArgs) => {
      const { where } = args
      if (where.id) return users.find((u) => u.id === where.id) ?? null
      if (where.email) return users.find((u) => u.email === where.email) ?? null
      return null
    },
  )

  ;(prisma.event.findMany as unknown as Mock).mockImplementation(
    async (args: FindManyArgs) => {
      const { where } = args
      return events
        .filter((e) => {
          if (where.userId && e.userId !== where.userId) return false
          // 겹침 조건: event.start < range.end AND event.end > range.start
          if (where.end?.gt && !(e.end > where.end.gt)) return false
          if (where.start?.lt && !(e.start < where.start.lt)) return false
          return true
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime())
    },
  )
  ;(prisma.event.findFirst as unknown as Mock).mockImplementation(
    async (args: FindFirstArgs) => {
      const { where } = args
      return (
        events.find(
          (e) =>
            (where.id === undefined || e.id === where.id) &&
            (where.userId === undefined || e.userId === where.userId),
        ) ?? null
      )
    },
  )
  ;(prisma.event.findUnique as unknown as Mock).mockImplementation(
    async (args: FindUniqueArgs) => {
      return events.find((e) => e.id === args.where.id) ?? null
    },
  )
  ;(prisma.event.create as unknown as Mock).mockImplementation(
    async (args: CreateEventArgs) => {
      const event: TestEvent = { id: `e${events.length + 1}`, ...args.data }
      events.push(event)
      return event
    },
  )
  ;(prisma.event.update as unknown as Mock).mockImplementation(
    async (args: UpdateEventArgs) => {
      const event = events.find((e) => e.id === args.where.id)
      if (!event) throw new Error('not found')
      Object.assign(event, args.data)
      return event
    },
  )
  ;(prisma.event.delete as unknown as Mock).mockImplementation(
    async (args: DeleteEventArgs) => {
      const index = events.findIndex((e) => e.id === args.where.id)
      if (index < 0) throw new Error('not found')
      const [removed] = events.splice(index, 1)
      return removed
    },
  )
}

async function registerUser(client: TestClient, email = 'a@b.com'): Promise<void> {
  let res = await client.request('GET', '/api/auth/csrf-token')
  client.parseCookies(res)
  res = await client.request('POST', '/api/auth/register', {
    email,
    password: 'Password1',
    name: 'Alice',
  })
  client.parseCookies(res)
}

async function createEvent(
  client: TestClient,
  body: { title: string; start: string; end: string; description?: string },
): Promise<Response> {
  return client.request('POST', '/api/events', body)
}

beforeAll(async () => {
  app = createApp()
  const result = await startServer(app)
  server = result.server
  port = result.port
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  vi.clearAllMocks()
  ;(app.locals.sessionStore as MemorySessionStore).clear()
  setupPrisma()
})

describe('/api/events', () => {
  it('인증 없이 GET하면 401', async () => {
    const client = new TestClient(port)
    const res = await client.request('GET', '/api/events')
    expect(res.status).toBe(401)
  })

  it('인증 없이 POST하면 401', async () => {
    const client = new TestClient(port)
    const csrfRes = await client.request('GET', '/api/auth/csrf-token')
    client.parseCookies(csrfRes)
    const res = await createEvent(client, {
      title: '회의',
      start: '2026-09-10T10:00:00.000Z',
      end: '2026-09-10T11:00:00.000Z',
    })
    expect(res.status).toBe(401)
  })

  it('CSRF 토큰 없이 POST하면 403', async () => {
    const client = new TestClient(port)
    await registerUser(client)
    client.csrfToken = undefined
    const res = await client.request('POST', '/api/events', {
      title: '회의',
      start: '2026-09-10T10:00:00.000Z',
      end: '2026-09-10T11:00:00.000Z',
    })
    expect(res.status).toBe(403)
  })

  it('이벤트를 생성하면 201과 함께 본인 이벤트가 반환된다', async () => {
    const client = new TestClient(port)
    await registerUser(client)

    const res = await createEvent(client, {
      title: '팀 회의',
      description: '주간 싱크',
      start: '2026-09-10T10:00:00.000Z',
      end: '2026-09-10T11:00:00.000Z',
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as EventBody
    expect(body.event.title).toBe('팀 회의')
    expect(body.event.description).toBe('주간 싱크')
    expect(body.event.userId).toBe('u1')
  })

  it('start >= end이면 400', async () => {
    const client = new TestClient(port)
    await registerUser(client)

    const res = await createEvent(client, {
      title: '잘못된 일정',
      start: '2026-09-10T11:00:00.000Z',
      end: '2026-09-10T10:00:00.000Z',
    })
    expect(res.status).toBe(400)

    const equal = await createEvent(client, {
      title: '잘못된 일정',
      start: '2026-09-10T10:00:00.000Z',
      end: '2026-09-10T10:00:00.000Z',
    })
    expect(equal.status).toBe(400)
  })

  it('제목이나 날짜가 누락되면 400', async () => {
    const client = new TestClient(port)
    await registerUser(client)

    const noTitle = await client.request('POST', '/api/events', {
      start: '2026-09-10T10:00:00.000Z',
      end: '2026-09-10T11:00:00.000Z',
    })
    expect(noTitle.status).toBe(400)

    const badDate = await client.request('POST', '/api/events', {
      title: '회의',
      start: 'not-a-date',
      end: '2026-09-10T11:00:00.000Z',
    })
    expect(badDate.status).toBe(400)
  })

  it('GET은 본인 이벤트만 반환하고 start/end 쿼리로 겹치는 일정만 조회한다', async () => {
    const client = new TestClient(port)
    await registerUser(client)

    await createEvent(client, {
      title: '9월 일정',
      start: '2026-09-10T10:00:00.000Z',
      end: '2026-09-10T11:00:00.000Z',
    })
    await createEvent(client, {
      title: '10월 일정',
      start: '2026-10-05T10:00:00.000Z',
      end: '2026-10-05T11:00:00.000Z',
    })
    // 월을 걸치는 일정은 양쪽 범위 조회에 모두 포함되어야 한다
    await createEvent(client, {
      title: '월 경계 일정',
      start: '2026-09-30T23:00:00.000Z',
      end: '2026-10-01T01:00:00.000Z',
    })

    const other = new TestClient(port)
    await registerUser(other, 'b@b.com')
    await createEvent(other, {
      title: '타인 일정',
      start: '2026-09-12T10:00:00.000Z',
      end: '2026-09-12T11:00:00.000Z',
    })

    const all = await client.request('GET', '/api/events')
    const allBody = (await all.json()) as EventsBody
    expect(allBody.events.map((e) => e.title).sort()).toEqual([
      '10월 일정',
      '9월 일정',
      '월 경계 일정',
    ])

    const sept = await client.request(
      'GET',
      '/api/events?start=2026-09-01T00:00:00.000Z&end=2026-10-01T00:00:00.000Z',
    )
    const septBody = (await sept.json()) as EventsBody
    expect(septBody.events.map((e) => e.title)).toEqual(['9월 일정', '월 경계 일정'])

    const invalid = await client.request('GET', '/api/events?start=garbage')
    expect(invalid.status).toBe(400)
  })

  it('PUT으로 본인 이벤트를 수정한다', async () => {
    const client = new TestClient(port)
    await registerUser(client)

    const created = await createEvent(client, {
      title: '원래 제목',
      start: '2026-09-10T10:00:00.000Z',
      end: '2026-09-10T11:00:00.000Z',
    })
    const { event } = (await created.json()) as EventBody

    // 드래그 앤 드롭/리사이즈는 start/end만 부분 수정한다
    const res = await client.request('PUT', `/api/events/${event.id}`, {
      start: '2026-09-11T10:00:00.000Z',
      end: '2026-09-11T12:00:00.000Z',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as EventBody
    expect(body.event.title).toBe('원래 제목')
    expect(new Date(body.event.start).toISOString()).toBe('2026-09-11T10:00:00.000Z')
    expect(new Date(body.event.end).toISOString()).toBe('2026-09-11T12:00:00.000Z')
  })

  it('PUT 결과가 start >= end가 되면 400', async () => {
    const client = new TestClient(port)
    await registerUser(client)

    const created = await createEvent(client, {
      title: '회의',
      start: '2026-09-10T10:00:00.000Z',
      end: '2026-09-10T11:00:00.000Z',
    })
    const { event } = (await created.json()) as EventBody

    const res = await client.request('PUT', `/api/events/${event.id}`, {
      end: '2026-09-10T09:00:00.000Z',
    })
    expect(res.status).toBe(400)
  })

  it('타인 이벤트를 PUT/DELETE하면 403', async () => {
    const owner = new TestClient(port)
    await registerUser(owner)
    const created = await createEvent(owner, {
      title: '내 일정',
      start: '2026-09-10T10:00:00.000Z',
      end: '2026-09-10T11:00:00.000Z',
    })
    const { event } = (await created.json()) as EventBody

    const other = new TestClient(port)
    await registerUser(other, 'b@b.com')

    const putRes = await other.request('PUT', `/api/events/${event.id}`, {
      title: '탈취',
    })
    expect(putRes.status).toBe(403)

    const delRes = await other.request('DELETE', `/api/events/${event.id}`)
    expect(delRes.status).toBe(403)

    // 실제로 소유자의 이벤트는 변경되지 않아야 한다
    const ownerList = await owner.request('GET', '/api/events')
    const ownerBody = (await ownerList.json()) as EventsBody
    expect(ownerBody.events).toHaveLength(1)
    expect(ownerBody.events[0].title).toBe('내 일정')
  })

  it('없는 이벤트를 PUT하면 404', async () => {
    const client = new TestClient(port)
    await registerUser(client)

    const res = await client.request('PUT', '/api/events/nonexistent-id', {
      title: '수정',
    })
    expect(res.status).toBe(404)
  })

  it('DELETE로 본인 이벤트를 삭제하고, 없는 이벤트는 404', async () => {
    const client = new TestClient(port)
    await registerUser(client)

    const created = await createEvent(client, {
      title: '삭제 대상',
      start: '2026-09-10T10:00:00.000Z',
      end: '2026-09-10T11:00:00.000Z',
    })
    const { event } = (await created.json()) as EventBody

    const res = await client.request('DELETE', `/api/events/${event.id}`)
    expect(res.status).toBe(200)

    const list = await client.request('GET', '/api/events')
    const listBody = (await list.json()) as EventsBody
    expect(listBody.events).toHaveLength(0)

    const again = await client.request('DELETE', `/api/events/${event.id}`)
    expect(again.status).toBe(404)
  })
})
