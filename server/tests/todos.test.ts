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
    todo: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
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

interface TestTodo {
  id: string
  userId: string
  title: string
  description: string | null
  priority: number
  dueDate: Date | null
  completed: boolean
  createdAt: Date
  updatedAt: Date
}

let app: Express
let server: http.Server
let port: number
let todos: TestTodo[] = []
let users: TestUser[] = []

function setupPrisma() {
  users = []
  todos = []

  ;(prisma.user.create as unknown as Mock).mockImplementation(async (args: { data: TestUser }) => {
    const id = `u${users.length + 1}`
    const user: TestUser = { ...args.data, id }
    users.push(user)
    return { id: user.id, email: user.email, name: user.name }
  })

  ;(prisma.user.findUnique as unknown as Mock).mockImplementation(async (args: { where: { id?: string; email?: string } }) => {
    if (args.where.id) return users.find((u) => u.id === args.where.id) ?? null
    if (args.where.email) return users.find((u) => u.email === args.where.email) ?? null
    return null
  })

  ;(prisma.todo.create as unknown as Mock).mockImplementation(async (args: { data: TestTodo }) => {
    const id = `t${todos.length + 1}`
    const todo: TestTodo = {
      ...args.data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    todos.push(todo)
    return todo
  })

  ;(prisma.todo.findMany as unknown as Mock).mockImplementation(async (args: { where: { userId?: string; completed?: boolean; priority?: number }; orderBy?: unknown }) => {
    let result = [...todos]
    if (args.where?.userId) result = result.filter((t) => t.userId === args.where.userId)
    if (args.where?.completed !== undefined) result = result.filter((t) => t.completed === args.where.completed)
    if (args.where?.priority !== undefined) result = result.filter((t) => t.priority === args.where.priority)

    // 정렬: completed asc, dueDate asc (nulls last)
    result.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (a.dueDate === null && b.dueDate === null) return 0
      if (a.dueDate === null) return 1
      if (b.dueDate === null) return -1
      return a.dueDate.getTime() - b.dueDate.getTime()
    })

    return result
  })

  ;(prisma.todo.findFirst as unknown as Mock).mockImplementation(async (args: { where: { id?: string; userId?: string } }) => {
    return todos.find((t) => t.id === args.where.id && t.userId === args.where.userId) ?? null
  })

  ;(prisma.todo.update as unknown as Mock).mockImplementation(async (args: { where: { id: string }; data: Partial<TestTodo> }) => {
    const index = todos.findIndex((t) => t.id === args.where.id)
    if (index === -1) return null
    todos[index] = { ...todos[index], ...args.data, updatedAt: new Date() }
    return todos[index]
  })

  ;(prisma.todo.delete as unknown as Mock).mockImplementation(async (args: { where: { id: string } }) => {
    const index = todos.findIndex((t) => t.id === args.where.id)
    if (index === -1) return null
    const [todo] = todos.splice(index, 1)
    return todo
  })
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

async function registerAndLogin(client: TestClient) {
  const csrfRes = await client.request('GET', '/api/auth/csrf-token')
  client.parseCookies(csrfRes)

  const res = await client.request('POST', '/api/auth/register', {
    email: 'a@b.com',
    password: 'Password1',
    name: 'Alice',
  })
  client.parseCookies(res)
  expect(res.status).toBe(201)
  return users[0]
}

describe('/api/todos', () => {
  it('인증 없이 GET /api/todos는 401', async () => {
    const client = new TestClient(port)
    const res = await client.request('GET', '/api/todos')
    expect(res.status).toBe(401)
  })

  it('POST /api/todos로 TODO를 생성하고 목록에 정렬되어 노출된다', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    const res = await client.request('POST', '/api/todos', {
      title: '두 번째 TODO',
      priority: 2,
      dueDate: '2024-12-31T00:00:00.000Z',
    })
    expect(res.status).toBe(201)

    const res2 = await client.request('POST', '/api/todos', {
      title: '첫 번째 TODO',
      priority: 1,
      dueDate: '2024-12-01T00:00:00.000Z',
    })
    expect(res2.status).toBe(201)

    const listRes = await client.request('GET', '/api/todos')
    expect(listRes.status).toBe(200)
    const body = (await listRes.json()) as { todos: TestTodo[] }
    expect(body.todos).toHaveLength(2)
    expect(body.todos[0].title).toBe('첫 번째 TODO')
    expect(body.todos[1].title).toBe('두 번째 TODO')
  })

  it('GET /api/todos?completed=false로 미완료 항목만 필터링한다', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    const active = await client.request('POST', '/api/todos', { title: '미완료 TODO' })
    const activeBody = (await active.json()) as { todo: TestTodo }
    await client.request('POST', '/api/todos', { title: '완료 TODO', dueDate: '2024-11-01T00:00:00.000Z' })
    // completed 는 PUT으로만 변경 가능
    await client.request('PUT', `/api/todos/${activeBody.todo.id}`, { completed: true })

    const listRes = await client.request('GET', '/api/todos?completed=false')
    const body = (await listRes.json()) as { todos: TestTodo[] }
    expect(body.todos).toHaveLength(1)
    expect(body.todos[0].completed).toBe(false)
  })

  it('GET /api/todos?priority=2로 우선순위 필터링한다', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    await client.request('POST', '/api/todos', { title: '높음', priority: 2 })
    await client.request('POST', '/api/todos', { title: '낮음', priority: 0 })

    const listRes = await client.request('GET', '/api/todos?priority=2')
    const body = (await listRes.json()) as { todos: TestTodo[] }
    expect(body.todos).toHaveLength(1)
    expect(body.todos[0].priority).toBe(2)
  })

  it('priority가 3이면 400', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    const res = await client.request('POST', '/api/todos', { title: 'TODO', priority: 3 })
    expect(res.status).toBe(400)
  })

  it('dueDate 없이 생성 가능하다', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    const res = await client.request('POST', '/api/todos', { title: '마감일 없음' })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { todo: TestTodo }
    expect(body.todo.dueDate).toBeNull()
    expect(body.todo.priority).toBe(0)
  })

  it('GET /api/todos/:id로 단건 조회', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    const created = await client.request('POST', '/api/todos', { title: '단건' })
    const createdBody = (await created.json()) as { todo: TestTodo }

    const res = await client.request('GET', `/api/todos/${createdBody.todo.id}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { todo: TestTodo }
    expect(body.todo.title).toBe('단건')
  })

  it('PUT /api/todos/:id로 TODO를 수정한다', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    const created = await client.request('POST', '/api/todos', { title: '수정 전' })
    const createdBody = (await created.json()) as { todo: TestTodo }

    const res = await client.request('PUT', `/api/todos/${createdBody.todo.id}`, {
      title: '수정 후',
      completed: true,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { todo: TestTodo }
    expect(body.todo.title).toBe('수정 후')
    expect(body.todo.completed).toBe(true)
  })

  it('DELETE /api/todos/:id로 TODO를 삭제한다', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    const created = await client.request('POST', '/api/todos', { title: '삭제 대상' })
    const createdBody = (await created.json()) as { todo: TestTodo }

    const res = await client.request('DELETE', `/api/todos/${createdBody.todo.id}`)
    expect(res.status).toBe(200)

    const listRes = await client.request('GET', '/api/todos')
    const body = (await listRes.json()) as { todos: TestTodo[] }
    expect(body.todos).toHaveLength(0)
  })

  it('다른 사용자의 TODO는 조회/수정/삭제할 수 없다', async () => {
    // Alice 계정으로 TODO 생성
    const alice = new TestClient(port)
    await registerAndLogin(alice)

    const created = await alice.request('POST', '/api/todos', { title: 'Alice TODO' })
    const createdBody = (await created.json()) as { todo: TestTodo }

    // Bob 계정으로 같은 TODO 접근 시도
    const bob = new TestClient(port)
    const csrfRes = await bob.request('GET', '/api/auth/csrf-token')
    bob.parseCookies(csrfRes)

    const bobReg = await bob.request('POST', '/api/auth/register', {
      email: 'bob@example.com',
      password: 'Password1',
      name: 'Bob',
    })
    bob.parseCookies(bobReg)
    expect(bobReg.status).toBe(201)

    const getRes = await bob.request('GET', `/api/todos/${createdBody.todo.id}`)
    expect(getRes.status).toBe(404)

    const putRes = await bob.request('PUT', `/api/todos/${createdBody.todo.id}`, { title: 'Bob이 바꿈' })
    expect(putRes.status).toBe(404)

    const delRes = await bob.request('DELETE', `/api/todos/${createdBody.todo.id}`)
    expect(delRes.status).toBe(404)

    // Alice는 여전히 정상 조회 가능
    const aliceGet = await alice.request('GET', `/api/todos/${createdBody.todo.id}`)
    expect(aliceGet.status).toBe(200)
  })

  it('완료 항목은 목록 하단에 위치한다', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    await client.request('POST', '/api/todos', { title: '미완료', dueDate: '2024-12-01T00:00:00.000Z' })
    const earlier = await client.request('POST', '/api/todos', { title: '완료', dueDate: '2024-01-01T00:00:00.000Z' })
    const earlierBody = (await earlier.json()) as { todo: TestTodo }

    await client.request('PUT', `/api/todos/${earlierBody.todo.id}`, { completed: true })

    const listRes = await client.request('GET', '/api/todos')
    const body = (await listRes.json()) as { todos: TestTodo[] }
    expect(body.todos[0].completed).toBe(false)
    expect(body.todos[1].completed).toBe(true)
  })
})
