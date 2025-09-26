import { Hono } from 'hono'
import type { Context } from 'hono'
import { health } from './routes/health'
import { calendar } from './routes/calendar'
import { hkpost } from './routes/hkpost'

type EconomicEvent = {
  id: string
  timestamp: number
  event: string
  actual: string
  forecast: string
  previous: string
}

function cleanHtmlLight(input: string | undefined | null): string {
  if (!input) return ''
  return input
    .replace(/\u00A0|&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTags(html: string): string {
  return cleanHtmlLight(html.replace(/<[^>]+>/g, ' '))
}

function matchGroup(source: string, regex: RegExp, group = 1): string | null {
  const m = source.match(regex)
  return m && m[group] ? m[group] : null
}

function parseEconomicCalendar(html: string): EconomicEvent[] {
  const events: EconomicEvent[] = []
  const rows = html.split('</tr>')
  let currentDate = ''

  for (const row of rows) {
    if (row.includes('theDay')) {
      const dateVal = matchGroup(row, /id=\"theDay(\d+)\"/)
      if (dateVal) currentDate = dateVal
      continue
    }

    if (row.includes('eventRowId')) {
      const event: EconomicEvent = {
        id: '',
        timestamp: 0,
        event: '',
        actual: '',
        forecast: '',
        previous: ''
      }

      const idVal = matchGroup(row, /id=\"eventRowId_(\d+)\"/)
      if (idVal) event.id = idVal

      const isoRaw = matchGroup(row, /data-event-datetime=\"([^\"]+)\"/)
      if (isoRaw) {
        const iso = isoRaw.replace(/\//g, '-') + ' UTC'
        const ms = Date.parse(iso)
        if (!Number.isNaN(ms)) {
          event.timestamp = Math.floor(ms / 1000)
        }
      } else {
        event.timestamp = currentDate ? Number(currentDate) : 0
      }

      const eventTd = matchGroup(row, /<td[^>]*class=\"[^\"]*event[^\"]*\"[^>]*>([\s\S]*?)<\/td>/)
      if (eventTd) event.event = stripTags(eventTd)

      const actualHtml = matchGroup(row, /<td[^>]*id=\"eventActual_[^\"]*\"[^>]*>([\s\S]*?)<\/td>/)
      if (actualHtml) event.actual = cleanHtmlLight(stripTags(actualHtml))

      const forecastHtml = matchGroup(row, /<td[^>]*id=\"eventForecast_[^\"]*\"[^>]*>([\s\S]*?)<\/td>/)
      if (forecastHtml) event.forecast = cleanHtmlLight(stripTags(forecastHtml))

      const previousHtml = matchGroup(row, /<td[^>]*id=\"eventPrevious_[^\"]*\"[^>]*>([\s\S]*?)<\/td>/)
      if (previousHtml) event.previous = cleanHtmlLight(stripTags(previousHtml))

      events.push(event)
    }
  }

  return events
}

const app = new Hono()

app.route('/health', health)
app.route('/economic-calendar', calendar)
app.route('/hk-post', hkpost)
app.get('/', (c: Context) => c.json({ 
  message: 'Economic Calendar & HK Post Address API', 
  endpoints: { 
    '/economic-calendar': 'GET', 
    '/health': 'GET',
    '/hk-post/search-buildings': 'GET',
    '/hk-post/ip-monitor': 'GET'
  } 
}))

export default app


