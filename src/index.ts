import { Hono } from 'hono'
import type { Context } from 'hono'

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

app.get('/economic-calendar', async (c: Context) => {
  try {
    const fromDate = c.req.query('from_date')
    const toDate = c.req.query('to_date')

    if (!fromDate || !toDate) {
      return c.json({ error: 'Missing parameters: from_date and to_date are required' }, 400)
    }

    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
    if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
      return c.json({ error: 'Invalid date format. Use DD/MM/YYYY' }, 400)
    }

    const [fromDay, fromMonth, fromYear] = fromDate.split('/')
    const [toDay, toMonth, toYear] = toDate.split('/')
    const dateFrom = `${fromYear}-${fromMonth}-${fromDay}`
    const dateTo = `${toYear}-${toMonth}-${toDay}`

    const mainUrl = 'https://www.investing.com/economic-calendar/'
    const mainHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    }
    const session = await fetch(mainUrl, { headers: mainHeaders })

    const apiUrl = 'https://www.investing.com/economic-calendar/Service/getCalendarFilteredData'
    const formData = new URLSearchParams()
    formData.append('country[]', '5')
    formData.append('importance[]', '3')
    formData.append('timeZone', '0')
    formData.append('timeFilter', 'timeRemain')
    formData.append('currentTab', 'custom')
    formData.append('submitFilters', '1')
    formData.append('limit_from', '0')
    formData.append('dateFrom', dateFrom)
    formData.append('dateTo', dateTo)

    const apiHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Referer': 'https://www.investing.com/economic-calendar/',
      'Origin': 'https://www.investing.com',
      'Cookie': session.headers.get('set-cookie') || ''
    }

    let combinedHtml = ''
    let lastSeenId: string | null = null
    const maxPages = 200

    for (let page = 0; page < maxPages; page++) {
      formData.set('limit_from', String(page))

      const pageResp = await fetch(apiUrl, {
        method: 'POST',
        headers: apiHeaders,
        body: formData.toString()
      })

      if (!pageResp.ok) break

      const pageData = (await pageResp.json()) as { data?: string; rows_num?: number }
      const html = pageData && pageData.data ? pageData.data : ''
      if (!html) break

      combinedHtml += html

      const idMatches = [...html.matchAll(/eventRowId_(\d+)/g)]
      const lastMatch = idMatches.length > 0 ? idMatches[idMatches.length - 1] : null
      const pageLastId: string | null = lastMatch?.[1] ?? null

      if (page === 0) {
        lastSeenId = pageLastId
      } else {
        if (!pageLastId || pageLastId === lastSeenId) break
        lastSeenId = pageLastId
      }

      if (typeof pageData.rows_num !== 'undefined' && Number(pageData.rows_num) === 0) break
    }

    const events = parseEconomicCalendar(combinedHtml)

    return c.json({
      success: true,
      count: events.length,
      from_date: fromDate,
      to_date: toDate,
      timezone: 'GMT',
      events
    })
  } catch (error) {
    console.error('Error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/health', (c: Context) => {
  return c.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.get('/', (c: Context) => {
  return c.json({
    message: 'Economic Calendar API',
    endpoints: {
      '/economic-calendar': 'GET - Get economic calendar data. Parameters: from_date, to_date (DD/MM/YYYY)',
      '/health': 'GET - Health check'
    }
  })
})

export default app


