import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Activity, Bike, Waves, ChevronLeft, ChevronRight,
  AlertCircle, Loader2, RefreshCw,
} from 'lucide-react'
import { stravaStatus, buildStravaAuthUrl, exchangeCode, getActivitiesForMonth } from '../../utils/strava'

// ── Sport config ──────────────────────────────────────────────────────────────

const SPORT = {
  Run:  { label: 'Run',  color: '#FC4C02', bg: '#FFF3EE', Icon: Activity },
  Ride: { label: 'Bike', color: '#16A34A', bg: '#F0FDF4', Icon: Bike    },
  Swim: { label: 'Swim', color: '#2563EB', bg: '#EFF6FF', Icon: Waves   },
}
function getSport(type) {
  return SPORT[type] || { label: type, color: '#9CA3AF', bg: '#F9FAFB', Icon: Activity }
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmtTime(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}
function fmtRunPace(secs, meters) {
  const spm = (secs / meters) * 1609.34
  return `${Math.floor(spm / 60)}:${String(Math.round(spm % 60)).padStart(2, '0')}/mi`
}
function fmtSwimPace(secs, meters) {
  const per100y = (secs / (meters * 1.09361)) * 100
  return `${Math.floor(per100y / 60)}:${String(Math.round(per100y % 60)).padStart(2, '0')}/100y`
}

// ── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({ activity }) {
  const sport = getSport(activity.type)
  const { Icon } = sport
  const isSwim = activity.type === 'Swim'
  const isRide = activity.type === 'Ride'

  const distStr = isSwim
    ? `${Math.round(activity.distance * 1.09361).toLocaleString()} yd`
    : `${(activity.distance / 1609.34).toFixed(2)} mi`

  const timeOfDay = new Date(activity.start_date_local).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })

  let sub = null
  if (activity.distance > 0) {
    if (isRide && activity.average_speed) sub = `${(activity.average_speed * 2.237).toFixed(1)} mph`
    else if (isSwim) sub = fmtSwimPace(activity.moving_time, activity.distance)
    else sub = fmtRunPace(activity.moving_time, activity.distance)
  }

  return (
    <div className="mb-1 rounded-lg overflow-hidden" style={{ border: `1px solid ${sport.color}28` }}>
      <div className="flex items-center gap-1 px-1.5 py-0.5" style={{ background: sport.bg }}>
        <Icon size={9} style={{ color: sport.color }} />
        <span className="text-[10px] font-semibold leading-none" style={{ color: sport.color }}>
          {sport.label}
        </span>
        <span className="text-[9px] text-gray-400 ml-auto leading-none">{timeOfDay}</span>
      </div>
      <div className="px-1.5 py-1 bg-white">
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-[11px] font-bold text-asha-dark leading-tight">{distStr}</span>
          <span className="text-[10px] text-asha-muted leading-tight">{fmtTime(activity.moving_time)}</span>
        </div>
        {sub && <div className="text-[9px] text-asha-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ── Weekly totals sidebar cell ────────────────────────────────────────────────

function WeekTotals({ week, activityMap }) {
  const acts = week.flatMap(d => activityMap[dateKey(d)] || [])
  const by = {}
  acts.forEach(a => {
    if (!by[a.type]) by[a.type] = { dist: 0, time: 0 }
    by[a.type].dist += a.distance
    by[a.type].time += a.moving_time
  })

  const present = ['Swim', 'Ride', 'Run'].filter(t => by[t])
  if (!present.length) {
    return <div className="text-center text-asha-muted/25 text-xs py-4">—</div>
  }

  return (
    <div className="space-y-2 pt-1">
      {present.map(type => {
        const sport = getSport(type)
        const { Icon } = sport
        const { dist, time } = by[type]
        const distStr = type === 'Swim'
          ? `${Math.round(dist * 1.09361).toLocaleString()} yd`
          : `${(dist / 1609.34).toFixed(1)} mi`
        const h = Math.floor(time / 3600)
        const m = Math.floor((time % 3600) / 60)
        const timeStr = h ? `${h}:${String(m).padStart(2, '0')}` : `${m}m`

        return (
          <div key={type} className="flex items-start gap-1">
            <Icon size={11} style={{ color: sport.color, marginTop: 1, flexShrink: 0 }} />
            <div>
              <div className="text-[11px] font-bold leading-tight" style={{ color: sport.color }}>{distStr}</div>
              <div className="text-[10px] text-asha-muted leading-tight">{timeStr}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonthWeeks(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const start = new Date(first)
  start.setDate(start.getDate() - start.getDay())          // back to Sunday
  const end = new Date(last)
  end.setDate(end.getDate() + (6 - end.getDay()))           // forward to Saturday

  const weeks = []
  const cur = new Date(start)
  while (cur <= end) {
    const week = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

// ── Calendar view ─────────────────────────────────────────────────────────────

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MIN_YEAR = 2026

function CalendarView() {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [activityMap, setActivityMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showTotals, setShowTotals] = useState(true)

  const todayKey = dateKey(now)
  const weeks = getMonthWeeks(viewYear, viewMonth)
  const isAtMin = viewYear === MIN_YEAR && viewMonth === 0
  const isAtMax = viewYear === now.getFullYear() && viewMonth === now.getMonth()
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function prevMonth() {
    if (isAtMin) return
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (isAtMax) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }
  function goToday() {
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
  }

  async function load(year, month, forceRefresh = false) {
    setLoading(true)
    setError(null)
    if (!forceRefresh) setActivityMap({})
    try {
      const acts = await getActivitiesForMonth(year, month, forceRefresh)
      const map = {}
      acts.forEach(a => {
        const key = a.start_date_local.slice(0, 10)
        if (!map[key]) map[key] = []
        map[key].push(a)
      })
      // Sort each day's activities chronologically
      Object.values(map).forEach(arr =>
        arr.sort((a, b) => a.start_date_local.localeCompare(b.start_date_local))
      )
      setActivityMap(map)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load(viewYear, viewMonth) }, [viewYear, viewMonth])

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            disabled={isAtMin}
            className="p-1.5 rounded-lg hover:bg-asha-cream disabled:opacity-25 transition-colors"
          >
            <ChevronLeft size={16} className="text-asha-muted" />
          </button>
          <span className="font-display font-bold text-lg text-asha-dark w-48 text-center">{monthLabel}</span>
          <button
            onClick={nextMonth}
            disabled={isAtMax}
            className="p-1.5 rounded-lg hover:bg-asha-cream disabled:opacity-25 transition-colors"
          >
            <ChevronRight size={16} className="text-asha-muted" />
          </button>
          {!isAtMax && (
            <button onClick={goToday} className="text-xs font-body text-asha-orange hover:underline ml-1">
              Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => load(viewYear, viewMonth, true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-body text-asha-muted hover:text-asha-dark transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowTotals(v => !v)}
            className="text-xs font-body text-asha-muted hover:text-asha-dark transition-colors"
          >
            {showTotals ? 'Hide' : 'Show'} weekly totals
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Calendar grid */}
      <div className="border border-asha-border rounded-2xl overflow-hidden">

        {/* Day-of-week header row */}
        <div className="flex border-b border-asha-border bg-asha-cream/60">
          <div className="flex-1 grid grid-cols-7">
            {DAYS.map(d => (
              <div
                key={d}
                className="text-center text-[11px] font-body font-semibold text-asha-muted uppercase py-2 border-r border-asha-border/40 last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>
          {showTotals && (
            <div className="w-28 shrink-0 border-l border-asha-border/60 text-center text-[11px] font-body font-semibold text-asha-muted uppercase py-2 hidden sm:block">
              Week
            </div>
          )}
        </div>

        {/* Week rows */}
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className={`flex border-b border-asha-border/50 last:border-b-0 transition-opacity ${loading ? 'opacity-40' : 'opacity-100'}`}
          >
            {/* Day cells */}
            <div className="flex-1 grid grid-cols-7">
              {week.map(date => {
                const key = dateKey(date)
                const acts = activityMap[key] || []
                const isToday = key === todayKey
                const inMonth = date.getMonth() === viewMonth
                const isFirstOfMonth = date.getDate() === 1

                return (
                  <div
                    key={key}
                    className={`border-r border-asha-border/40 last:border-r-0 p-1.5 min-h-[110px] ${
                      isToday ? 'bg-asha-orange/5' : inMonth ? 'bg-white' : 'bg-asha-cream/30'
                    }`}
                  >
                    {/* Date label */}
                    <div className="mb-1">
                      {isToday ? (
                        <span className="w-5 h-5 bg-asha-orange text-white rounded-full flex items-center justify-center text-[11px] font-bold">
                          {date.getDate()}
                        </span>
                      ) : !inMonth && isFirstOfMonth ? (
                        <span className="text-[9px] text-asha-muted/60 font-medium">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      ) : (
                        <span className={`text-[11px] font-semibold ${inMonth ? 'text-asha-dark' : 'text-asha-muted/35'}`}>
                          {date.getDate()}
                        </span>
                      )}
                    </div>

                    {/* Activity cards */}
                    {acts.map(a => <ActivityCard key={a.id} activity={a} />)}
                  </div>
                )
              })}
            </div>

            {/* Weekly totals */}
            {showTotals && (
              <div className="w-28 shrink-0 border-l border-asha-border/60 px-2 min-h-[110px] hidden sm:block">
                <WeekTotals week={week} activityMap={activityMap} />
              </div>
            )}
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-asha-muted text-sm font-body mt-4">
          <Loader2 size={14} className="animate-spin" />
          Loading activities…
        </div>
      )}

      {/* Strava attribution (required by API terms) */}
      <div className="mt-4 text-right">
        <a
          href="https://www.strava.com"
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-asha-muted hover:text-asha-dark font-body"
        >
          Powered by Strava
        </a>
      </div>
    </div>
  )
}

// ── Connect screen ────────────────────────────────────────────────────────────

function ConnectScreen({ onError }) {
  const redirectUri = `${window.location.origin}/coord/training`
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID

  function handleConnect() {
    try {
      window.location.href = buildStravaAuthUrl(redirectUri)
    } catch (e) {
      onError(e.message)
    }
  }

  return (
    <div className="max-w-sm mx-auto py-16 text-center">
      <div className="bg-white rounded-2xl border border-asha-border p-8">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 mx-auto"
          style={{ background: '#FFF3EE' }}
        >
          <Activity size={22} style={{ color: '#FC4C02' }} />
        </div>
        <h2 className="font-display font-bold text-xl text-asha-dark mb-2">Connect Strava</h2>
        <p className="font-body text-sm text-asha-muted mb-6 leading-relaxed">
          Authorize this app to read your Strava activities. You'll be redirected to Strava and right back.
        </p>

        {!clientId && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-left">
            <p className="text-xs font-body text-amber-800">
              <strong>Setup needed:</strong> Add <code className="bg-white px-1 rounded">VITE_STRAVA_CLIENT_ID</code>,{' '}
              <code className="bg-white px-1 rounded">STRAVA_CLIENT_ID</code>, and{' '}
              <code className="bg-white px-1 rounded">STRAVA_CLIENT_SECRET</code> to your Vercel environment variables,
              then redeploy.
            </p>
          </div>
        )}

        <p className="text-xs font-body text-asha-muted bg-asha-cream rounded-xl p-3 mb-5 text-left">
          In your Strava app settings, set the <strong>Authorization Callback Domain</strong> to{' '}
          <code className="bg-white px-1 rounded text-[10px]">{window.location.hostname}</code>
        </p>

        <button
          onClick={handleConnect}
          disabled={!clientId}
          className="w-full text-white font-body font-semibold text-sm py-3 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: clientId ? '#FC4C02' : '#9CA3AF' }}
        >
          <Activity size={16} />
          Connect with Strava
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TrainingCalendar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [connected, setConnected] = useState(null) // null = loading
  const [exchanging, setExchanging] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const oauthError = searchParams.get('error')

    if (oauthError) {
      setError('Strava authorization was declined.')
      navigate('/coord/training', { replace: true })
      setConnected(false)
      return
    }

    if (code) {
      setExchanging(true)
      exchangeCode(code)
        .then(() => {
          navigate('/coord/training', { replace: true })
          setConnected(true)
        })
        .catch(e => {
          setError(e.message)
          navigate('/coord/training', { replace: true })
          setConnected(false)
        })
        .finally(() => setExchanging(false))
    } else {
      stravaStatus().then(s => setConnected(s.connected))
    }
  }, [])

  if (exchanging || connected === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-2 text-asha-muted">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm font-body">{exchanging ? 'Connecting to Strava…' : 'Loading…'}</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-3xl text-asha-dark">Training Calendar</h1>
          {connected && (
            <p className="font-body text-sm text-asha-muted mt-1">Your Strava activities · 2026 onwards</p>
          )}
        </div>
        {connected && (
          <button
            onClick={() => setConnected(false)}
            className="text-xs font-body text-asha-muted hover:text-red-500 transition-colors"
          >
            Disconnect Strava
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-6">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {connected ? <CalendarView /> : <ConnectScreen onError={setError} />}
    </div>
  )
}
