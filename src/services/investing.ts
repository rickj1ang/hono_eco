export async function fetchCalendarHtml(params: { fromDate: string; toDate: string }) {
  const { fromDate, toDate } = params

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
      headers: apiHeaders as Record<string, string>,
      body: formData.toString()
    })
    if (!pageResp.ok) break

    const pageData = (await pageResp.json()) as { data?: string; rows_num?: number }
    const html = pageData && pageData.data ? pageData.data : ''
    if (!html) break

    combinedHtml += html

    const idMatches = [...html.matchAll(/eventRowId_(\d+)/g)]
    const lastMatch = idMatches.length ? idMatches[idMatches.length - 1] : null
    const pageLastId: string | null = lastMatch?.[1] ?? null

    if (page === 0) {
      lastSeenId = pageLastId
    } else {
      if (!pageLastId || pageLastId === lastSeenId) break
      lastSeenId = pageLastId
    }

    if (typeof pageData.rows_num !== 'undefined' && Number(pageData.rows_num) === 0) break
  }

  return combinedHtml
}


