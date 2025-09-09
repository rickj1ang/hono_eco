import { Hono } from 'hono'

const app = new Hono()

// 解析HTML内容的辅助函数
function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
function parseEconomicCalendar(html) {
  const events = []
  const rows = html.split('</tr>')
  let currentDate = ''

  for (const row of rows) {
    // 检查是否是日期行
    if (row.includes('theDay')) {
      const dateMatch = row.match(/id="theDay(\d+)"/)
      if (dateMatch) {
        currentDate = dateMatch[1] // 保存时间戳作为日期
      }
      continue
    }

    // 检查是否是事件行
    if (row.includes('eventRowId')) {
      const event = {
        id: '',
        timestamp: '',
        event: '',
        actual: '',
        forecast: '',
        previous: ''
      }

      // 提取ID
      const idMatch = row.match(/id="eventRowId_(\d+)"/)
      if (idMatch) event.id = idMatch[1]

      // 提取时间
      // 优先使用 data-event-datetime（UTC，因 timeZone=0），转换为秒级时间戳
      const datetimeAttr = row.match(/data-event-datetime="([^"]+)"/)
      if (datetimeAttr) {
        const iso = datetimeAttr[1].replace(/\//g, '-') + ' UTC'
        const ms = Date.parse(iso)
        if (!Number.isNaN(ms)) {
          event.timestamp = Math.floor(ms / 1000)
        }
      } else {
        // 退化：当没有 data-event-datetime（如 All Day），使用当天 00:00 的时间戳
        if (currentDate) event.timestamp = Number(currentDate)
      }

      // 不再返回或解析 currency

      // 提取事件名称（去除内部标签）
      const eventTdMatch = row.match(/<td[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/td>/)
      if (eventTdMatch) event.event = stripTags(eventTdMatch[1])

      // 提取实际值
      const actualMatch = row.match(/<td[^>]*id="eventActual_[^"]*"[^>]*>([^<]*)<\/td>/)
      if (actualMatch) event.actual = actualMatch[1].trim()

      // 提取预测值
      const forecastMatch = row.match(/<td[^>]*id="eventForecast_[^"]*"[^>]*>([^<]*)<\/td>/)
      if (forecastMatch) event.forecast = forecastMatch[1].trim()

      // 提取前值
      const previousMatch = row.match(/<td[^>]*id="eventPrevious_[^"]*"[^>]*>([^<]*)<\/td>/)
      if (previousMatch) event.previous = previousMatch[1].trim()

      // 不基于 currency 过滤，直接收集
      events.push(event)
    }
  }

  return events
}

// 经济日历API路由
app.get('/economic-calendar', async (c) => {
  try {
    // 获取查询参数
    const fromDate = c.req.query('from_date')
    const toDate = c.req.query('to_date')
    
    if (!fromDate || !toDate) {
      return c.json({ error: 'Missing parameters: from_date and to_date are required' }, 400)
    }

    // 验证日期格式 (简单验证)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
    if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
      return c.json({ error: 'Invalid date format. Use DD/MM/YYYY' }, 400)
    }

    // 转换日期格式
    const [fromDay, fromMonth, fromYear] = fromDate.split('/')
    const [toDay, toMonth, toYear] = toDate.split('/')
    const dateFrom = `${fromYear}-${fromMonth}-${fromDay}`
    const dateTo = `${toYear}-${toMonth}-${toDay}`

    // 先获取主页面建立会话
    const mainUrl = 'https://www.investing.com/economic-calendar/'
    const mainHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    }
    const session = await fetch(mainUrl, { headers: mainHeaders })

    // 获取经济日历数据
    const apiUrl = 'https://www.investing.com/economic-calendar/Service/getCalendarFilteredData'
    const formData = new URLSearchParams()
    formData.append('country[]', '5') // 美国
    formData.append('importance[]', '3') // 高重要性
    formData.append('timeZone', '0') // GMT时区
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
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: apiHeaders,
      body: formData.toString()
    })

    if (!response.ok) {
      return c.json({ error: 'Failed to fetch economic calendar data' }, 500)
    }

    const data = await response.json()
    
    if (!data.data) {
      return c.json({ error: 'No data returned from API' }, 500)
    }

    // 解析HTML数据
    const events = parseEconomicCalendar(data.data)
    
    return c.json({
      success: true,
      count: events.length,
      from_date: fromDate,
      to_date: toDate,
      timezone: 'GMT',
      events: events
    })

  } catch (error) {
    console.error('Error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 健康检查路由
app.get('/health', (c) => {
  return c.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// 根路由
app.get('/', (c) => {
  return c.json({
    message: 'Economic Calendar API',
    endpoints: {
      '/economic-calendar': 'GET - Get economic calendar data. Parameters: from_date, to_date (DD/MM/YYYY)',
      '/health': 'GET - Health check'
    }
  })
})

export default app
