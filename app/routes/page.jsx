'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { User, Mail, Phone, Car, Users, Share2 } from 'lucide-react'

const ROUTES_LAUNCH = new Date('2026-05-13T23:00:00Z').getTime() // 7 PM EDT

function Chevron() {
  return (
    <svg style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

const INCLUDED = [
  { title: 'Welcome gift for your car', sub: 'A handpicked keepsake from us, waiting for you at the start.' },
  { title: 'Premium breakfast in Montreal', sub: 'The best way to start a drive — a leisurely breakfast before the road opens up.' },
  { title: 'Cars, Coffee & Horology stop', sub: 'A handpicked midway stop — coffee, a snack, fine watches, and great cars.' },
  { title: 'Full media coverage', sub: 'Photo and video coverage of the full event — shared with the group.' },
  { title: 'Stroll the village at Tremblant', sub: 'Time to decompress in the pedestrian village — wander, explore, and take in the mountain scenery on foot.' },
  { title: 'Artisanal lunch in the Laurentians', sub: 'Hand-picked and worth the drive — great food, great setting, earned after a morning on the backroads.' },
  { title: 'Evening send-off', sub: 'After driving back to Montreal, we close out the day together — one last stop before everyone heads their separate ways.' },
]

export default function RoutesPage() {
  const [launched, setLaunched] = useState(false)
  const [soldOut, setSoldOut] = useState(false)
  const [checking, setChecking] = useState(true)
  const [form, setForm] = useState({ name:'', email:'', phone:'', year:'', carModel:'', passengers:'', hasChildren:'', childrenAges:'', source:'', more:'' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [focusedField, setFocusedField] = useState(null)
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
    fetch('/api/routes')
      .then(r => r.json())
      .then(d => { if (d.soldOut) setSoldOut(true) })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
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
    if (!form.phone.trim() || form.phone.replace(/\D/g,'').length < 10) e.phone = true
    if (!form.year) e.year = true
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
      const order = ['name','email','phone','year','carModel','passengers','hasChildren','childrenAges','source']
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
        body: JSON.stringify({ ...form, _hp: honeypotRef.current?.value || '' }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus('success')
      } else if (data.soldOut) {
        setSoldOut(true); setStatus(null)
      } else {
        setServerError(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      clearTimeout(timeout)
      setServerError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  const showForm = launched && !soldOut && !checking && status !== 'success'

  return (
    <div style={{background:"#F5F1EC",fontFamily:"var(--font-inter),sans-serif",color:"#1a1a1a",minHeight:"100vh"}}>

      {/* NAV */}
      <nav className="nav">
        <Link href="/">
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="nav-logo" />
        </Link>
        <div className="nav-links">
          <Link href="/" style={{color:"#555",textDecoration:"none"}}>Home</Link>
          <Link href="/#events" style={{color:"#555",textDecoration:"none"}}>Events</Link>
          <Link href="/#contact" style={{color:"#555",textDecoration:"none"}}>Contact</Link>
        </div>
        <Link href="/#join" className="nav-join">Join</Link>
      </nav>

      {/* HERO */}
      <section style={{background:"#0F1E14",padding:"clamp(140px,18vw,210px) 3rem 6rem",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)"}} />
        <div style={{fontSize:"10px",letterSpacing:"0.28em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)",marginBottom:"1.2rem"}}>Canvas Routes · 31 May 2026</div>
        <h1 style={{fontFamily:"var(--font-cormorant),serif",fontSize:"clamp(3rem,7vw,5.5rem)",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.05",marginBottom:"0.75rem",letterSpacing:"-0.01em"}}>
          Into the Laurentians
        </h1>
        <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"clamp(1.1rem,2.5vw,1.4rem)",fontStyle:"italic",color:"rgba(245,241,236,0.4)",marginBottom:"2.5rem"}}>
          Mont-Tremblant, QC
        </div>
        <div style={{width:"40px",height:"0.5px",background:"rgba(197,168,130,0.5)",margin:"0 auto 2.5rem"}} />
        <p style={{fontSize:"0.9rem",color:"rgba(245,241,236,0.55)",maxWidth:"460px",margin:"0 auto",lineHeight:"1.9",letterSpacing:"0.02em"}}>
          A drive through the heart of Quebec&apos;s Laurentians. Hand-picked roads, good company, and a day you won&apos;t forget.
        </p>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.2),transparent)"}} />
      </section>

      {/* DETAILS — What's Included + Pricing */}
      <section style={{background:"#EDE8E1",padding:"5rem 3rem"}}>
        <div style={{maxWidth:"860px",margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5rem",alignItems:"stretch"}}>

          {/* PRICING + NOTES */}
          <div>
            <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"#888",marginBottom:"1.5rem"}}>Pricing &amp; details</div>

            {/* Price block */}
            <div style={{border:"0.5px solid rgba(0,0,0,0.12)",padding:"1.8rem",marginBottom:"1.5rem",background:"#F5F1EC"}}>
              <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"3rem",fontWeight:"300",color:"#1a1a1a",lineHeight:"1",marginBottom:"0.4rem"}}>$200</div>
              <div style={{fontSize:"11px",letterSpacing:"0.12em",textTransform:"uppercase",color:"#7B5B2E"}}>per car · 2 people included</div>
            </div>

            {/* Notes */}
            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              {[
                'Personal photography of your car on the route by our photographer.',
                'Driver-focused cars only — this route is built for cars that were made to be driven.',
                'Convoy-style drive — we roll together as a group.',
                'Backroads all the way to Mont-Tremblant — the kind where your car finally gets to breathe and you actually get to enjoy it.',
                'We drive in style, not speed. This is not a race.',
                'Gas and $30 VIP parking available, at your cost.',
                'This trip is a preview of what Canvas Routes membership offers — this is just the tasting menu.',
                'All future road trips will be exclusive to members. This is your way in — to be around like-minded people who take cars seriously.',
              ].map((note, i) => (
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"0.75rem"}}>
                  <div style={{width:"3px",height:"3px",borderRadius:"50%",background:"#c5a882",flexShrink:0,marginTop:"8px"}} />
                  <span style={{fontSize:"0.85rem",color:"#555",lineHeight:"1.7"}}>{note}</span>
                </div>
              ))}
            </div>

          </div>

          {/* WHAT'S INCLUDED */}
          <div>
            <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"#888",marginBottom:"1.5rem"}}>What&apos;s included</div>
            <div style={{display:"flex",flexDirection:"column",gap:"0"}}>
              {INCLUDED.map((item, i) => (
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"1.2rem",padding:"1rem 0",borderBottom:"0.5px solid rgba(0,0,0,0.07)"}}>
                  <div style={{width:"5px",height:"5px",background:"rgba(197,168,130,0.75)",flexShrink:0,marginTop:"6px"}} />
                  <div>
                    <div style={{fontSize:"0.875rem",color:"#1a1a1a",lineHeight:"1.5",letterSpacing:"0.01em",fontWeight:"500",marginBottom:"0.2rem"}}>{item.title}</div>
                    <div style={{fontSize:"0.8rem",color:"#888",lineHeight:"1.6"}}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{gridColumn:"1 / -1",textAlign:"center",paddingTop:"2.5rem",borderTop:"0.5px solid rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:"11px",letterSpacing:"0.16em",textTransform:"uppercase",color:"#7B2032"}}>Spots are limited &nbsp;·&nbsp; Selection is curated.</div>
          </div>

        </div>
      </section>

      {/* FORM SECTION */}
      <section id="form" style={{padding:"6rem 2rem 8rem",background:"#F5F1EC"}}>
        <div style={{maxWidth:"560px",margin:"0 auto"}}>

          {/* PRE-LAUNCH */}
          {!launched && (
            <div style={{textAlign:"center",padding:"5rem 0"}}>
              <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"1rem"}}>Registration opens tonight</div>
              <div style={{width:"30px",height:"0.5px",background:"#c5a882",margin:"1.2rem auto"}} />
              <p style={{fontSize:"0.9rem",color:"#777",lineHeight:"1.9",maxWidth:"380px",margin:"0 auto"}}>
                Spots are limited. Registration opens at 7 PM Eastern — check back then to apply.
              </p>
            </div>
          )}

          {/* SOLD OUT */}
          {launched && soldOut && (
            <div style={{textAlign:"center",padding:"5rem 0"}}>
              <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"1rem"}}>Registration Closed</div>
              <div style={{width:"30px",height:"0.5px",background:"#c5a882",margin:"1.2rem auto"}} />
              <p style={{fontSize:"0.9rem",color:"#777",lineHeight:"1.9",maxWidth:"380px",margin:"1.5rem auto 0"}}>
                All spots have been claimed. Follow us on{' '}
                <a href="https://www.instagram.com/canvasroutes?igsh=MWs0encwMTY4cnFyeA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" style={{color:"#7B2032",textDecoration:"none"}}>Instagram</a>
                {' '}to be the first to hear about future events.
              </p>
            </div>
          )}

          {/* SUCCESS */}
          {launched && !soldOut && status === 'success' && (
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
                  <input id="field-phone" type="tel" placeholder="(514) 000-0000" value={form.phone}
                    onChange={e => updateForm('phone', formatPhone(e.target.value))} style={inputStyle('phone')}
                    onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)} />
                  {errors.phone && <span style={{fontSize:"11px",color:"#7B2032"}}>Please enter a valid 10-digit number</span>}
                </div>

                {/* Year + Make & Model */}
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
                    <label htmlFor="field-carModel" className="join-label">Make &amp; Model<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                    <input id="field-carModel" type="text" placeholder="e.g. Porsche 911" value={form.carModel} maxLength={100}
                      onChange={e => updateForm('carModel', e.target.value)} style={inputStyle('carModel')}
                      onFocus={() => setFocusedField('carModel')} onBlur={() => setFocusedField(null)} />
                    {errors.carModel && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                  </div>
                </div>

                {/* Passengers */}
                <div className="join-form-field" style={{marginBottom:"1rem"}}>
                  <label htmlFor="field-passengers" className="join-label">Number of passengers<Users size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
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
                <p style={{fontSize:"10px",color:"#aaa",lineHeight:"1.8",textAlign:"center",marginTop:"0.5rem"}}>
                  Full event details will be sent upon confirmation.
                </p>

              </form>
            </>
          )}

        </div>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:"0.5px solid rgba(0,0,0,0.12)",padding:"2rem 3rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem",background:"#F5F1EC"}}>
        <div style={{fontSize:"11px",color:"#888",letterSpacing:"0.05em"}}>© 2026 Canvas Routes. Montreal, QC.</div>
        <Link href="/" style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#888",textDecoration:"none"}}>← Back to home</Link>
      </footer>

    </div>
  )
}
