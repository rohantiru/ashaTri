import { useState } from 'react'
import { BookOpen } from 'lucide-react'

const SECTIONS = [
  {
    id: 'ows',
    label: 'First OWS',
    content: (
      <div className="space-y-4">
        <p className="font-body text-asha-dark leading-relaxed">
          Congratulations to new open water swimmers on their first experience. Swimming becomes easier with practice — including putting on and removing wetsuits.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <h3 className="font-display font-semibold text-amber-800 text-sm">Wetsuit Fit</h3>
          <p className="font-body text-amber-700 text-sm leading-relaxed">
            Any bunching under arms or water sloshing inside may indicate a need for size adjustment. Buoyancy challenges for thinner swimmers are normal and improve over time.
          </p>
        </div>
        <p className="font-body text-asha-muted text-sm leading-relaxed">
          Shivering is your signal to exit the water and warm up. Don't push through it.
        </p>
      </div>
    ),
  },
  {
    id: 'wetsuit',
    label: 'Wetsuit Notes',
    content: (
      <div className="space-y-5">
        <p className="font-body text-asha-dark leading-relaxed">
          Water transfers heat from the body approximately <strong>25–30× faster than air</strong>. Wetsuits work through two mechanisms:
        </p>
        <ol className="space-y-3">
          {[
            { title: 'Thermal trapping', desc: 'A thin layer of water trapped inside warms against your body heat, creating an insulating barrier.' },
            { title: 'Insulation', desc: 'Trapped air bubbles in neoprene provide additional warmth independent of water temperature.' },
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-asha-orange text-white font-body font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <div>
                <span className="font-body font-semibold text-asha-dark text-sm">{item.title}: </span>
                <span className="font-body text-asha-muted text-sm">{item.desc}</span>
              </div>
            </li>
          ))}
        </ol>
        <div className="bg-asha-cream border border-asha-border rounded-xl p-4">
          <h3 className="font-display font-semibold text-asha-dark text-sm mb-2">Thickness Guide</h3>
          <p className="font-body text-asha-muted text-sm leading-relaxed">
            Most wetsuits range from <strong>3mm to 5mm</strong> in the chest. Specs like "3:2:1" refer to chest / leg / arm thickness. Thicker = more buoyancy but potentially less speed. Don't stress over exact specs — all options provide adequate warmth and buoyancy for training.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'fueling',
    label: 'IM 70.3 Fueling',
    content: (
      <div className="space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-display font-semibold text-blue-800 text-sm mb-1">2024 Change</h3>
          <p className="font-body text-blue-700 text-sm leading-relaxed">
            Ironman events have switched from <strong>Gatorade → Mortal Hydration</strong> as on-course fuel. Athletes who previously relied on aid station nutrition need to adjust.
          </p>
        </div>

        <div>
          <h3 className="font-display font-semibold text-asha-dark mb-3">Target Hourly Intake (Bike)</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Carbohydrates', value: '90g', range: '70–110g' },
              { label: 'Sodium', value: '900mg', range: 'per hour' },
              { label: 'Liquid', value: '900ml', range: 'per hour' },
            ].map(item => (
              <div key={item.label} className="bg-white border border-asha-border rounded-xl p-3 text-center">
                <div className="font-display font-bold text-xl text-asha-orange">{item.value}</div>
                <div className="font-body text-xs font-medium text-asha-dark mt-0.5">{item.label}</div>
                <div className="font-body text-xs text-asha-muted">{item.range}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-display font-semibold text-red-800 text-sm mb-1">Mortal Hydration Gap</h3>
          <p className="font-body text-red-700 text-sm leading-relaxed">
            Mortal packets (13g powder in 22 fl oz water) provide only <strong>10g carbs</strong> and <strong>460mg sodium</strong> — well below targets. You must carry personal gels and drinks to bridge the gap.
          </p>
        </div>

        <div>
          <h3 className="font-display font-semibold text-asha-dark mb-2">Strategies</h3>
          <ul className="space-y-2">
            {[
              'High-concentrate bottles with 200g carbs + supplemental gels hourly',
              'Pre-measured ziplock pouches of sports drink powder',
              'Calculate exact calorie, sodium, and fluid amounts in advance',
              'Test all fueling strategies in training — never try new products on race day',
              'Try Tailwind, Skratch, Hammer now rather than waiting until race week',
            ].map((s, i) => (
              <li key={i} className="flex gap-2.5 font-body text-sm text-asha-muted">
                <span className="text-asha-orange mt-0.5">•</span>{s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'cutoffs',
    label: 'Cutoff Times',
    content: (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { leg: 'Swim', limit: '1:10:00', pace: '3:19 / 100 yd' },
            { leg: 'Swim + Bike', limit: '5:30:00', pace: '13.4 mph min' },
            { leg: 'Full Race', limit: '8:30:00', pace: '12:59 / mile run' },
          ].map(item => (
            <div key={item.leg} className="bg-white border border-asha-border rounded-xl p-4">
              <div className="font-body text-xs text-asha-muted mb-1">{item.leg}</div>
              <div className="font-display font-bold text-2xl text-asha-dark">{item.limit}</div>
              <div className="font-body text-xs text-asha-orange mt-1">{item.pace}</div>
            </div>
          ))}
        </div>
        <div className="bg-asha-cream border border-asha-border rounded-xl p-4">
          <p className="font-body text-sm text-asha-muted leading-relaxed">
            Calculate your personal cutoff times and use them as baseline training targets. Note: transition time counts toward your overall average speed on the bike section.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'july',
    label: 'Welcome to July',
    content: (
      <div className="space-y-5">
        <p className="font-body text-asha-dark leading-relaxed">
          Consistent training during summer weekends is critical. Focus where it matters most — align your effort with the time and distance each leg demands.
        </p>

        <div className="space-y-3">
          {[
            {
              leg: 'Swim',
              dist: '2% of distance',
              time: '12% of time',
              color: 'blue',
              tip: 'Prioritize efficiency and consistency over speed gains. Small improvements here have limited impact on overall time.',
            },
            {
              leg: 'Bike',
              dist: '80% of distance',
              time: '50% of time',
              color: 'orange',
              tip: 'This makes or breaks the race. Maintain conservative pacing, focus on nutrition, and break the 56 miles into 15-mile segments.',
            },
            {
              leg: 'Run',
              dist: '18% of distance',
              time: '40% of time',
              color: 'emerald',
              tip: 'Poor run performances almost always result from over-exertion on the bike. Arrive at T2 with energy left.',
            },
          ].map(item => (
            <div key={item.leg} className="bg-white border border-asha-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-display font-bold text-asha-dark">{item.leg}</span>
                <span className="font-body text-xs text-asha-muted">{item.dist} · {item.time}</span>
              </div>
              <p className="font-body text-sm text-asha-muted leading-relaxed">{item.tip}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'donner',
    label: 'Donner Swim',
    content: (
      <div className="space-y-4">
        <div className="bg-asha-cream border border-asha-border rounded-xl p-4">
          <span className="font-display font-bold text-2xl text-asha-dark">~6,000 ft</span>
          <span className="font-body text-sm text-asha-muted ml-2">elevation</span>
        </div>

        <ul className="space-y-2">
          {[
            'Choose the shortest distance option if it\'s your first time or you\'ve missed recent swims',
            'Arrive Saturday afternoon to acclimate — the clearer water also helps with adjustment',
            'Aim to arrive by 6:45–7:00 AM for the 8:00 AM Sunday start',
            'Stay well hydrated throughout the altitude weekend',
            'Carpool — parking is limited',
            'This is not a race; altitude may affect breathing, so swim slowly and stay relaxed',
          ].map((s, i) => (
            <li key={i} className="flex gap-2.5 font-body text-sm text-asha-muted">
              <span className="text-asha-orange mt-0.5">•</span>{s}
            </li>
          ))}
        </ul>

        <p className="font-body text-xs text-asha-muted italic">
          The clear water can feel unsettling at depth — Saturday practice helps with that adjustment. Water temperature is similar to Santa Cruz.
        </p>
      </div>
    ),
  },
  {
    id: 'tahoe',
    label: 'Tahoe Swim',
    content: (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-asha-cream border border-asha-border rounded-xl p-3 text-center">
            <div className="font-display font-bold text-xl text-asha-dark">~6,300 ft</div>
            <div className="font-body text-xs text-asha-muted mt-0.5">Elevation (~2,000m)</div>
          </div>
          <div className="bg-asha-cream border border-asha-border rounded-xl p-3 text-center">
            <div className="font-display font-bold text-xl text-asha-dark">−12.6%</div>
            <div className="font-body text-xs text-asha-muted mt-0.5">VO2max drop at altitude</div>
          </div>
        </div>

        <div>
          <h3 className="font-display font-semibold text-asha-dark mb-2">Key Differences</h3>
          <ul className="space-y-2">
            {[
              'Water clarity far exceeds most training venues — depth is visible and can be disorienting',
              'Buoys for longer swims are far apart (the lake is 11 miles wide, 21 miles long)',
              'Cold patches from snowmelt exist even if overall water temperature is warmer',
              'Sighting is challenging; kayak support is available but you may swim alone at times',
            ].map((s, i) => (
              <li key={i} className="flex gap-2.5 font-body text-sm text-asha-muted">
                <span className="text-asha-orange mt-0.5">•</span>{s}
              </li>
            ))}
          </ul>
        </div>

        <p className="font-body text-sm text-asha-muted italic leading-relaxed">
          Same logistics apply: arrive Saturday for acclimation, wear wetsuits, and swim at a relaxed pace. One of the most beautiful training locations on the calendar.
        </p>
      </div>
    ),
  },
  {
    id: 'offseason',
    label: 'Off-Season',
    content: (
      <div className="space-y-5">
        <div className="bg-asha-cream border border-asha-border rounded-xl p-4">
          <p className="font-body text-sm text-asha-muted leading-relaxed">
            80+ team participants competed in triathlons and open water swims in 2024, with record numbers at Santa Cruz 70.3 and Full Ironman. The goal heading into off-season: finish stronger and healthier than you started.
          </p>
        </div>

        <div>
          <h3 className="font-display font-semibold text-asha-dark mb-2">Off-Season Guidance</h3>
          <ul className="space-y-2">
            {[
              'Stay active through winter (hiking, skiing, dancing) rather than going completely sedentary',
              'Work on technique and address weaknesses during indoor training',
              'Always use the buddy system for open water swimming — stay together throughout, not just drive together',
              'Be cautious on wet roads during winter cycling',
              'Consider winter pool training for proper freestyle technique development',
              'Expect reduced capacity due to shorter daylight, hazardous conditions, and seasonal commitments',
            ].map((s, i) => (
              <li key={i} className="flex gap-2.5 font-body text-sm text-asha-muted">
                <span className="text-asha-orange mt-0.5">•</span>{s}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-asha-border rounded-xl p-4">
          <h3 className="font-display font-semibold text-asha-dark text-sm mb-1">Early-Season Race Options</h3>
          <p className="font-body text-sm text-asha-muted">Kaiser Half Marathon (February) · Napa Marathon (March)</p>
        </div>
      </div>
    ),
  },
]

export default function DocumentVault() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id)
  const active = SECTIONS.find(s => s.id === activeId)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-asha-orangeDim flex items-center justify-center">
            <BookOpen size={18} className="text-asha-orange" />
          </div>
          <h1 className="font-display font-bold text-3xl text-asha-dark">Document Vault</h1>
        </div>
        <p className="font-body text-asha-muted text-sm mt-1">Team Asha training guides and race references</p>
      </div>

      {/* Tab strip */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={`px-4 py-2 rounded-xl font-body font-medium text-sm whitespace-nowrap transition-all flex-shrink-0 ${
              activeId === s.id
                ? 'bg-asha-dark text-white'
                : 'bg-white border border-asha-border text-asha-muted hover:border-asha-orange/40'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content panel */}
      <div className="bg-white rounded-2xl border border-asha-border p-6">
        <h2 className="font-display font-bold text-xl text-asha-dark mb-5">{active.label}</h2>
        {active.content}
      </div>
    </div>
  )
}
