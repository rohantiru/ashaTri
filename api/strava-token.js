// Vercel serverless function — keeps STRAVA_CLIENT_SECRET off the browser
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action } = req.query
  const CLIENT_ID = process.env.STRAVA_CLIENT_ID
  const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET not set in Vercel environment variables' })
  }

  try {
    let body

    if (action === 'exchange') {
      const { code } = req.body
      if (!code) return res.status(400).json({ error: 'Missing code' })
      const r = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, grant_type: 'authorization_code' }),
      })
      body = await r.json()

    } else if (action === 'refresh') {
      const { refresh_token } = req.body
      if (!refresh_token) return res.status(400).json({ error: 'Missing refresh_token' })
      const r = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token, grant_type: 'refresh_token' }),
      })
      body = await r.json()

    } else {
      return res.status(400).json({ error: 'Invalid action — use ?action=exchange or ?action=refresh' })
    }

    if (!body.access_token) {
      return res.status(400).json({ error: body.message || 'Strava token error' })
    }

    return res.json({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_at: body.expires_at,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
