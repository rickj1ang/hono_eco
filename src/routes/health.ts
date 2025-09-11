import { Hono } from 'hono'
import type { Context } from 'hono'

export const health = new Hono()
  .get('/', (c: Context) => c.json({ status: 'OK', timestamp: new Date().toISOString() }))


