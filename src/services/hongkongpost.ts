export interface BuildingSearchResult {
  loc_id: string
  sub_loc_no: string
  district: string
  building_desc: string
  display_text: string
}

export interface BuildingSearchParams {
  building: string
  lang: string
  sid: number
}

export async function searchBuildings(params: BuildingSearchParams): Promise<BuildingSearchResult[]> {
  const { building, lang, sid } = params
  
  const LANGUAGE_CODE = lang
  const IS_ENG = lang === 'en_US' ? 'true' : 'false'
  
  const BASE_URL = "https://webapp.hongkongpost.hk/correct_addressing/"
  const INDEX_PAGE_URL = `${BASE_URL}index.jsp?lang1=${LANGUAGE_CODE}`
  
  // Initialize session and headers (matching your Python code)
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
  }

  try {
    // First, get the index page (like your Python session.get(INDEX_PAGE_URL))
    await fetch(INDEX_PAGE_URL, { headers })

    // Then make the building search request
    const searchUrl = `${BASE_URL}GetBuildingAddr.jsp`
    const searchParams = new URLSearchParams({
      'building': building,
      'iseng': IS_ENG,
      'lang1': LANGUAGE_CODE,
      'n': '50',
      'a': '1',
      'currpage': '1',
      'sid': sid.toString()
    })

    const requestHeaders = {
      ...headers,
      'Referer': INDEX_PAGE_URL
    }

    const response = await fetch(`${searchUrl}?${searchParams}`, {
      headers: requestHeaders
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    return parseBuildingSearchResults(html)

  } catch (error) {
    console.error('Building search error:', error)
    throw new Error(`Failed to search buildings: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function parseBuildingSearchResults(html: string): BuildingSearchResult[] {
  const results: BuildingSearchResult[] = []
  
  // Parse HTML to find radio buttons with name="buildingaddr"
  // This matches your Python BeautifulSoup logic
  const radioButtonRegex = /<input[^>]*type="radio"[^>]*name="buildingaddr"[^>]*>/g
  const radioMatches = [...html.matchAll(radioButtonRegex)]
  
  for (const radioMatch of radioMatches) {
    const radioHtml = radioMatch[0]
    
    // Extract value attribute (loc_id|sub_loc_no)
    const valueMatch = radioHtml.match(/value="([^"]+)"/)
    if (!valueMatch || !valueMatch[1] || !valueMatch[1].includes('|')) {
      continue
    }
    
    const [loc_id, sub_loc_no] = valueMatch[1].split('|')
    if (!loc_id || !sub_loc_no) continue
    
    // Find the parent <tr> element and extract district and building description
    // This is a simplified approach - we'll extract from the surrounding HTML
    const radioIndex = radioMatch.index!
    const beforeRadio = html.substring(Math.max(0, radioIndex - 1000), radioIndex)
    const afterRadio = html.substring(radioIndex, radioIndex + 1000)
    
    // Look for the table row containing this radio button
    const trMatch = beforeRadio.match(/<tr[^>]*>([\s\S]*?)$/)
    if (trMatch) {
      const rowHtml = trMatch[1] + afterRadio
      
      // Extract district and building description from table cells
      const cellMatches = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
      if (cellMatches.length >= 4 && cellMatches[1] && cellMatches[3]) {
        const district = cleanHtmlText(cellMatches[1][1] || '')
        const buildingDesc = cleanHtmlText(cellMatches[3][1] || '')
        
        results.push({
          loc_id,
          sub_loc_no,
          district,
          building_desc: buildingDesc,
          display_text: `${district} - ${buildingDesc}`
        })
      }
    }
  }
  
  return results
}

function cleanHtmlText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
}
