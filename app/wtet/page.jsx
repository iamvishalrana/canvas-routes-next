'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { User, Mail, Phone, Car, Users, Share2 } from 'lucide-react'
import SiteFooter from '../../components/SiteFooter'

const COUNTRY_CODES = [
  '+1',  '+7',  '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+36',
  '+39', '+40', '+41', '+43', '+44', '+45', '+46', '+47', '+48', '+49',
  '+51', '+52', '+54', '+55', '+56', '+57', '+58', '+60', '+61', '+62',
  '+63', '+64', '+65', '+66', '+81', '+82', '+84', '+86', '+90', '+91',
  '+92', '+94', '+351', '+352', '+353', '+358', '+380', '+420', '+852',
  '+886', '+961', '+962', '+965', '+966', '+968', '+971', '+972', '+973', '+974',
]

const CAR_MAKES = ['Acura','Alfa Romeo','Allard','Aston Martin','Audi','Bentley','BMW','Bugatti','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Koenigsegg','Lamborghini','Land Rover','Lexus','Lincoln','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','Mercury','MINI','Mitsubishi','Nissan','Pagani','Pontiac','Porsche','Ram','Rimac','Rolls-Royce','Subaru','Toyota','Volkswagen','Volvo','Zenvo','Other']

function Chevron() {
  return (
    <svg style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

export default function WtetPage() {
  const [form, setForm] = useState({ name:'', email:'', phone:'', dob_month:'', dob_day:'', dob_year:'', year:'', carMake:'', carModel:'', passengers:'', hasChildren:'', childrenAges:'', source:'', more:'' })
  const [errors, setErrors]       = useState({})
  const [phoneOptOut, setPhoneOptOut] = useState(false)
  const [countryCode, setCountryCode] = useState('+1')
  const [status, setStatus]       = useState(null)
  const [serverError, setServerError] = useState(null)
  const [focusedField, setFocusedField] = useState(null)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [regOpen, setRegOpen]     = useState(true)
  const [closedMsg, setClosedMsg] = useState(null)
  const honeypotRef = useRef(null)

  useEffect(() => {
    fetch('/api/public/settings')
      .then(r => r.json())
      .then(s => {
        if (s.event_registration_open === 'false') setRegOpen(false)
        if (s.event_closed_message) setClosedMsg(s.event_closed_message)
      })
      .catch(() => {})
  }, [])

  function updateForm(field, value) {
    if (field === 'carModel') value = value.replace(/(^|\s)\S/g, c => c.toUpperCase())
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'hasChildren' && value === 'no') next.childrenAges = ''
      return next
    })
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: false }))
    if (serverError) setServerError(null)
  }

  function formatPhone(v, code) {
    const c = code !== undefined ? code : countryCode
    if (c === '+1') {
      const d = v.replace(/\D/g,'').slice(0,10)
      if (d.length <= 3) return d
      if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`
      return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
    }
    return v.replace(/[^\d\s\-()]/g,'').slice(0,20)
  }

  function inputStyle(field) {
    const isFocused = focusedField === field
    const hasError  = !!errors[field]
    const hasValue  = !!form[field]
    let border, background, boxShadow
    if (hasError)       { border='1px solid #7B2032'; background='rgba(123,32,50,0.04)'; boxShadow='none' }
    else if (hasValue)  { border='1px solid #3B6B2F'; background='rgba(59,107,47,0.05)'; boxShadow='none' }
    else if (isFocused) { border='1px solid #c5a882'; background='transparent'; boxShadow='0 0 0 3px rgba(197,168,130,0.2)' }
    else                { border='1px solid rgba(0,0,0,0.2)'; background='transparent'; boxShadow='none' }
    return { width:'100%', padding:'0.9rem 1.2rem', border, background, boxShadow, fontSize:'13px', fontFamily:"var(--font-inter),sans-serif", outline:'none', color:'#1a1a1a', transition:'border-color 0.2s, box-shadow 0.2s, background 0.2s', WebkitAppearance:'none', MozAppearance:'none', appearance:'none' }
  }

  function validate() {
    const e = {}
    if (form.name.trim().length < 2) e.name = true
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = true
    if (!phoneOptOut && (!form.phone.trim() || form.phone.replace(/\D/g,'').length < (countryCode === '+1' ? 10 : 6))) e.phone = true
    if (!form.dob_month) e.dob_month = true
    if (!form.dob_day)   e.dob_day   = true
    if (!form.year)      e.year      = true
    if (!form.carMake)   e.carMake   = true
    if (!form.carModel.trim()) e.carModel = true
    if (!form.passengers)  e.passengers  = true
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
      const order = ['name','email','phone','dob_month','dob_day','year','carMake','carModel','passengers','hasChildren','childrenAges','source']
      const first = order.find(f => errs[f])
      if (first) document.getElementById(`field-${first}`)?.scrollIntoView({ behavior:'smooth', block:'center' })
      return
    }
    setStatus('loading')
    setServerError(null)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch('/api/wtet-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: form.phone ? `${countryCode} ${form.phone}`.trim() : '',
          carModel: [form.carMake, form.carModel].filter(Boolean).join(' '),
          dob: `${form.dob_year || '0000'}-${String(form.dob_month).padStart(2,'0')}-${String(form.dob_day).padStart(2,'0')}`,
          _hp: honeypotRef.current?.value || '',
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus('success')
      } else {
        setServerError(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch (err) {
      clearTimeout(timeout)
      setServerError(err?.name === 'AbortError' ? 'Request timed out. Please check your connection and try again.' : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  const showForm = regOpen && status !== 'success'

  return (
    <div style={{background:"#F5F1EC",fontFamily:"var(--font-inter),sans-serif",color:"#1a1a1a",minHeight:"100vh"}}>
      <style>{`
        @media (max-width: 768px) {
          .wtet-hero { padding: clamp(100px,14vw,160px) 1.25rem 4rem !important; }
          .wtet-details { padding: 3.5rem 1.25rem !important; }
          .wtet-itinerary { padding: 4rem 1.25rem 5rem !important; }
          .wtet-form-section { padding: 3rem 1.25rem 5rem !important; }
          .incl-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
          .reg-box-row { flex-direction: column !important; gap: 0.25rem !important; }
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
        <div className="nav-cta">
          <Link href="/membership" className="nav-join">Membership</Link>
          <Link href="/members/login" className="nav-members">Members Login</Link>
        </div>
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
        <Link href="/membership" onClick={() => setMenuOpen(false)} style={{color:"#0F1E14",fontWeight:"500"}}>Membership</Link>
        <Link href="/members/login" onClick={() => setMenuOpen(false)} style={{color:"#7B2032",fontWeight:"500"}}>Members Login</Link>
      </div>

      {/* HERO */}
      <section className="wtet-hero" style={{background:"#0F1E14",padding:"clamp(140px,18vw,210px) 3rem 6rem",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <Image src="/route-photo.jpg" alt="" fill sizes="100vw" style={{objectFit:"cover",objectPosition:"center 60%",zIndex:0}} priority />
        <div style={{position:"absolute",inset:0,background:"rgba(10,20,12,0.72)",zIndex:1}} />
        <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)",zIndex:2}} />
        <div style={{position:"relative",zIndex:2,fontSize:"11px",letterSpacing:"0.25em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)",marginBottom:"1.2rem"}}>Canvas Routes</div>
        <div style={{position:"relative",zIndex:2}}>
          <h1 style={{fontFamily:"var(--font-cormorant),serif",fontSize:"clamp(3rem,7vw,5.5rem)",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.05",marginBottom:"0.75rem",letterSpacing:"-0.01em"}}>
            Whips to Eastern Townships
          </h1>
          <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"clamp(1.1rem,2.5vw,1.4rem)",fontStyle:"italic",color:"rgba(245,241,236,0.4)",marginBottom:"1.2rem"}}>
            Brossard to Georgeville, QC
          </div>
          <div style={{display:"inline-block",padding:"0.45rem 1.2rem",border:"0.5px solid rgba(197,168,130,0.5)",fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#c5a882",marginBottom:"2.5rem"}}>
            Sunday · July 5, 2026
          </div>
          <div style={{width:"40px",height:"0.5px",background:"rgba(197,168,130,0.5)",margin:"0 auto 2.5rem"}} />
          <p style={{fontSize:"15px",color:"rgba(245,241,236,0.55)",maxWidth:"460px",margin:"0 auto",lineHeight:"1.9",letterSpacing:"0.01em"}}>
            Through wine country, over the mountains, along Chemin des Cantons. Lunch on the lake in Georgeville.
          </p>
        </div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.2),transparent)",zIndex:2}} />
      </section>

      {/* DETAILS */}
      <section className="wtet-details" style={{background:"#EDE8E1",padding:"5rem 3rem"}}>
        <div style={{maxWidth:"680px",margin:"0 auto"}}>
          <div style={{fontSize:"11px",letterSpacing:"0.22em",textTransform:"uppercase",color:"#888",marginBottom:"2rem"}}>Pricing &amp; details</div>

          <div style={{border:"0.5px solid rgba(0,0,0,0.12)",padding:"1.8rem",marginBottom:"1.5rem",background:"#F5F1EC",display:"flex",alignItems:"baseline",gap:"1rem",flexWrap:"wrap"}}>
            <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"3rem",fontWeight:"300",color:"#1a1a1a",lineHeight:"1"}}>$200</div>
            <div style={{fontSize:"13px",color:"#888",letterSpacing:"0.04em"}}>per car — up to 2 people</div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:"1rem",marginBottom:"2.5rem"}}>
            {[
              'We leave Brossard and take the backroads south through wine country to the Dunham area, stopping at Vignoble Domaine du Brésée.',
              'From there we pick up Chemin des Cantons — one of Quebec\'s best driving roads — through Sutton, Glen Sutton, Highwater, Austin, and Magog.',
              'The day ends at Auberge Est Restaurant McGowan in Georgeville with lunch on Lake Memphrémagog.',
              'We leave together, stop together, arrive together. The convoy is part of what makes the day.',
            ].map((note, i) => (
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"0.75rem"}}>
                <div style={{width:"3px",height:"3px",borderRadius:"50%",background:"#c5a882",flexShrink:0,marginTop:"9px"}} />
                <span style={{fontSize:"14px",color:"#555",lineHeight:"1.75"}}>{note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ITINERARY */}
      <section className="wtet-itinerary" style={{background:"#0F1E14",padding:"6rem 2rem 7rem"}}>
        <div style={{maxWidth:"560px",margin:"0 auto"}}>

          <div style={{textAlign:"center",marginBottom:"4rem"}}>
            <div style={{fontSize:"11px",letterSpacing:"0.25em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)",marginBottom:"1.2rem"}}>Canvas Routes · July 5, 2026</div>
            <h2 style={{fontFamily:"var(--font-cormorant),serif",fontSize:"clamp(1.8rem,4vw,2.6rem)",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.1",margin:0}}>What Your Day Looks Like</h2>
            <div style={{width:"30px",height:"0.5px",background:"rgba(197,168,130,0.4)",margin:"1.5rem auto"}} />
          </div>

          {[
            { label:'Meetup', venue:'Quartier Dix 30', address:'Brossard, QC', desc:'The group gathers in the Dix 30 parking lot. Time to walk around, take in each other\'s cars, and get ready for the road.', pays:false },
            { label:'Fuel Stop', venue:'Shell — Bromont Outlets', address:'Bromont, QC', desc:'Fill up before we head into the backroads. Last proper fuel stop before Chemin des Cantons.', pays:false },
            { label:'Vineyard Stop', venue:'Vignoble Domaine du Brésée', address:'Dunham, QC', desc:'A stop in the Eastern Townships wine country. The cars line up outside and we take in the vineyard.', pays:false },
            { label:'Chemin des Cantons', venue:null, address:'Sutton → Glen Sutton → Highwater', desc:'The main event. Winding through the mountains of the Eastern Townships — tight corners, elevation changes, and quiet roads the whole way.', pays:false },
            { label:'Through the Ridge', venue:null, address:'Austin → Magog', desc:'The road opens back up as we come out the other side. Lake Memphrémagog in view as we approach Magog.', pays:false },
            { label:'Group Lunch', venue:'Auberge Est — McGowan Restaurant', address:'Georgeville, QC', desc:'Lunch at the lake. A proper sit-down meal with the whole group before the drive back to Montreal.', pays:true },
          ].map((stop, i, arr) => (
            <div key={i} style={{display:"flex",gap:"1.5rem",padding:"1.75rem 0",borderBottom: i < arr.length-1 ? "0.5px solid rgba(197,168,130,0.1)" : "none"}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:stop.pays?"#c5a882":"rgba(197,168,130,0.35)",flexShrink:0,marginTop:"6px"}} />
              <div style={{flex:1}}>
                <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)",marginBottom:"0.35rem"}}>{stop.label}</div>
                {stop.venue && <div style={{fontSize:"15px",fontWeight:"500",color:"#F5F1EC",marginBottom:"0.2rem",lineHeight:"1.4"}}>{stop.venue}</div>}
                {stop.address && <div style={{fontSize:"12px",color:"rgba(245,241,236,0.35)",marginBottom:"0.65rem",letterSpacing:"0.02em"}}>{stop.address}</div>}
                <div style={{fontSize:"14px",color:"rgba(245,241,236,0.65)",lineHeight:"1.8"}}>
                  {stop.desc}{stop.pays && <span style={{color:"#c5a882",marginLeft:"0.35rem"}}>Included in the fee.</span>}
                </div>
              </div>
            </div>
          ))}

          <div style={{height:"0.5px",background:"rgba(197,168,130,0.15)",margin:"4rem 0"}} />

          <div className="incl-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3rem",marginBottom:"4rem"}}>
            <div>
              <div style={{fontSize:"11px",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)",marginBottom:"1.25rem"}}>What&apos;s included</div>
              {['Group lunch at Auberge Est McGowan in Georgeville','Guided convoy with a lead car the entire route','Access to the private route itinerary page'].map((item, i) => (
                <div key={i} style={{display:"flex",gap:"0.65rem",alignItems:"flex-start",marginBottom:"0.85rem"}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5a9e4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:"2px"}}><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{fontSize:"14px",color:"rgba(245,241,236,0.7)",lineHeight:"1.65"}}>{item}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontSize:"11px",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)",marginBottom:"1.25rem"}}>Not included</div>
              {['Gas — fill up at the Shell in Bromont','Vineyard tastings or purchases at Domaine du Brésée','Any personal food or drinks beyond group lunch'].map((item, i) => (
                <div key={i} style={{display:"flex",gap:"0.65rem",alignItems:"flex-start",marginBottom:"0.85rem"}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(245,241,236,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:"2px"}}><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span style={{fontSize:"14px",color:"rgba(245,241,236,0.45)",lineHeight:"1.65"}}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{border:"0.5px solid rgba(197,168,130,0.25)",padding:"2rem",background:"rgba(197,168,130,0.05)"}}>
            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              <div className="reg-box-row" style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",flexWrap:"wrap",gap:"0.5rem"}}>
                <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)"}}>Price</div>
                <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.6rem",fontWeight:"300",color:"#F5F1EC"}}>$200 <span style={{fontSize:"13px",color:"rgba(245,241,236,0.4)",fontFamily:"var(--font-inter),sans-serif",letterSpacing:"0.02em"}}>per car · up to 2 people</span></div>
              </div>
              <div style={{height:"0.5px",background:"rgba(197,168,130,0.1)"}} />
              <div className="reg-box-row" style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",flexWrap:"wrap",gap:"0.5rem"}}>
                <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)"}}>Registration</div>
                <div style={{fontSize:"11px",letterSpacing:"0.06em",textTransform:"uppercase",color:regOpen?"#c5a882":"rgba(197,168,130,0.5)"}}>{regOpen ? 'Open — scroll down' : 'Closed'}</div>
              </div>
            </div>
          </div>

          <div style={{marginTop:"1.5rem",textAlign:"center"}}>
            <span style={{fontSize:"14px",color:"rgba(245,241,236,0.35)",lineHeight:"1.8"}}>Questions? </span>
            <a href="mailto:info@canvasroutes.com" style={{fontSize:"14px",color:"rgba(197,168,130,0.6)",textDecoration:"underline",textUnderlineOffset:"3px"}}>info@canvasroutes.com</a>
          </div>

        </div>
      </section>

      {/* FORM */}
      <section id="form" className="wtet-form-section" style={{padding:"6rem 2rem 8rem",background:"#F5F1EC"}}>
        <div style={{maxWidth:"560px",margin:"0 auto"}}>

          {/* CLOSED */}
          {!regOpen && status !== 'success' && (
            <div style={{textAlign:"center",padding:"5rem 0"}}>
              <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"1rem"}}>
                {closedMsg || 'Registration is now closed.'}
              </div>
              <div style={{width:"30px",height:"0.5px",background:"#c5a882",margin:"1.2rem auto"}} />
              <p style={{fontSize:"0.9rem",color:"#777",lineHeight:"1.9",maxWidth:"420px",margin:"1.5rem auto"}}>
                Have a question?{' '}
                <a href="mailto:info@canvasroutes.com" style={{color:"#7B5B2E",textDecoration:"underline",textUnderlineOffset:"2px"}}>info@canvasroutes.com</a>
              </p>
            </div>
          )}

          {/* SUCCESS */}
          {status === 'success' && (
            <div style={{textAlign:"center",padding:"5rem 0"}}>
              <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#3B6B2F",marginBottom:"1rem"}}>Application received.</div>
              <div style={{width:"30px",height:"0.5px",background:"#c5a882",margin:"1.2rem auto"}} />
              <p style={{fontSize:"0.9rem",color:"#777",lineHeight:"1.9",maxWidth:"420px",margin:"1.5rem auto 0"}}>
                We&apos;ve received your registration. A confirmation email is on its way from <strong style={{color:"#1a1a1a",fontWeight:"500"}}>jerry@canvasroutes.com</strong> or <strong style={{color:"#1a1a1a",fontWeight:"500"}}>info@canvasroutes.com</strong> — add both to your contacts and check your junk folder if you don&apos;t see it.
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
                  <label htmlFor="field-phone" className="join-label">Phone<Phone size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                  {phoneOptOut ? (
                    <div style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.65rem 0.9rem",background:"rgba(0,0,0,0.03)",border:"0.5px solid rgba(0,0,0,0.1)"}}>
                      <span style={{fontSize:"13px",color:"#aaa",flex:1}}>Phone not provided</span>
                      <button type="button" onClick={() => { setPhoneOptOut(false); setErrors(p => ({...p, phone:undefined})) }} style={{background:"none",border:"none",padding:0,fontSize:"11px",color:"#888",cursor:"pointer",textDecoration:"underline",fontFamily:"var(--font-inter),sans-serif",whiteSpace:"nowrap"}}>Add number</button>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const f = focusedField==='phone', err=!!errors.phone, val=!!form.phone
                        const border = err?'1px solid #7B2032':val?'1px solid #3B6B2F':f?'1px solid #c5a882':'1px solid rgba(0,0,0,0.2)'
                        const bg     = err?'rgba(123,32,50,0.04)':val?'rgba(59,107,47,0.05)':'transparent'
                        const shadow = f&&!err&&!val?'0 0 0 3px rgba(197,168,130,0.2)':'none'
                        return (
                          <div style={{display:"flex",alignItems:"stretch",border,background:bg,boxShadow:shadow,transition:"border-color 0.2s, box-shadow 0.2s, background 0.2s"}}>
                            <div style={{position:"relative",flexShrink:0}}>
                              <select value={countryCode} onChange={e => { setCountryCode(e.target.value); setForm(p=>({...p,phone:''})) }}
                                style={{height:"100%",padding:"0.9rem 1.8rem 0.9rem 0.75rem",border:"none",borderRight:"1px solid rgba(0,0,0,0.1)",background:"transparent",fontSize:"13px",fontFamily:"var(--font-inter),sans-serif",color:"#1a1a1a",cursor:"pointer",outline:"none",WebkitAppearance:"none",appearance:"none",minWidth:"60px"}}>
                                {COUNTRY_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <Chevron />
                            </div>
                            <input id="field-phone" type="tel" placeholder={countryCode==='+1'?"(514) 000-0000":"Phone number"} value={form.phone}
                              onChange={e => updateForm('phone', formatPhone(e.target.value))}
                              style={{flex:1,padding:"0.9rem 1.2rem",border:"none",background:"transparent",fontSize:"13px",fontFamily:"var(--font-inter),sans-serif",outline:"none",color:"#1a1a1a",appearance:"none"}}
                              onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)} />
                          </div>
                        )
                      })()}
                      {errors.phone && <span style={{fontSize:"11px",color:"#7B2032"}}>{countryCode==='+1'?'Please enter a valid 10-digit number':'Please enter a valid phone number'}</span>}
                      <button type="button" onClick={() => { setPhoneOptOut(true); setForm(p=>({...p,phone:''})); setErrors(p=>({...p,phone:undefined})) }} style={{background:"none",border:"none",padding:"0.3rem 0",fontSize:"11px",color:"#aaa",cursor:"pointer",textDecoration:"underline",fontFamily:"var(--font-inter),sans-serif",textAlign:"left"}}>Prefer not to share my number</button>
                    </>
                  )}
                </div>

                {/* Date of birth */}
                <div id="field-dob_month" className="join-form-field" style={{marginBottom:"1rem"}}>
                  <div className="join-label" style={{marginBottom:"0.5rem"}}>Date of birth<span style={{color:"#7B2032",marginLeft:"3px"}}>*</span> <span style={{color:"#888",fontWeight:"300",textTransform:"none",letterSpacing:0,fontSize:"11px"}}>(year optional)</span></div>
                  <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1.2fr",gap:"0.75rem"}}>
                    <div style={{position:"relative"}}>
                      <select value={form.dob_month} onChange={e => updateForm('dob_month', e.target.value)} style={{...inputStyle('dob_month'),cursor:"pointer",paddingRight:"2rem"}}>
                        <option value="">Month</option>
                        {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                      </select><Chevron />
                    </div>
                    <div style={{position:"relative"}}>
                      <select value={form.dob_day} onChange={e => updateForm('dob_day', e.target.value)} style={{...inputStyle('dob_day'),cursor:"pointer",paddingRight:"2rem"}}>
                        <option value="">Day</option>
                        {Array.from({length:31},(_,i)=>i+1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                      </select><Chevron />
                    </div>
                    <div style={{position:"relative"}}>
                      <select value={form.dob_year} onChange={e => updateForm('dob_year', e.target.value)} style={{...inputStyle('dob_year'),cursor:"pointer",paddingRight:"2rem"}}>
                        <option value="">Year</option>
                        {Array.from({length:2015-1945+1},(_,i)=>2015-i).map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </select><Chevron />
                    </div>
                  </div>
                  {(errors.dob_month||errors.dob_day) && <span style={{fontSize:"11px",color:"#7B2032"}}>Month and day are required</span>}
                </div>

                {/* Car year + make */}
                <div className="join-form-row" style={{marginBottom:"1rem"}}>
                  <div className="join-form-field">
                    <label htmlFor="field-year" className="join-label">Year<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                    <div style={{position:"relative"}}>
                      <select id="field-year" value={form.year} onChange={e => updateForm('year', e.target.value)} style={{...inputStyle('year'),cursor:"pointer",paddingRight:"2rem"}}>
                        <option value="">Select year</option>
                        {Array.from({length:2027-1940+1},(_,i)=>2027-i).map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </select><Chevron />
                    </div>
                    {errors.year && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                  </div>
                  <div className="join-form-field">
                    <label htmlFor="field-carMake" className="join-label">Make<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                    <div style={{position:"relative"}}>
                      <select id="field-carMake" value={form.carMake} onChange={e => updateForm('carMake', e.target.value)} style={{...inputStyle('carMake'),cursor:"pointer",paddingRight:"2rem"}}>
                        <option value="">Select make</option>
                        {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select><Chevron />
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
                  <label htmlFor="field-passengers" className="join-label">Passengers<Users size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span> <span style={{color:"#888",fontWeight:"300",textTransform:"none",letterSpacing:0,fontSize:"11px"}}>(including driver)</span></label>
                  <div style={{position:"relative"}}>
                    <select id="field-passengers" value={form.passengers} onChange={e => updateForm('passengers', e.target.value)} style={{...inputStyle('passengers'),cursor:"pointer",paddingRight:"2rem"}}>
                      <option value="">Select</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4+">4+</option>
                    </select><Chevron />
                  </div>
                  {errors.passengers && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                  {(form.passengers==='3'||form.passengers==='4+') && (
                    <div style={{marginTop:"0.6rem",padding:"0.75rem 1rem",border:"0.5px solid rgba(197,168,130,0.35)",background:"rgba(197,168,130,0.05)"}}>
                      <span style={{fontSize:"12px",color:"#7B5B2E",lineHeight:"1.7"}}>Base price covers 2 people. Additional passengers are subject to an extra charge — details will be sent with your confirmation.</span>
                    </div>
                  )}
                </div>

                {/* Children */}
                <div className="join-form-field" style={{marginBottom:"1rem"}}>
                  <div id="field-hasChildren" className="join-label" style={{marginBottom:"0.75rem"}}>Any children attending?<span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></div>
                  <div style={{display:"flex",gap:"1rem"}}>
                    {['Yes','No'].map(v => {
                      const val = v.toLowerCase(), selected = form.hasChildren===val
                      return (
                        <button key={v} type="button" onClick={() => updateForm('hasChildren', val)}
                          style={{flex:1,padding:"0.9rem",border:`1px solid ${selected?'#3B6B2F':errors.hasChildren?'#7B2032':'rgba(0,0,0,0.2)'}`,background:selected?'rgba(59,107,47,0.06)':errors.hasChildren?'rgba(123,32,50,0.03)':'transparent',cursor:"pointer",fontFamily:"var(--font-inter),sans-serif",fontSize:"13px",color:selected?'#3B6B2F':'#1a1a1a',transition:"all 0.2s",letterSpacing:"0.04em"}}>
                          {v}
                        </button>
                      )
                    })}
                  </div>
                  {errors.hasChildren && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                  {form.hasChildren==='yes' && (
                    <div style={{marginTop:"0.75rem",padding:"0.85rem 1rem",border:"0.5px solid rgba(197,168,130,0.4)",background:"rgba(197,168,130,0.08)"}}>
                      <span style={{fontSize:"12px",color:"#7B5B2E",lineHeight:"1.7"}}>Each child attending is an additional charge. We&apos;ll reach out by email with the details after you register.</span>
                    </div>
                  )}
                </div>

                {form.hasChildren==='yes' && (
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
                    <select id="field-source" value={form.source} onChange={e => updateForm('source', e.target.value)} style={{...inputStyle('source'),cursor:"pointer",paddingRight:"2rem"}}>
                      <option value="">Select an option</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Friend / Word of mouth">Friend / Word of mouth</option>
                      <option value="Google">Google</option>
                      <option value="Other">Other</option>
                    </select><Chevron />
                  </div>
                  {errors.source && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                </div>

                {/* More */}
                <div className="join-form-field" style={{marginBottom:"1rem"}}>
                  <label htmlFor="field-more" className="join-label">Tell us more <span style={{color:"#888",fontWeight:"300"}}>(optional)</span></label>
                  <textarea id="field-more" placeholder="Anything you'd like us to know — your car, your passengers, or what excites you about this trip..." value={form.more}
                    onChange={e => updateForm('more', e.target.value)} rows={4} maxLength={500}
                    style={{...inputStyle('more'),resize:"vertical"}}
                    onFocus={() => setFocusedField('more')} onBlur={() => setFocusedField(null)} />
                  <div style={{textAlign:"right",fontSize:"10px",color:"#aaa",marginTop:"0.3rem"}}>{form.more.length}/500</div>
                </div>

                {/* Payment note */}
                <div style={{marginBottom:"2.5rem",padding:"1rem 1.2rem",border:"0.5px solid rgba(0,0,0,0.12)",background:"rgba(197,168,130,0.06)"}}>
                  <div style={{fontSize:"10px",letterSpacing:"0.18em",textTransform:"uppercase",color:"#7B5B2E",marginBottom:"0.4rem"}}>Payment — $200 per car</div>
                  <div style={{fontSize:"13px",color:"#555",lineHeight:"1.7"}}>Payment details will be sent in your confirmation email.</div>
                </div>

                {/* Honeypot */}
                <div style={{display:'none'}} aria-hidden="true">
                  <input ref={honeypotRef} type="text" name="cr_wt_field" tabIndex={-1} autoComplete="off" />
                </div>

                {status==='error' && <div style={{fontSize:"12px",color:"#7B2032",marginBottom:"0.75rem"}}>{serverError}</div>}

                <button type="submit" disabled={status==='loading'}
                  className="btn-push join-submit-btn"
                  style={{display:"block",width:"100%",padding:"1.1rem",fontSize:"11px",letterSpacing:"0.18em",textTransform:"uppercase",cursor:status==='loading'?'wait':'pointer',fontFamily:"var(--font-inter),sans-serif",marginBottom:"1rem"}}>
                  {status==='loading' ? 'Submitting…' : 'Apply — $200 per car'}
                </button>

              </form>
            </>
          )}

        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
