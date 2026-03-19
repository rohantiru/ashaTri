import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  Activity, Bike, Waves, ChevronLeft, ChevronRight,
  AlertCircle, Loader2, RefreshCw, Zap, Timer,
} from 'lucide-react'
import { stravaStatus, buildStravaAuthUrl, exchangeCode, getActivitiesForMonth, getAllCachedActivities } from '../../utils/strava'

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

      {/* Calendar grid — horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="border border-asha-border rounded-2xl overflow-hidden min-w-[480px]">

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
                    className={`border-r border-asha-border/40 last:border-r-0 p-1.5 min-h-[90px] ${
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
              <div className="w-28 shrink-0 border-l border-asha-border/60 px-2 min-h-[90px] hidden sm:block">
                <WeekTotals week={week} activityMap={activityMap} />
              </div>
            )}
          </div>
        ))}
      </div>
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

// ── Baselines ─────────────────────────────────────────────────────────────────

function fmtPaceMM(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function groupByMonth(activities) {
  const map = {}
  activities.forEach(a => {
    const month = a.start_date_local.slice(0, 7) // 'YYYY-MM'
    if (!map[month]) map[month] = []
    map[month].push(a)
  })
  return map
}

function computeMonthlyBaselines(byMonth) {
  return Object.keys(byMonth).sort().map(month => {
    const acts = byMonth[month]
    const swims = acts.filter(a => a.type === 'Swim' && a.distance >= 300 && a.moving_time > 0)
    const css = swims.length
      ? Math.min(...swims.map(a => (a.moving_time / (a.distance * 1.09361)) * 100))
      : null
    const poweredRides = acts.filter(
      a => (a.type === 'Ride' || a.type === 'VirtualRide') && a.average_watts > 0 && a.moving_time >= 1200
    )
    const ftp = poweredRides.length
      ? Math.round(Math.max(...poweredRides.map(a => a.average_watts)) * 0.95)
      : null
    const runs = acts.filter(a => a.type === 'Run' && a.distance >= 1609 && a.moving_time > 0)
    const fastestMile = runs.length
      ? Math.min(...runs.map(a => (a.moving_time / a.distance) * 1609.34))
      : null
    return { month, css, ftp, fastestMile }
  })
}

// Fills in all months between first and last so x-axis is continuous
function fillMonthGaps(monthly) {
  if (!monthly.length) return []
  const byMonth = Object.fromEntries(monthly.map(d => [d.month, d]))
  const result = []
  let [y, m] = monthly[0].month.split('-').map(Number)
  const [ly, lm] = monthly[monthly.length - 1].month.split('-').map(Number)
  while (y < ly || (y === ly && m <= lm)) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    result.push(byMonth[key] || { month: key, css: null, ftp: null, fastestMile: null })
    m++; if (m > 12) { m = 1; y++ }
  }
  return result
}

function SparkLine({ data, color, inverted = false, fmt = v => v }) {
  const svgRef = useRef(null)
  const [hovered, setHovered] = useState(null)

  const W = 400, H = 120
  const pad = { top: 12, bottom: 28, left: 52, right: 12 }
  const chartW = W - pad.left - pad.right
  const chartH = H - pad.top - pad.bottom

  const valid = data.filter(d => d.value !== null)
  if (!valid.length) return (
    <div className="h-28 flex items-center justify-center">
      <span className="text-xs font-body text-asha-muted/40">No data yet</span>
    </div>
  )

  const values = valid.map(d => d.value)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const pad5 = (rawMax - rawMin) * 0.1 || rawMax * 0.05 || 1
  const yMin = rawMin - pad5
  const yMax = rawMax + pad5
  const yRange = yMax - yMin

  const n = data.length
  const cx = i => pad.left + (i / Math.max(n - 1, 1)) * chartW
  const cy = v => pad.top + (inverted ? (v - yMin) / yRange : 1 - (v - yMin) / yRange) * chartH

  const pts = data.map((d, i) =>
    d.value !== null ? { x: cx(i), y: cy(d.value), value: d.value, month: d.month } : null
  )

  const segments = []
  let cur = []
  pts.forEach(p => {
    if (p) { cur.push(p) } else if (cur.length) { segments.push(cur); cur = [] }
  })
  if (cur.length) segments.push(cur)

  // Y-axis: 3 evenly-spaced ticks
  const yTicks = [rawMin, (rawMin + rawMax) / 2, rawMax]

  // X-axis: first, last, and up to 4 evenly spaced
  const xTickIndices = (() => {
    if (n <= 2) return data.map((_, i) => i)
    const step = Math.ceil(n / 4)
    const set = new Set([0, n - 1])
    for (let i = step; i < n - 1; i += step) set.add(i)
    return [...set].sort((a, b) => a - b)
  })()

  function handleMouseMove(e) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    let nearest = null, nearestDist = Infinity
    pts.forEach(p => {
      if (!p) return
      const d = Math.abs(p.x - mouseX)
      if (d < nearestDist) { nearestDist = d; nearest = p }
    })
    setHovered(nearest)
  }

  const tooltipWidth = 90
  const tooltipX = hovered
    ? Math.min(Math.max(hovered.x - tooltipWidth / 2, 0), W - tooltipWidth)
    : 0

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 120 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
    >
      {/* Horizontal gridlines */}
      {yTicks.map((v, i) => (
        <line
          key={i}
          x1={pad.left} y1={cy(v)} x2={W - pad.right} y2={cy(v)}
          stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4,3"
        />
      ))}

      {/* Y-axis line */}
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} stroke="#E5E7EB" strokeWidth="1" />
      {/* X-axis line */}
      <line x1={pad.left} y1={H - pad.bottom} x2={W - pad.right} y2={H - pad.bottom} stroke="#E5E7EB" strokeWidth="1" />

      {/* Y-axis tick labels */}
      {yTicks.map((v, i) => (
        <text key={i} x={pad.left - 5} y={cy(v) + 3} textAnchor="end" fontSize="8" fill="#9CA3AF" fontFamily="sans-serif">
          {fmt(v)}
        </text>
      ))}

      {/* X-axis tick labels */}
      {xTickIndices.map(i => (
        <text key={i} x={cx(i)} y={H - pad.bottom + 11} textAnchor="middle" fontSize="8" fill="#9CA3AF" fontFamily="sans-serif">
          {new Date(data[i].month + '-15').toLocaleDateString('en-US', { month: 'short' })}
        </text>
      ))}

      {/* Area fill + polyline */}
      {segments.map((seg, si) => {
        const pStr = seg.map(p => `${p.x},${p.y}`).join(' ')
        const areaStr = `${seg[0].x},${H - pad.bottom} ${pStr} ${seg[seg.length - 1].x},${H - pad.bottom}`
        return (
          <g key={si}>
            <polygon points={areaStr} fill={color} opacity="0.12" />
            <polyline points={pStr} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )
      })}

      {/* Dots */}
      {pts.filter(Boolean).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y}
          r={hovered && hovered.x === p.x ? 5 : 3.5}
          fill={color}
          stroke="white" strokeWidth={hovered && hovered.x === p.x ? 2 : 0}
        />
      ))}

      {/* Crosshair + tooltip */}
      {hovered && (
        <>
          <line
            x1={hovered.x} y1={pad.top} x2={hovered.x} y2={H - pad.bottom}
            stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.6"
          />
          {/* Tooltip box */}
          <rect x={tooltipX} y={4} width={tooltipWidth} height={28} rx="5" fill="#1F2937" opacity="0.92" />
          <text x={tooltipX + tooltipWidth / 2} y={16} textAnchor="middle" fontSize="9" fontWeight="bold" fill="white" fontFamily="sans-serif">
            {fmt(hovered.value)}
          </text>
          <text x={tooltipX + tooltipWidth / 2} y={27} textAnchor="middle" fontSize="7.5" fill="#9CA3AF" fontFamily="sans-serif">
            {new Date(hovered.month + '-15').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </text>
        </>
      )}
    </svg>
  )
}

function BaselinesTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartData, setChartData] = useState([]) // filled-gap monthly array
  const [totalActs, setTotalActs] = useState(0)

  async function compute() {
    setLoading(true)
    setError(null)
    try {
      const acts = await getAllCachedActivities()
      setTotalActs(acts.length)
      const byMonth = groupByMonth(acts)
      const monthly = computeMonthlyBaselines(byMonth)
      setChartData(fillMonthGaps(monthly))
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { compute() }, [])

  const METRICS = [
    {
      key: 'css',
      label: 'CSS',
      sublabel: 'Critical Swim Speed',
      icon: Waves,
      color: '#2563EB',
      bg: '#EFF6FF',
      fmt: v => `${fmtPaceMM(v)}/100y`,
      inverted: true,   // lower pace = better
      emptyNote: 'Needs swims ≥ 300 m loaded via Calendar',
    },
    {
      key: 'ftp',
      label: 'FTP',
      sublabel: 'Functional Threshold Power',
      icon: Zap,
      color: '#16A34A',
      bg: '#F0FDF4',
      fmt: v => `${v} W`,
      inverted: false,  // higher watts = better
      emptyNote: 'Needs rides with a power meter loaded via Calendar',
    },
    {
      key: 'fastestMile',
      label: 'Fastest Mile',
      sublabel: 'Best run mile pace',
      icon: Timer,
      color: '#FC4C02',
      bg: '#FFF3EE',
      fmt: v => `${fmtPaceMM(v)}/mi`,
      inverted: true,   // lower pace = better
      emptyNote: 'Needs runs ≥ 1 mile loaded via Calendar',
    },
  ]

  function allTimeBest(key) {
    const vals = chartData.map(d => d[key]).filter(Boolean)
    if (!vals.length) return null
    return key === 'ftp' ? Math.max(...vals) : Math.min(...vals)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="font-body text-sm text-asha-muted">
          {totalActs > 0 ? `${totalActs} cached activities across ${chartData.length} month${chartData.length !== 1 ? 's' : ''}` : 'Load months in the Calendar tab to populate baselines'}
        </p>
        <button
          onClick={compute}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-body text-asha-muted hover:text-asha-dark transition-colors disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Recalculate
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-6">
          <AlertCircle size={14} className="shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-asha-muted py-16">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm font-body">Analysing activities…</span>
        </div>
      ) : chartData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-asha-border p-12 text-center">
          <p className="font-body text-sm text-asha-muted">
            No cached activities yet. Visit the Calendar tab and navigate through months to load data.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {METRICS.map(({ key, label, sublabel, icon: Icon, color, bg, fmt, inverted, emptyNote }) => {
            const best = allTimeBest(key)
            const sparkData = chartData.map(d => ({ month: d.month, value: d[key] }))
            const hasAny = sparkData.some(d => d.value !== null)
            return (
              <div key={key} className="bg-white rounded-2xl border border-asha-border p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <div>
                      <div className="font-display font-bold text-sm text-asha-dark leading-tight">{label}</div>
                      <div className="font-body text-xs text-asha-muted leading-tight">{sublabel}</div>
                    </div>
                  </div>
                  {best && (
                    <div className="text-right">
                      <div className="font-display font-bold text-xl leading-tight" style={{ color }}>{fmt(best)}</div>
                      <div className="font-body text-[10px] text-asha-muted">all-time best</div>
                    </div>
                  )}
                </div>

                {hasAny ? (
                  <SparkLine data={sparkData} color={color} inverted={inverted} fmt={fmt} />
                ) : (
                  <div className="h-20 flex items-center justify-center">
                    <p className="text-xs font-body text-asha-muted/60">{emptyNote}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[10px] text-asha-muted/60 font-body mt-6">
        CSS is estimated from best sustained swim pace. FTP requires a power meter. Values update when you recalculate.
      </p>
    </div>
  )
}

// ── Connect screen ────────────────────────────────────────────────────────────

function ConnectScreen({ onError }) {
  const redirectUri = `${window.location.origin}${window.location.pathname}`
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
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [connected, setConnected] = useState(null) // null = loading
  const [exchanging, setExchanging] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('calendar')

  useEffect(() => {
    const code = searchParams.get('code')
    const oauthError = searchParams.get('error')
    const cleanPath = location.pathname

    if (oauthError) {
      setError('Strava authorization was declined.')
      navigate(cleanPath, { replace: true })
      setConnected(false)
      return
    }

    if (code) {
      setExchanging(true)
      exchangeCode(code)
        .then(() => {
          navigate(cleanPath, { replace: true })
          setConnected(true)
        })
        .catch(e => {
          setError(e.message)
          navigate(cleanPath, { replace: true })
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
        <h1 className="font-display font-bold text-3xl text-asha-dark">Training</h1>
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

      {connected ? (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-1 mb-6 border-b border-asha-border">
            {[
              { key: 'calendar', label: 'Calendar' },
              { key: 'baselines', label: 'Baselines' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-body font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.key
                    ? 'border-asha-orange text-asha-orange'
                    : 'border-transparent text-asha-muted hover:text-asha-dark'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'calendar' ? <CalendarView /> : <BaselinesTab />}
        </>
      ) : (
        <ConnectScreen onError={setError} />
      )}
    </div>
  )
}
