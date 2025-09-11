import { Hono } from 'hono'
import type { Context } from 'hono'
import { fetchCalendarHtml } from '../services/investing'
import { parseEconomicCalendar } from '../lib/parser'

export const calendar = new Hono()
  .get('/', async (c: Context) => {
    const fromDate = c.req.query('from_date')
    const toDate = c.req.query('to_date')

    if (!fromDate || !toDate) {
      return c.json({ error: 'Missing parameters: from_date and to_date are required' }, 400)
    }

    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
    if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
      return c.json({ error: 'Invalid date format. Use DD/MM/YYYY' }, 400)
    }

    try {
      const html = await fetchCalendarHtml({ fromDate, toDate })
      const events = parseEconomicCalendar(html)
      return c.json({ success: true, count: events.length, from_date: fromDate, to_date: toDate, timezone: 'GMT', events })
    } catch (error) {
      console.error('Error:', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  })


