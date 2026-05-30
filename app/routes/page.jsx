'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { User, Mail, Phone, Car, Users, Share2 } from 'lucide-react'

const ROUTES_LAUNCH = new Date('2026-05-13T23:00:00Z').getTime() // 7 PM EDT
const ROUTES_CLOSED = new Date('2026-06-08T04:00:00Z').getTime() // midnight EDT June 8

function Chevron() {
  return (
    <svg style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

const CAR_MAKES = ['Acura','Alfa Romeo','Allard','Aston Martin','Audi','Bentley','BMW','Bugatti','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Koenigsegg','Lamborghini','Land Rover','Lexus','Lincoln','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','MINI','Mitsubishi','Nissan','Pagani','Pontiac','Porsche','Ram','Rimac','Rolls-Royce','Subaru','Toyota','Volkswagen','Volvo','Zenvo','Other']

const INCLUDED = [
  { title: 'Welcome gift for your car', sub: 'A handpicked keepsake from us, waiting for you at the start.' },
  { title: 'Premium breakfast in LaSalle', sub: 'We meet at 7 AM in LaSalle — a leisurely breakfast before the road opens up.' },
  { title: 'Cars, Coffee & Horology stop', sub: 'Step out halfway through — coffee in hand, fine watches on display, and a moment to take in the cars around you before the road opens up again.' },
  { title: 'Full media coverage', sub: 'Your car on the road it was built for — captured by our media team and shared with every attendee after the trip.' },
  { title: 'Stroll the village at Tremblant', sub: 'Time to decompress in the pedestrian village — wander, explore, and take in the mountain scenery on foot.' },
  { title: 'Artisanal lunch in the Laurentians', sub: 'Hand-picked and worth the drive — great food, great setting, earned after a morning on the backroads.' },
  { title: 'Send-off over drinks', sub: 'After driving back to Montreal, we close the day over coffee and cold drinks — a relaxed end to a day well driven.' },
]

export default function RoutesPage() {
  const [launched, setLaunched] = useState(false)
  const [form, setForm] = useState({ name:'', email:'', phone:'', year:'', carMake:'', carModel:'', passengers:'', hasChildren:'', childrenAges:'', source:'', more:'' })
  const [errors, setErrors] = useState({})
  const [phoneOptOut, setPhoneOptOut] = useState(false)
  const [status, setStatus] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [focusedField, setFocusedField] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const honeypotRef = useRef(null)

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).has('preview')
    if (Date.now() >= ROUTES_LAUNCH || preview) {
      setLaunched(true)
    } else {
      const interval = setInterval(() => {
        if (Date.now() >= ROUTES_LAUNCH) { setLaunched(true); clearInterval(interval) }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.fbq) window.fbq('track', 'ViewContent', { content_name: 'Into the Laurentians' })
  }, [])

  function updateForm(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'hasChildren' && value === 'no') next.childrenAges = ''
      return next
    })
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: false }))
    if (serverError) setServerError(null)
  }

  function formatPhone(v) {
    const d = v.replace(/\D/g,'').slice(0,10)
    if (d.length <= 3) return d
    if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  }

  function inputStyle(field) {
    const isFocused = focusedField === field
    const hasError = !!errors[field]
    const hasValue = !!form[field]
    let border, background, boxShadow
    if (hasError) {
      border = '1px solid #7B2032'; background = 'rgba(123,32,50,0.04)'; boxShadow = 'none'
    } else if (hasValue) {
      border = '1px solid #3B6B2F'; background = 'rgba(59,107,47,0.05)'; boxShadow = 'none'
    } else if (isFocused) {
      border = '1px solid #c5a882'; background = 'transparent'; boxShadow = '0 0 0 3px rgba(197,168,130,0.2)'
    } else {
      border = '1px solid rgba(0,0,0,0.2)'; background = 'transparent'; boxShadow = 'none'
    }
    return {
      width:'100%', padding:'0.9rem 1.2rem',
      border, background, boxShadow,
      fontSize:'13px', fontFamily:"var(--font-inter),sans-serif", outline:'none', color:'#1a1a1a',
      transition:'border-color 0.2s, box-shadow 0.2s, background 0.2s',
      WebkitAppearance:'none', MozAppearance:'none', appearance:'none',
    }
  }

  function validate() {
    const e = {}
    if (form.name.trim().length < 2) e.name = true
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = true
    if (!phoneOptOut && (!form.phone.trim() || form.phone.replace(/\D/g,'').length < 10)) e.phone = true
    if (!form.year) e.year = true
    if (!form.carMake) e.carMake = true
    if (!form.carModel.trim()) e.carModel = true
    if (!form.passengers) e.passengers = true
    if (!form.hasChildren) e.hasChildren = true
    if (form.hasChildren === 'yes' && !form.childrenAges.trim()) e.childrenAges = true
    if (!form.source) e.source = true
    setErrors(e)
    return e
  }

  async function handleSubmit() {
    if (status === 'loading') return
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      const order = ['name','email','phone','year','carMake','carModel','passengers','hasChildren','childrenAges','source']
      const first = order.find(f => errs[f])
      if (first) {
        const el = document.getElementById(`field-${first}`)
        if (el) el.scrollIntoView({ behavior:'smooth', block:'center' })
      }
      return
    }
    setStatus('loading')
    setServerError(null)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch('/api/routes', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ ...form, carModel: [form.carMake, form.carModel].filter(Boolean).join(' '), _hp: honeypotRef.current?.value || '' }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus('success')
        if (typeof window !== 'undefined' && window.fbq) window.fbq('track', 'Lead')
      } else {
        setServerError(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch (err) {
      clearTimeout(timeout)
      if (err?.name === 'AbortError') {
        setServerError("Request timed out. Please check your connection and try again.")
      } else {
        setServerError('Something went wrong. Please try again.')
      }
      setStatus('error')
    }
  }

  const registrationClosed = Date.now() >= ROUTES_CLOSED
  const showForm = launched && !registrationClosed && status !== 'success'

  return (
    <div style={{background:"#F5F1EC",fontFamily:"var(--font-inter),sans-serif",color:"#1a1a1a",minHeight:"100vh"}}>
      <style>{`
        @media (max-width: 768px) {
          .routes-hero { padding: clamp(100px,14vw,160px) 1.25rem 4rem !important; }
          .routes-details { padding: 3.5rem 1.25rem !important; }
          .routes-form-section { padding: 3rem 1.25rem 5rem !important; }
          .routes-footer { padding: 1.5rem 1.25rem !important; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <Link href="/">
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="nav-logo" />
        </Link>
        <div className="nav-links">
          <Link href="/" style={{color:"#555",textDecoration:"none"}}>Home</Link>
          <Link href="/#events" style={{color:"#555",textDecoration:"none"}}>Events</Link>
          <Link href="/#contact" style={{color:"#555",textDecoration:"none"}}>Contact</Link>
          <Link href="/faq" style={{color:"#555",textDecoration:"none"}}>FAQ</Link>
        </div>
        <Link href="/#join" className="nav-join">Join</Link>
        <button className="hamburger btn-push" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
          <span></span><span></span><span></span>
        </button>
      </nav>

      {/* MOBILE MENU */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link href="/" onClick={() => setMenuOpen(false)} style={{color:"#555",textDecoration:"none"}}>Home</Link>
        <Link href="/#events" onClick={() => setMenuOpen(false)} style={{color:"#555",textDecoration:"none"}}>Events</Link>
        <Link href="/#contact" onClick={() => setMenuOpen(false)} style={{color:"#555",textDecoration:"none"}}>Contact</Link>
        <Link href="/faq" onClick={() => setMenuOpen(false)} style={{color:"#555",textDecoration:"none"}}>FAQ</Link>
        <Link href="/#join" onClick={() => setMenuOpen(false)} style={{color:"#1a1a1a",fontWeight:"500"}}>Join</Link>
        <Link href="/members/login" onClick={() => setMenuOpen(false)} style={{color:"#3B6B2F",fontWeight:"500"}}>Members Login</Link>
      </div>

      {/* HERO */}
      <section className="routes-hero" style={{background:"#0F1E14",backgroundImage:"linear-gradient(rgba(10,20,12,0.72),rgba(10,20,12,0.72)),url('/trem-trip.png')",backgroundSize:"cover",backgroundPosition:"center bottom",padding:"clamp(140px,18vw,210px) 3rem 6rem",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)"}} />
        <div style={{fontSize:"10px",letterSpacing:"0.28em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)",marginBottom:"1.2rem"}}>Canvas Routes</div>
        <h1 style={{fontFamily:"var(--font-cormorant),serif",fontSize:"clamp(3rem,7vw,5.5rem)",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.05",marginBottom:"0.75rem",letterSpacing:"-0.01em"}}>
          Into the Laurentians
        </h1>
        <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"clamp(1.1rem,2.5vw,1.4rem)",fontStyle:"italic",color:"rgba(245,241,236,0.4)",marginBottom:"1.2rem"}}>
          Mont-Tremblant, QC
        </div>
        <div style={{display:"inline-block",padding:"0.45rem 1.2rem",border:"0.5px solid rgba(197,168,130,0.5)",fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#c5a882",marginBottom:"2.5rem"}}>
          June 7, 2026
        </div>
        <div style={{width:"40px",height:"0.5px",background:"rgba(197,168,130,0.5)",margin:"0 auto 2.5rem"}} />
        <p style={{fontSize:"0.9rem",color:"rgba(245,241,236,0.55)",maxWidth:"460px",margin:"0 auto",lineHeight:"1.9",letterSpacing:"0.02em"}}>
          The road starts at 7 AM in LaSalle. By the time you reach the Laurentians, the city feels far away. That&apos;s the point.
        </p>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.2),transparent)"}} />
      </section>

      {/* DETAILS — What's Included + Pricing */}
      <section className="routes-details" style={{background:"#EDE8E1",padding:"5rem 3rem"}}>
        <style>{`@media(max-width:680px){.details-grid{grid-template-columns:1fr !important;gap:3rem !important}}`}</style>
        <div className="details-grid" style={{maxWidth:"860px",margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5rem",alignItems:"stretch"}}>

          {/* PRICING + NOTES */}
          <div>
            <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"#888",marginBottom:"1.5rem"}}>Pricing &amp; details</div>

            {/* Price block */}
            <div style={{border:"0.5px solid rgba(0,0,0,0.12)",padding:"1.8rem",marginBottom:"1.5rem",background:"#F5F1EC"}}>
              <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"3rem",fontWeight:"300",color:"#1a1a1a",lineHeight:"1",marginBottom:"0.4rem"}}>$200</div>
              <div style={{fontSize:"11px",letterSpacing:"0.12em",textTransform:"uppercase",color:"#7B5B2E"}}>per car · 2 people included</div>
            </div>

            {/* Membership note */}
            <div style={{marginBottom:"1rem",padding:"0.85rem 1rem",border:"0.5px solid rgba(197,168,130,0.35)",background:"rgba(197,168,130,0.05)"}}>
              <span style={{fontSize:"12px",color:"#7B5B2E",lineHeight:"1.7"}}>Canvas Routes members receive preferred pricing. Not a member yet? </span>
              <Link href="/membership" style={{fontSize:"12px",color:"#7B5B2E",textDecoration:"underline",textUnderlineOffset:"2px"}}>canvasroutes.com/membership</Link>
            </div>

            {/* Notes */}
            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              {[
                { text: 'Your car photographed on the road it was built for — personal shots from our photographer on the best stretches of the day.' },
                { text: 'Driver-focused cars only — this route is built for cars that were made to be driven.' },
                { text: 'Convoy all the way — we leave together, move together, and arrive together. The group is half the experience.' },
                { text: 'Backroads all the way to Mont-Tremblant — the kind where your car finally gets to breathe and you actually get to enjoy it.' },
                { text: 'We drive in style, not speed. This is not a race.' },
                { text: 'Gas and $30 VIP parking available, at your cost.', grey: 'Free parking also available nearby.' },
                { text: 'This trip is a preview of what Canvas Routes membership offers — this is just the tasting menu.' },
                { text: 'All future road trips will be exclusive to members. This is your way in — to be around like-minded people who take cars seriously.' },
              ].map((note, i) => (
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"0.75rem"}}>
                  <div style={{width:"3px",height:"3px",borderRadius:"50%",background:"#c5a882",flexShrink:0,marginTop:"8px"}} />
                  <span style={{fontSize:"0.85rem",color:"#555",lineHeight:"1.7"}}>
                    {note.text}{note.grey && <span style={{color:"#aaa",marginLeft:"0.4rem"}}>{note.grey}</span>}
                  </span>
                </div>
              ))}
            </div>

          </div>

          {/* WHAT'S INCLUDED */}
          <div>
            <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"#888",marginBottom:"1.5rem"}}>What&apos;s included</div>
            <div style={{display:"flex",flexDirection:"column",gap:"0"}}>
              {INCLUDED.map((item, i) => {
                const isBreakfast = item.title === 'Premium breakfast in LaSalle'
                return (
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"1.2rem",padding:"1rem",borderBottom:"0.5px solid rgba(0,0,0,0.07)",marginLeft: isBreakfast ? "-1rem" : undefined, marginRight: isBreakfast ? "-0rem" : undefined, background:isBreakfast?"#c5a882":"transparent"}}>
                    <div style={{width:"5px",height:"5px",background:isBreakfast?"#0F1E14":"rgba(197,168,130,0.75)",flexShrink:0,marginTop:"6px"}} />
                    <div style={{flex:1}}>
                      <div style={{fontSize:"0.875rem",color:isBreakfast?"#0F1E14":"#1a1a1a",lineHeight:"1.5",letterSpacing:"0.01em",fontWeight:"600",marginBottom:"0.2rem"}}>{item.title}</div>
                      <div style={{fontSize:"0.8rem",color:isBreakfast?"rgba(15,30,20,0.7)":"#888",lineHeight:"1.6"}}>{item.sub}</div>
                    </div>
                    {isBreakfast && <div style={{fontSize:"10px",letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(15,30,20,0.55)",flexShrink:0,alignSelf:"center"}}>7:00 AM</div>}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{gridColumn:"1 / -1",textAlign:"center",paddingTop:"2.5rem",borderTop:"0.5px solid rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:"11px",letterSpacing:"0.16em",textTransform:"uppercase",color:"#7B2032"}}>Spots are limited &nbsp;·&nbsp; Selection is curated.</div>
          </div>

        </div>
      </section>

      {/* ITINERARY */}
      <section style={{background:"#0F1E14",padding:"6rem 2rem 7rem"}}>
        <style>{`@media(max-width:600px){.incl-grid{grid-template-columns:1fr !important;gap:2rem !important}}`}</style>
        <div style={{maxWidth:"560px",margin:"0 auto"}}>

          {/* Heading */}
          <div style={{textAlign:"center",marginBottom:"4rem"}}>
            <div style={{fontSize:"10px",letterSpacing:"0.28em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)",marginBottom:"1.2rem"}}>Canvas Routes · June 7, 2026</div>
            <h2 style={{fontFamily:"var(--font-cormorant),serif",fontSize:"clamp(1.8rem,4vw,2.6rem)",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.1",margin:0}}>What Your Day Looks Like</h2>
            <div style={{width:"30px",height:"0.5px",background:"rgba(197,168,130,0.4)",margin:"1.5rem auto"}} />
            <p style={{fontSize:"0.9rem",color:"rgba(245,241,236,0.5)",lineHeight:"1.9",maxWidth:"400px",margin:"0 auto"}}>Every stop is planned. Every meal is on us.</p>
          </div>

          {/* Stops */}
          {[
            { label:'Breakfast', venue:'Petinos Restaurant', address:'LaSalle, Montreal', desc:"The day starts with a proper sit-down breakfast — not a grab-and-go. You'll leave the table full and ready.", pays:true },
            { label:'Convoy Departs', venue:null, address:null, desc:'The city falls behind you fast once you\'re north of LaSalle. From the first regroup stop, it\'s nothing but backroads all the way.', pays:false },
            { label:'Regroup', venue:null, address:'Saint-Sauveur', desc:'Quick stop to refuel and regroup before the real roads begin.', pays:false },
            { label:'Lake View Photo Stop', venue:null, address:'Sainte-Agathe-des-Monts, Lac des Sables', desc:'Pull off at Lac des Sables for a moment to breathe — windows down, engines off, water in view.', pays:false },
            { label:'Coffee Stop', venue:'Café Mont-Blanc', address:'Mont-Blanc, QC', desc:'Halfway through the drive, a proper coffee break deep in the Laurentians. Step out, take in the cars around you, and enjoy the quiet before the road opens back up.', pays:true },
            { label:'Free Time', venue:'Mont-Tremblant Pedestrian Village', address:null, desc:'The pedestrian village is yours — wander, explore, take in the mountain. P1 VIP parking available at $30 per car, at your cost. We regroup and drive together to Pizzeria No.900 for lunch.', pays:false },
            { label:'Group Lunch', venue:'Pizzeria No.900', address:'Mont-Tremblant, QC', desc:'A proper sit-down lunch together at one of the best spots in the village. A meal worth the drive.', pays:true },
            { label:'Return Convoy', venue:null, address:null, desc:'QC-117 South to A-15 South. The way home is just as good as the way up.', pays:false },
            { label:'Farewell', venue:'Aloe Cafe', address:'Pointe-Claire, QC', desc:'The day closes over coffees and snacks on the West Island — a relaxed end to a day well driven.', pays:true },
          ].map((stop, i, arr) => (
            <div key={i} style={{display:"flex",gap:"1.5rem",padding:"1.75rem 0",borderBottom: i < arr.length-1 ? "0.5px solid rgba(197,168,130,0.1)" : "none"}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:stop.pays?"#c5a882":"rgba(197,168,130,0.4)",flexShrink:0,marginTop:"5px"}} />
              <div style={{flex:1}}>
                <div style={{fontSize:"9px",letterSpacing:"0.25em",textTransform:"uppercase",color:"rgba(197,168,130,0.65)",marginBottom:"0.35rem"}}>{stop.label}</div>
                {stop.venue && <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.25rem",fontWeight:"400",color:"#F5F1EC",marginBottom:"0.2rem",lineHeight:"1.3"}}>{stop.venue}</div>}
                {stop.address && <div style={{fontSize:"11px",color:"rgba(245,241,236,0.3)",marginBottom:"0.6rem",letterSpacing:"0.02em"}}>{stop.address}</div>}
                {(stop.desc || stop.pays) && (
                  <div style={{fontSize:"13px",color:"rgba(245,241,236,0.65)",lineHeight:"1.85"}}>
                    {stop.desc}{stop.pays && <span style={{color:"#c5a882",marginLeft: stop.desc ? "0.35rem" : 0}}>Canvas Routes pays.</span>}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Divider */}
          <div style={{height:"0.5px",background:"rgba(197,168,130,0.15)",margin:"4rem 0"}} />

          {/* Included / Not Included */}
          <div className="incl-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3rem",marginBottom:"4rem"}}>
            <div>
              <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)",marginBottom:"1.2rem"}}>What&apos;s included</div>
              {[
                'Breakfast at Petinos LaSalle',
                'Coffee and pastry at Café Mont-Blanc',
                'Group lunch at Pizzeria No.900',
                'Farewell coffees and snacks at Aloe Cafe',
                'Personal car photography throughout the day',
              ].map((item, i) => (
                <div key={i} style={{display:"flex",gap:"0.75rem",alignItems:"flex-start",marginBottom:"0.75rem"}}>
                  <div style={{width:"4px",height:"4px",borderRadius:"50%",background:"#3B6B2F",flexShrink:0,marginTop:"7px"}} />
                  <span style={{fontSize:"13px",color:"rgba(245,241,236,0.65)",lineHeight:"1.7"}}>{item}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)",marginBottom:"1.2rem"}}>Not included</div>
              {[
                'Gas',
                'Parking in Tremblant ($30 per car)',
                'Personal activities in Tremblant village',
              ].map((item, i) => (
                <div key={i} style={{display:"flex",gap:"0.75rem",alignItems:"flex-start",marginBottom:"0.75rem"}}>
                  <div style={{width:"4px",height:"4px",borderRadius:"50%",background:"rgba(245,241,236,0.2)",flexShrink:0,marginTop:"7px"}} />
                  <span style={{fontSize:"13px",color:"rgba(245,241,236,0.4)",lineHeight:"1.7"}}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Registration box */}
          <div style={{border:"0.5px solid rgba(197,168,130,0.25)",padding:"2rem",background:"rgba(197,168,130,0.05)"}}>
            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",flexWrap:"wrap",gap:"0.5rem"}}>
                <div style={{fontSize:"10px",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)"}}>Price</div>
                <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.6rem",fontWeight:"300",color:"#F5F1EC"}}>$200 <span style={{fontSize:"0.85rem",color:"rgba(245,241,236,0.4)",fontFamily:"var(--font-inter),sans-serif",letterSpacing:"0.04em",textTransform:"uppercase",fontSize:"11px"}}>per car · 2 people</span></div>
              </div>
              <div style={{height:"0.5px",background:"rgba(197,168,130,0.1)"}} />
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",flexWrap:"wrap",gap:"0.5rem"}}>
                <div style={{fontSize:"10px",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)"}}>Register by</div>
                <div style={{fontSize:"13px",color:"rgba(245,241,236,0.7)"}}>June 6 at noon</div>
              </div>
              <div style={{height:"0.5px",background:"rgba(197,168,130,0.1)"}} />
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",flexWrap:"wrap",gap:"0.5rem"}}>
                <div style={{fontSize:"10px",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)"}}>Payment</div>
                <div style={{fontSize:"13px",color:"rgba(245,241,236,0.7)"}}>Details sent to you after application is reviewed</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FORM SECTION */}
      <section id="form" className="routes-form-section" style={{padding:"6rem 2rem 8rem",background:"#F5F1EC"}}>
        <div style={{maxWidth:"560px",margin:"0 auto"}}>

          {/* PRE-LAUNCH */}
          {!launched && !registrationClosed && (
            <div style={{textAlign:"center",padding:"5rem 0"}}>
              <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"1rem"}}>Registration opens tonight</div>
              <div style={{width:"30px",height:"0.5px",background:"#c5a882",margin:"1.2rem auto"}} />
              <p style={{fontSize:"0.9rem",color:"#777",lineHeight:"1.9",maxWidth:"380px",margin:"0 auto"}}>
                Spots are limited. Registration opens at 7 PM Eastern — check back then to apply.
              </p>
            </div>
          )}

          {/* REGISTRATION CLOSED */}
          {registrationClosed && status !== 'success' && (
            <div style={{textAlign:"center",padding:"5rem 0"}}>
              <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"1rem"}}>Registration is now closed.</div>
              <div style={{width:"30px",height:"0.5px",background:"#c5a882",margin:"1.2rem auto"}} />
              <p style={{fontSize:"0.9rem",color:"#777",lineHeight:"1.9",maxWidth:"420px",margin:"1.5rem auto"}}>
                This route has been completed. All future Canvas Routes road trips will be exclusive to members.
              </p>
              <Link href="/membership" style={{display:"inline-block",marginTop:"1.5rem",padding:"0.9rem 2.5rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#1a1a1a",border:"1px solid rgba(0,0,0,0.25)",textDecoration:"none",fontFamily:"var(--font-inter),sans-serif"}}>
                Join Canvas Routes
              </Link>
            </div>
          )}

          {/* SUCCESS */}
          {launched && !registrationClosed && status === 'success' && (
            <div style={{textAlign:"center",padding:"5rem 0"}}>
              <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#3B6B2F",marginBottom:"1rem"}}>Application received.</div>
              <div style={{width:"30px",height:"0.5px",background:"#c5a882",margin:"1.2rem auto"}} />
              <p style={{fontSize:"0.9rem",color:"#777",lineHeight:"1.9",maxWidth:"420px",margin:"1.5rem auto 0"}}>
                We&apos;ve received your registration. A confirmation email is on its way from <strong style={{color:"#1a1a1a",fontWeight:"500"}}>info@canvasroutes.com</strong> or <strong style={{color:"#1a1a1a",fontWeight:"500"}}>jerry@canvasroutes.com</strong> — add both to your contacts and keep an eye on your junk/spam folder so you don&apos;t miss it. Full event details will be sent upon confirmation.
              </p>
            </div>
          )}

          {/* FORM */}
          {showForm && (
            <>
              <div style={{textAlign:"center",marginBottom:"3.5rem"}}>
                <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.4rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"0.5rem"}}>Apply for your spot</div>
                <div style={{width:"30px",height:"0.5px",background:"#c5a882",margin:"1.2rem auto 0"}} />
              </div>

              <form onSubmit={e => { e.preventDefault(); handleSubmit() }} noValidate>

                {/* Name + Email */}
                <div className="join-form-row" style={{marginBottom:"1rem"}}>
                  <div className="join-form-field">
                    <label htmlFor="field-name" className="join-label">Full name<User size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                    <input id="field-name" type="text" placeholder="Your full name" value={form.name} maxLength={100}
                      onChange={e => updateForm('name', e.target.value)} style={inputStyle('name')}
                      onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} />
                    {errors.name && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                  </div>
                  <div className="join-form-field">
                    <label htmlFor="field-email" className="join-label">Email<Mail size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                    <input id="field-email" type="email" placeholder="Your email" value={form.email}
                      onChange={e => updateForm('email', e.target.value)} style={inputStyle('email')}
                      onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} />
                    {errors.email && <span style={{fontSize:"11px",color:"#7B2032"}}>Valid email required</span>}
                  </div>
                </div>

                {/* Phone */}
                <div className="join-form-field" style={{marginBottom:"1rem"}}>
                  <label htmlFor="field-phone" className="join-label">Phone number<Phone size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                  {phoneOptOut ? (
                    <div style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.65rem 0.9rem",background:"rgba(0,0,0,0.03)",border:"0.5px solid rgba(0,0,0,0.1)"}}>
                      <span style={{fontSize:"13px",color:"#aaa",flex:1}}>Phone not provided</span>
                      <button type="button" onClick={() => { setPhoneOptOut(false); setErrors(p => ({...p, phone: undefined})) }} style={{background:"none",border:"none",padding:0,fontSize:"11px",color:"#888",cursor:"pointer",textDecoration:"underline",fontFamily:"var(--font-inter),sans-serif",whiteSpace:"nowrap"}}>Add number</button>
                    </div>
                  ) : (
                    <>
                      <input id="field-phone" type="tel" placeholder="(514) 000-0000" value={form.phone}
                        onChange={e => updateForm('phone', formatPhone(e.target.value))} style={inputStyle('phone')}
                        onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)} />
                      {errors.phone && <span style={{fontSize:"11px",color:"#7B2032"}}>Please enter a valid 10-digit number</span>}
                      <button type="button" onClick={() => { setPhoneOptOut(true); setForm(p => ({...p, phone:''})); setErrors(p => ({...p, phone: undefined})) }} style={{background:"none",border:"none",padding:"0.3rem 0",fontSize:"11px",color:"#aaa",cursor:"pointer",textDecoration:"underline",fontFamily:"var(--font-inter),sans-serif",textAlign:"left"}}>Prefer not to share my number</button>
                    </>
                  )}
                </div>

                {/* Year + Make */}
                <div className="join-form-row" style={{marginBottom:"1rem"}}>
                  <div className="join-form-field">
                    <label htmlFor="field-year" className="join-label">Year<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                    <div style={{position:"relative"}}>
                      <select id="field-year" value={form.year} onChange={e => updateForm('year', e.target.value)}
                        style={{...inputStyle('year'), cursor:"pointer", paddingRight:"2rem"}}>
                        <option value="">Select year</option>
                        {Array.from({length:2027-1940+1},(_,i)=>2027-i).map(y=>(
                          <option key={y} value={String(y)}>{y}</option>
                        ))}
                      </select>
                      <Chevron />
                    </div>
                    {errors.year && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                  </div>
                  <div className="join-form-field">
                    <label htmlFor="field-carMake" className="join-label">Make<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                    <div style={{position:"relative"}}>
                      <select id="field-carMake" value={form.carMake} onChange={e => updateForm('carMake', e.target.value)}
                        style={{...inputStyle('carMake'), cursor:"pointer", paddingRight:"2rem"}}>
                        <option value="">Select make</option>
                        {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <Chevron />
                    </div>
                    {errors.carMake && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                  </div>
                </div>

                {/* Model */}
                <div className="join-form-field" style={{marginBottom:"1rem"}}>
                  <label htmlFor="field-carModel" className="join-label">Model<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                  <input id="field-carModel" type="text" placeholder="e.g. 911 Carrera S" value={form.carModel} maxLength={100}
                    onChange={e => updateForm('carModel', e.target.value)} style={inputStyle('carModel')}
                    onFocus={() => setFocusedField('carModel')} onBlur={() => setFocusedField(null)} />
                  {errors.carModel && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                </div>

                {/* Passengers */}
                <div className="join-form-field" style={{marginBottom:"1rem"}}>
                  <label htmlFor="field-passengers" className="join-label">Number of passengers<Users size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span> <span style={{color:"#888",fontWeight:"300",textTransform:"none",letterSpacing:0,fontSize:"11px"}}>(including driver)</span></label>
                  <div style={{position:"relative"}}>
                    <select id="field-passengers" value={form.passengers} onChange={e => updateForm('passengers', e.target.value)}
                      style={{...inputStyle('passengers'), cursor:"pointer", paddingRight:"2rem"}}>
                      <option value="">Select</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4+">4+</option>
                    </select>
                    <Chevron />
                  </div>
                  {errors.passengers && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                </div>

                {/* Children */}
                <div className="join-form-field" style={{marginBottom:"1rem"}}>
                  <div id="field-hasChildren" className="join-label" style={{marginBottom:"0.75rem"}}>Any children attending?<span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></div>
                  <div style={{display:"flex",gap:"1rem"}}>
                    {['Yes','No'].map(v => {
                      const val = v.toLowerCase()
                      const selected = form.hasChildren === val
                      return (
                        <button key={v} type="button" onClick={() => updateForm('hasChildren', val)}
                          style={{flex:1,padding:"0.9rem",border:`1px solid ${selected?'#3B6B2F':errors.hasChildren?'#7B2032':'rgba(0,0,0,0.2)'}`,background:selected?'rgba(59,107,47,0.06)':errors.hasChildren?'rgba(123,32,50,0.03)':'transparent',cursor:"pointer",fontFamily:"var(--font-inter),sans-serif",fontSize:"13px",color:selected?'#3B6B2F':'#1a1a1a',transition:"all 0.2s",letterSpacing:"0.04em"}}>
                          {v}
                        </button>
                      )
                    })}
                  </div>
                  {errors.hasChildren && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                  {form.hasChildren === 'yes' && (
                    <div style={{marginTop:"0.75rem",padding:"0.85rem 1rem",border:"0.5px solid rgba(197,168,130,0.4)",background:"rgba(197,168,130,0.08)"}}>
                      <span style={{fontSize:"12px",color:"#7B5B2E",lineHeight:"1.7"}}>Each child attending is an additional charge. We&apos;ll reach out by email with the details after you register.</span>
                    </div>
                  )}
                </div>

                {form.hasChildren === 'yes' && (
                  <div className="join-form-field" style={{marginBottom:"1rem"}}>
                    <label htmlFor="field-childrenAges" className="join-label">Ages of children<span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                    <input id="field-childrenAges" type="text" placeholder="e.g. 4, 7, 12" value={form.childrenAges} maxLength={100}
                      onChange={e => updateForm('childrenAges', e.target.value)} style={inputStyle('childrenAges')}
                      onFocus={() => setFocusedField('childrenAges')} onBlur={() => setFocusedField(null)} />
                    {errors.childrenAges && <span style={{fontSize:"11px",color:"#7B2032"}}>Please enter the ages</span>}
                  </div>
                )}

                {/* Source */}
                <div className="join-form-field" style={{marginBottom:"1rem"}}>
                  <label htmlFor="field-source" className="join-label">How did you hear about us?<Share2 size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                  <div style={{position:"relative"}}>
                    <select id="field-source" value={form.source} onChange={e => updateForm('source', e.target.value)}
                      style={{...inputStyle('source'), cursor:"pointer", paddingRight:"2rem"}}>
                      <option value="">Select an option</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Friend / Word of mouth">Friend / Word of mouth</option>
                      <option value="Google">Google</option>
                      <option value="Other">Other</option>
                    </select>
                    <Chevron />
                  </div>
                  {errors.source && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                </div>

                {/* Tell us more */}
                <div className="join-form-field" style={{marginBottom:"1rem"}}>
                  <label htmlFor="field-more" className="join-label">Tell us more <span style={{color:"#888",fontWeight:"300"}}>(optional)</span></label>
                  <textarea id="field-more" placeholder="Anything you'd like us to know — your car, your passengers, or what excites you about this trip..." value={form.more}
                    onChange={e => updateForm('more', e.target.value)} rows={4} maxLength={500}
                    style={{...inputStyle('more'), resize:"vertical"}}
                    onFocus={() => setFocusedField('more')} onBlur={() => setFocusedField(null)} />
                  <div style={{textAlign:"right",fontSize:"10px",color:"#aaa",marginTop:"0.3rem"}}>{form.more.length}/500</div>
                </div>

                {/* Payment note */}
                <div style={{marginBottom:"2.5rem",padding:"1rem 1.2rem",border:"0.5px solid rgba(0,0,0,0.12)",background:"rgba(197,168,130,0.06)"}}>
                  <div style={{fontSize:"10px",letterSpacing:"0.18em",textTransform:"uppercase",color:"#7B5B2E",marginBottom:"0.4rem"}}>Payment — $200 per car</div>
                  <div style={{fontSize:"13px",color:"#555",lineHeight:"1.7"}}>Payment details will be sent in your confirmation email.</div>
                </div>

                {/* Honeypot */}
                <div style={{position:'absolute',left:'-9999px',width:1,height:1,overflow:'hidden'}} aria-hidden="true">
                  <input ref={honeypotRef} type="text" name="cr_rt_field" tabIndex={-1} autoComplete="off" />
                </div>

                <button type="submit" disabled={status === 'loading'}
                  className="btn-push join-submit-btn"
                  style={{display:"block",width:"100%",padding:"1.1rem",fontSize:"11px",letterSpacing:"0.18em",textTransform:"uppercase",cursor:status==='loading'?'wait':'pointer',fontFamily:"var(--font-inter),sans-serif",marginBottom:"1rem"}}>
                  {status === 'loading' ? 'Submitting...' : 'Apply — $200 per car'}
                </button>
                {status === 'error' && <div style={{fontSize:"12px",color:"#7B2032",textAlign:"center",marginBottom:"0.5rem"}}>{serverError}</div>}
                <p style={{fontSize:"13px",color:"#777",lineHeight:"1.8",textAlign:"center",marginTop:"0.75rem"}}>
                  Full event details will be sent upon confirmation.
                </p>

              </form>
            </>
          )}

        </div>
      </section>

      {/* FOOTER */}
      <footer className="routes-footer" style={{borderTop:"0.5px solid rgba(0,0,0,0.12)",padding:"2rem 3rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem",background:"#F5F1EC"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
          <div style={{fontSize:"11px",color:"#888",letterSpacing:"0.05em"}}>© 2026 Canvas Routes. Montreal, QC.</div>
          <div style={{display:"flex",gap:"1rem"}}>
            <Link href="/privacy" style={{fontSize:"10px",color:"#aaa",textDecoration:"none",letterSpacing:"0.03em"}}>Privacy Policy</Link>
            <Link href="/terms" style={{fontSize:"10px",color:"#aaa",textDecoration:"none",letterSpacing:"0.03em"}}>Terms</Link>
            <Link href="/faq" style={{fontSize:"10px",color:"#aaa",textDecoration:"none",letterSpacing:"0.03em"}}>FAQ</Link>
          </div>
        </div>
        <Link href="/" style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#888",textDecoration:"none"}}>← Back to home</Link>
      </footer>

    </div>
  )
}
