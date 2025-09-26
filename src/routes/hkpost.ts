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

    // 调用你的服务记录IP变化
    try {
      const ipLogResponse = await fetch('http://ai-service.victorysec.com.hk/api/get-all-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cloudflare-Worker-HKPost-API'
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          service: 'hk-post-search',
          query: query,
          lang: lang,
          session_id: sid,
          building_count: buildings.length,
          worker_info: {
            cf_ray: c.req.header('cf-ray'),
            cf_connecting_ip: c.req.header('cf-connecting-ip'),
            cf_ipcountry: c.req.header('cf-ipcountry'),
            cf_visitor: c.req.header('cf-visitor'),
            x_forwarded_for: c.req.header('x-forwarded-for'),
            user_agent: c.req.header('user-agent')
          }
        })
      })
      
      if (ipLogResponse.ok) {
        console.log('IP log sent successfully')
      } else {
        console.log('IP log failed:', ipLogResponse.status)
      }
    } catch (ipLogError) {
      console.log('IP log error:', ipLogError)
      // 不中断主流程，只记录错误
    }

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

// 专门的IP监控端点
hkpost.get('/ip-monitor', async (c: Context) => {
  const timestamp = new Date().toISOString()
  
  // 收集所有可用的IP和网络信息
  const ipInfo = {
    timestamp: timestamp,
    service: 'ip-monitor',
    worker_info: {
      cf_ray: c.req.header('cf-ray'),
      cf_connecting_ip: c.req.header('cf-connecting-ip'),
      cf_ipcountry: c.req.header('cf-ipcountry'),
      cf_visitor: c.req.header('cf-visitor'),
      x_forwarded_for: c.req.header('x-forwarded-for'),
      user_agent: c.req.header('user-agent'),
      accept_language: c.req.header('accept-language'),
      accept_encoding: c.req.header('accept-encoding'),
      connection: c.req.header('connection'),
      host: c.req.header('host'),
      referer: c.req.header('referer')
    }
  }

  // 发送到你的监控服务
  try {
    const ipLogResponse = await fetch('http://ai-service.victorysec.com.hk/api/get-all-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cloudflare-Worker-IP-Monitor'
      },
      body: JSON.stringify(ipInfo)
    })
    
    if (ipLogResponse.ok) {
      console.log('IP monitor log sent successfully')
    } else {
      console.log('IP monitor log failed:', ipLogResponse.status)
    }
  } catch (ipLogError) {
    console.log('IP monitor log error:', ipLogError)
  }

  // 返回IP信息给客户端
  return c.json({
    success: true,
    message: 'IP information logged',
    timestamp: timestamp,
    ip_info: ipInfo.worker_info
  })
})
