import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

async function getAccessToken() {
  const snap = await getDoc(doc(db, 'secrets', 'googleCalendar'))
  if (!snap.exists()) throw new Error('Calendar credentials not configured')
  const { clientId, clientSecret, refreshToken } = snap.data()

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Failed to get access token — check credentials')
  return data.access_token
}

export async function createCalendarEvent({ title, description, location, date, startTime, endTime, attendeeEmails, timeZone = 'America/Los_Angeles' }) {
  const accessToken = await getAccessToken()

  const event = {
    summary: title,
    description: description || '',
    location: location || '',
    start: { dateTime: `${date}T${startTime}:00`, timeZone },
    end:   { dateTime: `${date}T${endTime}:00`,   timeZone },
    attendees: attendeeEmails.map(email => ({ email })),
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return { calendarEventId: data.id, calendarLink: data.htmlLink }
}

export async function updateCalendarEvent(calendarEventId, { title, description, location, date, startTime, endTime, attendeeEmails, timeZone = 'America/Los_Angeles' }) {
  const accessToken = await getAccessToken()

  const event = {
    summary: title,
    description: description || '',
    location: location || '',
    start: { dateTime: `${date}T${startTime}:00`, timeZone },
    end:   { dateTime: `${date}T${endTime}:00`,   timeZone },
    attendees: attendeeEmails.map(email => ({ email })),
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}?sendUpdates=all`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return { calendarEventId: data.id, calendarLink: data.htmlLink }
}

export async function deleteCalendarEvent(calendarEventId) {
  const accessToken = await getAccessToken()

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}?sendUpdates=all`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  // 204 No Content = success
  if (res.status !== 204 && res.status !== 200) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error?.message ?? 'Failed to delete calendar event')
  }
}

export async function credentialsConfigured() {
  try {
    const snap = await getDoc(doc(db, 'secrets', 'googleCalendar'))
    if (!snap.exists()) return false
    const { clientId, clientSecret, refreshToken } = snap.data()
    return !!(clientId && clientSecret && refreshToken)
  } catch (_) {
    return false
  }
}
