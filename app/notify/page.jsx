'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { User, Mail, Phone, Car, Share2 } from 'lucide-react'
import SiteFooter from '../../components/SiteFooter'
import SiteNav from '../../components/SiteNav'

const COUNTRY_CODES = [
  '+1',  '+7',  '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+36',
  '+39', '+40', '+41', '+43', '+44', '+45', '+46', '+47', '+48', '+49',
  '+51', '+52', '+54', '+55', '+56', '+57', '+58', '+60', '+61', '+62',
  '+63', '+64', '+65', '+66', '+81', '+82', '+84', '+86', '+90', '+91',
  '+92', '+94', '+351', '+352', '+353', '+358', '+380', '+420', '+852',
  '+886', '+961', '+962', '+965', '+966', '+968', '+971', '+972', '+973', '+974',
]

const CAR_MAKES = ['Acura','Alfa Romeo','Allard','Aston Martin','Audi','Bentley','BMW','Bugatti','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Koenigsegg','Lamborghini','Land Rover','Lexus','Lincoln','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','Mercury','MINI','Mitsubishi','Nissan','Pagani','Pontiac','Porsche','Ram','Rimac','Rolls-Royce','Subaru','Toyota','Volkswagen','Volvo','Zenvo','Other']

const INTERESTS = [
  { value: 'cars_coffee', label: 'Cars & Coffee' },
  { value: 'routes', label: 'Routes' },
  { value: 'both', label: 'Both' },
]

function Chevron() {
  return (
    <svg style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

export default function NotifyPage() {
  const [form, setForm] = useState({ name:'', email:'', phone:'', dob_month:'', dob_day:'', dob_year:'', year:'', carMake:'', carModel:'', interest:'', more:'' })
  const [errors, setErrors] = useState({})
  const [phoneOptOut, setPhoneOptOut] = useState(false)
  const [countryCode, setCountryCode] = useState('+1')
  const [status, setStatus] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [focusedField, setFocusedField] = useState(null)
  const honeypotRef = useRef(null)

  function updateForm(field, value) {
    if (field === 'carModel') value = value.replace(/(^|\s)\S/g, c => c.toUpperCase())
    setForm(prev => ({ ...prev, [field]: value }))
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
    const hasError = !!errors[field]
    const hasValue = !!form[field]
    let border, background, boxShadow
    if (hasError) {
      border = '1px solid #93333E'; background = 'rgba(147,51,62,0.04)'; boxShadow = 'none'
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
    if (!phoneOptOut && (!form.phone.trim() || form.phone.replace(/\D/g,'').length < (countryCode === '+1' ? 10 : 6))) e.phone = true
    if (!form.dob_month) e.dob_month = true
    if (!form.dob_day) e.dob_day = true
    if (!form.year) e.year = true
    if (!form.carMake) e.carMake = true
    if (!form.carModel.trim()) e.carModel = true
    if (!form.interest) e.interest = true
    setErrors(e)
    return e
  }

  async function handleSubmit() {
    if (status === 'loading') return
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      const order = ['name','email','phone','dob_month','dob_day','year','carMake','carModel','interest']
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
      const res = await fetch('/api/notify-signup', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          ...form,
          phone: phoneOptOut ? '' : (form.phone ? `${countryCode} ${form.phone}`.trim() : ''),
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
      if (err?.name === 'AbortError') {
        setServerError('Request timed out. Please check your connection and try again.')
      } else {
        setServerError('Something went wrong. Please try again.')
      }
      setStatus('error')
    }
  }

  return (
    <div style={{background:"#F5F1EC",fontFamily:"var(--font-inter),sans-serif",color:"#1a1a1a",minHeight:"100vh"}}>
      <style>{`
        input, select, textarea { font-size: 16px !important; }
        @media (max-width: 768px) {
          .notify-hero { padding: clamp(100px,14vw,160px) 1.25rem 3.5rem !important; }
          .notify-form-section { padding: 3rem 1.25rem 5rem !important; }
        }
      `}</style>

      <SiteNav links={[
        { href: '/',         label: 'Home' },
        { href: '/#events',  label: 'Events' },
        { href: '/#contact', label: 'Contact' },
        { href: '/faq',      label: 'FAQ' },
      ]} />

      {/* HERO */}
      <section className="notify-hero" style={{background:"#0F1E14",padding:"clamp(140px,18vw,210px) 3rem 5rem",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)"}} />
        <div style={{fontSize:"11px",letterSpacing:"0.25em",textTransform:"uppercase",color:"rgba(197,168,130,0.6)",marginBottom:"1.2rem"}}>Canvas Routes</div>
        <h1 style={{fontFamily:"var(--font-cormorant),serif",fontSize:"clamp(2.6rem,6vw,4rem)",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.1",marginBottom:"0.75rem",letterSpacing:"-0.01em"}}>
          Get notified about future events.
        </h1>
        <div style={{width:"40px",height:"0.5px",background:"rgba(197,168,130,0.5)",margin:"1.5rem auto"}} />
        <p style={{fontSize:"15px",color:"rgba(245,241,236,0.6)",maxWidth:"460px",margin:"0 auto 1rem",lineHeight:"1.9"}}>
          We&rsquo;ll email you when new meets and routes are announced — no membership required.
        </p>
        <p style={{fontSize:"13px",color:"#c5a882",maxWidth:"440px",margin:"0 auto",lineHeight:"1.8"}}>
          Priority for events is always given to Canvas Routes members — non-member spots are limited.
        </p>
        <div style={{marginTop:"2rem"}}>
          <Link href="/membership" style={{fontSize:"12px",letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(197,168,130,0.75)",textDecoration:"underline",textUnderlineOffset:"3px"}}>Or become a member instead →</Link>
        </div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.2),transparent)"}} />
      </section>

      {/* FORM */}
      <section className="notify-form-section" style={{padding:"5rem 2rem 8rem",background:"#F5F1EC"}}>
        <div style={{maxWidth:"560px",margin:"0 auto"}}>

          {status === 'success' ? (
            <div style={{textAlign:"center",padding:"5rem 0"}}>
              <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#3B6B2F",marginBottom:"1rem"}}>You&rsquo;re on the list.</div>
              <div style={{width:"30px",height:"0.5px",background:"#c5a882",margin:"1.2rem auto"}} />
              <p style={{fontSize:"0.9rem",color:"#777",lineHeight:"1.9",maxWidth:"420px",margin:"1.5rem auto 0"}}>
                We&rsquo;ll email you at <strong style={{color:"#1a1a1a",fontWeight:"500"}}>{form.email}</strong> when new events go live. Remember — members get priority.
              </p>
              <div style={{marginTop:"2rem"}}>
                <Link href="/" style={{fontSize:"12px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#8A6535",textDecoration:"underline",textUnderlineOffset:"3px"}}>Back to homepage</Link>
              </div>
            </div>
          ) : (
            <>
              <div style={{textAlign:"center",marginBottom:"3rem"}}>
                <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"0.5rem"}}>Tell us a bit about you</div>
                <div style={{width:"30px",height:"0.5px",background:"#c5a882",margin:"1.2rem auto 0"}} />
              </div>

              <form onSubmit={e => { e.preventDefault(); handleSubmit() }} noValidate>

                {/* Name + Email */}
                <div className="join-form-row" style={{marginBottom:"1rem"}}>
                  <div className="join-form-field">
                    <label htmlFor="field-name" className="join-label">Full name<User size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#93333E",marginLeft:"3px"}}>*</span></label>
                    <input id="field-name" type="text" name="name" autoComplete="name" inputMode="text" placeholder="Your full name" value={form.name} maxLength={100}
                      onChange={e => updateForm('name', e.target.value)} style={inputStyle('name')}
                      onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} />
                    {errors.name && <span style={{fontSize:"11px",color:"#93333E"}}>Required</span>}
                  </div>
                  <div className="join-form-field">
                    <label htmlFor="field-email" className="join-label">Email<Mail size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#93333E",marginLeft:"3px"}}>*</span></label>
                    <input id="field-email" type="email" name="email" autoComplete="email" inputMode="email" placeholder="Your email" value={form.email}
                      onChange={e => updateForm('email', e.target.value)} style={inputStyle('email')}
                      onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} />
                    {errors.email && <span style={{fontSize:"11px",color:"#93333E"}}>Valid email required</span>}
                  </div>
                </div>

                {/* Phone */}
                <div className="join-form-field" style={{marginBottom:"1rem"}}>
                  <label htmlFor="field-phone" className="join-label">Phone number<Phone size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#93333E",marginLeft:"3px"}}>*</span></label>
                  {phoneOptOut ? (
                    <div style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.65rem 0.9rem",background:"rgba(0,0,0,0.03)",border:"0.5px solid rgba(0,0,0,0.1)"}}>
                      <span style={{fontSize:"13px",color:"#aaa",flex:1}}>Phone not provided</span>
                      <button type="button" onClick={() => { setPhoneOptOut(false); setErrors(p => ({...p, phone: undefined})) }} style={{background:"none",border:"none",padding:0,fontSize:"11px",color:"#888",cursor:"pointer",textDecoration:"underline",fontFamily:"var(--font-inter),sans-serif",whiteSpace:"nowrap"}}>Add number</button>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const isFocused = focusedField === 'phone'
                        const hasError = !!errors.phone
                        const hasValue = !!form.phone
                        let border, background, boxShadow
                        if (hasError) {
                          border = '1px solid #93333E'; background = 'rgba(147,51,62,0.04)'; boxShadow = 'none'
                        } else if (hasValue) {
                          border = '1px solid #3B6B2F'; background = 'rgba(59,107,47,0.05)'; boxShadow = 'none'
                        } else if (isFocused) {
                          border = '1px solid #c5a882'; background = 'transparent'; boxShadow = '0 0 0 3px rgba(197,168,130,0.2)'
                        } else {
                          border = '1px solid rgba(0,0,0,0.2)'; background = 'transparent'; boxShadow = 'none'
                        }
                        return (
                          <div style={{display:"flex",alignItems:"stretch",border,background,boxShadow,transition:"border-color 0.2s, box-shadow 0.2s, background 0.2s"}}>
                            <div style={{position:"relative",flexShrink:0}}>
                              <select
                                name="tel-country-code" autoComplete="off"
                                value={countryCode}
                                onChange={e => { setCountryCode(e.target.value); setForm(p => ({...p, phone:''})) }}
                                style={{height:"100%",padding:"0.9rem 1.8rem 0.9rem 0.75rem",border:"none",borderRight:"1px solid rgba(0,0,0,0.1)",background:"transparent",fontSize:"13px",fontFamily:"var(--font-inter),sans-serif",color:"#1a1a1a",cursor:"pointer",outline:"none",WebkitAppearance:"none",MozAppearance:"none",appearance:"none",minWidth:"60px"}}
                              >
                                {COUNTRY_CODES.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                              <Chevron />
                            </div>
                            <input id="field-phone" type="tel" name="tel" autoComplete="tel-national" placeholder={countryCode === '+1' ? "(514) 000-0000" : "Phone number"} value={form.phone}
                              onChange={e => updateForm('phone', formatPhone(e.target.value))} style={{flex:1,padding:"0.9rem 1.2rem",border:"none",background:"transparent",fontSize:"13px",fontFamily:"var(--font-inter),sans-serif",outline:"none",color:"#1a1a1a",WebkitAppearance:"none",MozAppearance:"none",appearance:"none"}}
                              onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)} />
                          </div>
                        )
                      })()}
                      {errors.phone && <span style={{fontSize:"11px",color:"#93333E"}}>{countryCode === '+1' ? 'Please enter a valid 10-digit number' : 'Please enter a valid phone number'}</span>}
                      <button type="button" onClick={() => { setPhoneOptOut(true); setForm(p => ({...p, phone:''})); setErrors(p => ({...p, phone: undefined})) }} style={{background:"none",border:"none",padding:"0.3rem 0",fontSize:"11px",color:"#aaa",cursor:"pointer",textDecoration:"underline",fontFamily:"var(--font-inter),sans-serif",textAlign:"left"}}>Prefer not to share my number</button>
                    </>
                  )}
                </div>

                {/* Date of birth */}
                <div id="field-dob_month" className="join-form-field" style={{marginBottom:"1rem"}}>
                  <div className="join-label" style={{marginBottom:"0.5rem"}}>Date of birth<span style={{color:"#93333E",marginLeft:"3px"}}>*</span> <span style={{color:"#888",fontWeight:"300",textTransform:"none",letterSpacing:0,fontSize:"11px"}}>(year optional)</span></div>
                  <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1.2fr",gap:"0.75rem"}}>
                    <div style={{position:"relative"}}>
                      <select name="bday-month" autoComplete="bday-month" value={form.dob_month} onChange={e => updateForm('dob_month', e.target.value)}
                        style={{...inputStyle('dob_month'), cursor:"pointer", paddingRight:"2rem"}}>
                        <option value="">Month</option>
                        {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i) => (
                          <option key={i+1} value={String(i+1)}>{m}</option>
                        ))}
                      </select>
                      <Chevron />
                    </div>
                    <div style={{position:"relative"}}>
                      <select name="bday-day" autoComplete="bday-day" value={form.dob_day} onChange={e => updateForm('dob_day', e.target.value)}
                        style={{...inputStyle('dob_day'), cursor:"pointer", paddingRight:"2rem"}}>
                        <option value="">Day</option>
                        {Array.from({length:31},(_,i)=>i+1).map(d => (
                          <option key={d} value={String(d)}>{d}</option>
                        ))}
                      </select>
                      <Chevron />
                    </div>
                    <div style={{position:"relative"}}>
                      <select name="bday-year" autoComplete="bday-year" value={form.dob_year} onChange={e => updateForm('dob_year', e.target.value)}
                        style={{...inputStyle('dob_year'), cursor:"pointer", paddingRight:"2rem"}}>
                        <option value="">Year</option>
                        {Array.from({length:2015-1945+1},(_,i)=>2015-i).map(y => (
                          <option key={y} value={String(y)}>{y}</option>
                        ))}
                      </select>
                      <Chevron />
                    </div>
                  </div>
                  {(errors.dob_month || errors.dob_day) && <span style={{fontSize:"11px",color:"#93333E"}}>Month and day are required</span>}
                </div>

                {/* Year + Make */}
                <div className="join-form-row" style={{marginBottom:"1rem"}}>
                  <div className="join-form-field">
                    <label htmlFor="field-year" className="join-label">Year<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#93333E",marginLeft:"3px"}}>*</span></label>
                    <div style={{position:"relative"}}>
                      <select id="field-year" autoComplete="off" value={form.year} onChange={e => updateForm('year', e.target.value)}
                        style={{...inputStyle('year'), cursor:"pointer", paddingRight:"2rem"}}>
                        <option value="">Select year</option>
                        {Array.from({length:2027-1940+1},(_,i)=>2027-i).map(y=>(
                          <option key={y} value={String(y)}>{y}</option>
                        ))}
                      </select>
                      <Chevron />
                    </div>
                    {errors.year && <span style={{fontSize:"11px",color:"#93333E"}}>Required</span>}
                  </div>
                  <div className="join-form-field">
                    <label htmlFor="field-carMake" className="join-label">Make<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#93333E",marginLeft:"3px"}}>*</span></label>
                    <div style={{position:"relative"}}>
                      <select id="field-carMake" autoComplete="off" value={form.carMake} onChange={e => updateForm('carMake', e.target.value)}
                        style={{...inputStyle('carMake'), cursor:"pointer", paddingRight:"2rem"}}>
                        <option value="">Select make</option>
                        {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <Chevron />
                    </div>
                    {errors.carMake && <span style={{fontSize:"11px",color:"#93333E"}}>Required</span>}
                  </div>
                </div>

                {/* Model */}
                <div className="join-form-field" style={{marginBottom:"1rem"}}>
                  <label htmlFor="field-carModel" className="join-label">Model<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#93333E",marginLeft:"3px"}}>*</span></label>
                  <input id="field-carModel" type="text" name="car-model" autoComplete="off" placeholder="e.g. 911 Carrera S" value={form.carModel} maxLength={100}
                    onChange={e => updateForm('carModel', e.target.value)} style={inputStyle('carModel')}
                    onFocus={() => setFocusedField('carModel')} onBlur={() => setFocusedField(null)} />
                  {errors.carModel && <span style={{fontSize:"11px",color:"#93333E"}}>Required</span>}
                </div>

                {/* Interested in */}
                <div className="join-form-field" style={{marginBottom:"1rem"}}>
                  <div id="field-interest" className="join-label" style={{marginBottom:"0.75rem"}}>What are you interested in?<Share2 size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#93333E",marginLeft:"3px"}}>*</span></div>
                  <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
                    {INTERESTS.map(({ value, label }) => {
                      const selected = form.interest === value
                      return (
                        <button key={value} type="button" onClick={() => updateForm('interest', value)}
                          style={{flex:"1 1 120px",padding:"0.9rem",border:`1px solid ${selected?'#3B6B2F':errors.interest?'#93333E':'rgba(0,0,0,0.2)'}`,background:selected?'rgba(59,107,47,0.06)':errors.interest?'rgba(147,51,62,0.03)':'transparent',cursor:"pointer",fontFamily:"var(--font-inter),sans-serif",fontSize:"13px",color:selected?'#3B6B2F':'#1a1a1a',transition:"all 0.2s",letterSpacing:"0.02em"}}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  {errors.interest && <span style={{fontSize:"11px",color:"#93333E"}}>Please choose one</span>}
                </div>

                {/* Tell us more */}
                <div className="join-form-field" style={{marginBottom:"2rem"}}>
                  <label htmlFor="field-more" className="join-label">Tell us more <span style={{color:"#888",fontWeight:"300"}}>(optional)</span></label>
                  <textarea id="field-more" placeholder="Anything you'd like us to know — your car, what excites you about Canvas Routes..." value={form.more}
                    onChange={e => updateForm('more', e.target.value)} rows={4} maxLength={500}
                    style={{...inputStyle('more'), resize:"vertical"}}
                    onFocus={() => setFocusedField('more')} onBlur={() => setFocusedField(null)} />
                  <div style={{textAlign:"right",fontSize:"10px",color:"#aaa",marginTop:"0.3rem"}}>{form.more.length}/500</div>
                </div>

                {/* Honeypot */}
                <div style={{display:'none'}} aria-hidden="true">
                  <input ref={honeypotRef} type="text" name="cr_notify_field" tabIndex={-1} autoComplete="off" />
                </div>

                <button type="submit" disabled={status === 'loading'}
                  style={{display:"block",width:"100%",padding:"1.1rem",fontSize:"11px",letterSpacing:"0.18em",textTransform:"uppercase",cursor:status==='loading'?'wait':'pointer',fontFamily:"var(--font-inter),sans-serif",marginBottom:"1rem",background:"transparent",border:"1px solid #45643c",color:"#45643c",transition:"background 0.2s, color 0.2s"}}
                  onMouseEnter={e => { e.currentTarget.style.background = '#45643c'; e.currentTarget.style.color = '#F5F1EC' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#45643c' }}>
                  {status === 'loading' ? 'Signing up…' : 'Notify Me'}
                </button>
                {status === 'error' && <div style={{fontSize:"12px",color:"#93333E",textAlign:"center",marginBottom:"0.5rem"}}>{serverError}</div>}

              </form>
            </>
          )}

        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
