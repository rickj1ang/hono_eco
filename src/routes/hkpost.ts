import { Hono } from 'hono'
import type { Context } from 'hono'
import { searchBuildings } from '../services/hongkongpost'

export const hkpost = new Hono()

hkpost.get('/search-buildings', async (c: Context) => {
  const query = c.req.query('query')
  const lang = c.req.query('lang') || 'en_US'

  // Validate required parameters
  if (!query) {
    return c.json({ error: 'Missing required parameter: query' }, 400)
  }

  // Validate language parameter
  if (!['en_US', 'zh_TW'].includes(lang)) {
    return c.json({ error: 'Invalid language. Use en_US or zh_TW' }, 400)
  }

  try {
    // Generate random session ID (like your Python random.random())
    const sid = Math.random()
    
    const buildings = await searchBuildings({
      building: query,
      lang: lang,
      sid: sid
    })

    return c.json({
      success: true,
      query: query,
      lang: lang,
      session_id: sid,
      count: buildings.length,
      buildings: buildings
    })

  } catch (error) {
    console.error('Building search error:', error)
    return c.json({ 
      error: 'Failed to search buildings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})
