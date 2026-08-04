import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Receipt,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Users,
  Star,
  Clock,
  Loader2,
  CheckCircle2,
  Building2,
} from 'lucide-react'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'
import { apiClient } from '../../api/axios'

/* ---------------------------------- tokens --------------------------------- */

const c = {
  ink: '#0B0B0C',
  paper: '#FAF9F6',
  line: '#DDD8CF',
  lineDark: '#2A2A2C',
  muted: '#7A756D',
  mutedLight: '#B7B2AA',
  red: '#E11D2E',
  redSoft: '#FF4657',
  redDeep: '#7A0E1C',
}

const revenueData = [
  { m: 'Feb', v: 62 },
  { m: 'Mar', v: 78 },
  { m: 'Apr', v: 71 },
  { m: 'May', v: 94 },
  { m: 'Jun', v: 88 },
  { m: 'Jul', v: 121 },
]

const testimonials = [
  {
    initials: 'JM',
    name: 'James Ito',
    role: 'CFO, Northwind Freight',
    quote:
      'We cut our average collection time from 41 days to 12. Redline paid for itself in the first billing cycle.',
  },
  {
    initials: 'AS',
    name: 'Aria Sol',
    role: 'Controller, Vantage Retail',
    quote: 'Automated reminders alone recovered $80K in overdue invoices in the first month.',
  },
  {
    initials: 'DK',
    name: 'Derek Kwan',
    role: 'Finance Lead, Circuit Labs',
    quote: 'One ledger everyone trusts. No more reconciling five spreadsheets before a close.',
  },
]

/* ------------------------------- global styles ------------------------------ */

const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    * { box-sizing: border-box; }
    .font-display { font-family: 'Archivo Black', 'Inter', sans-serif; }
    .font-mono { font-family: 'IBM Plex Mono', monospace; }

    .ledger-input { border: none; background: transparent; }
    .ledger-input:focus { outline: none; }
    .underline-track { position: relative; }
    .underline-base { position: absolute; left: 0; right: 0; bottom: 0; height: 1.5px; background: currentColor; opacity: .35; }
    .underline-active {
      position: absolute; left: 0; bottom: 0; height: 1.5px; width: 0%;
      background: ${c.red}; transition: width .35s cubic-bezier(.4,0,.2,1);
    }
    .underline-track:focus-within .underline-active { width: 100%; }

    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    @keyframes stampIn {
      0% { transform: rotate(-10deg) scale(0.8); opacity: 0; }
      60% { transform: rotate(-8deg) scale(1.06); opacity: 1; }
      100% { transform: rotate(-8deg) scale(1); opacity: 1; }
    }
    .stamp { animation: stampIn .6s ease-out .3s both; }

    @keyframes floatSlow {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    .float-slow { animation: floatSlow 5s ease-in-out infinite; }

    @keyframes fadeUp {
      0% { opacity: 0; transform: translateY(14px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .reveal { opacity: 0; animation: fadeUp .7s cubic-bezier(.2,.7,.2,1) forwards; }
    .reveal-1 { animation-delay: .05s; }
    .reveal-2 { animation-delay: .15s; }
    .reveal-3 { animation-delay: .25s; }
    .reveal-4 { animation-delay: .35s; }
    .reveal-5 { animation-delay: .45s; }
    .reveal-6 { animation-delay: .55s; }

    @keyframes popIn { 0% { opacity: 0; transform: scale(.9); } 100% { opacity: 1; transform: scale(1); } }
    .pop-in { animation: popIn .3s ease-out both; }

    @keyframes checkPulse {
      0% { transform: scale(.6); opacity: 0; }
      60% { transform: scale(1.12); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    .check-pulse { animation: checkPulse .4s cubic-bezier(.34,1.56,.64,1) both; }

    .press-scale { transition: transform .15s ease, box-shadow .15s ease; }
    .press-scale:active { transform: scale(.97); }

    .lift { transition: transform .25s ease, box-shadow .25s ease; }
    .lift:hover { transform: translateY(-3px); }

    .tilt-card { transition: transform .2s ease-out; transform-style: preserve-3d; }

    @media (prefers-reduced-motion: reduce) {
      .stamp, .float-slow, .reveal, .pop-in, .check-pulse { animation: none !important; opacity: 1 !important; transform: none !important; }
      .press-scale:active, .lift:hover, .tilt-card { transform: none !important; }
    }
  `}</style>
)

/* --------------------------------- hooks --------------------------------- */

function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= breakpoint : true,
  )
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= breakpoint)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isDesktop
}

function useCountUp(end, { decimals = 0, duration = 1300 } = {}) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf
    let start
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(end * eased)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [end, duration])
  return value.toFixed(decimals)
}

/* ------------------------------- small pieces ------------------------------ */

function StatChip({ icon, end, decimals = 0, prefix = '', suffix = '', label, dark, delay }) {
  const val = useCountUp(end, { decimals })
  const formatted = decimals > 0 ? val : Number(val).toLocaleString()
  return (
    <div
      className={`reveal ${delay || ''} lift flex items-center gap-2.5 px-3.5 py-2.5 rounded-md shrink-0 cursor-default`}
      style={{
        backgroundColor: dark ? 'rgba(255,255,255,0.04)' : c.paper,
        border: `1px solid ${dark ? c.lineDark : c.line}`,
      }}
    >
      <span style={{ color: c.red }}>{icon}</span>
      <div className="leading-tight">
        <p className="font-mono text-xs font-semibold" style={{ color: dark ? c.paper : c.ink }}>
          {prefix}
          {formatted}
          {suffix}
        </p>
        <p className="text-[10px]" style={{ color: dark ? c.mutedLight : c.muted }}>
          {label}
        </p>
      </div>
    </div>
  )
}

function InvoiceIllustration({ size = 220 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="120" cy="120" r="118" fill="url(#glow)" />
      <defs>
        <radialGradient id="glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={c.red} stopOpacity="0.18" />
          <stop offset="100%" stopColor={c.red} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="translate(52,58) rotate(-8)">
        <rect x="0" y="0" width="110" height="140" rx="4" fill="#1E1E20" stroke="#333335" />
        <rect x="14" y="18" width="60" height="6" rx="2" fill="#3A3A3C" />
        <rect x="14" y="34" width="82" height="4" rx="2" fill="#2B2B2D" />
        <rect x="14" y="44" width="82" height="4" rx="2" fill="#2B2B2D" />
        <rect x="14" y="54" width="60" height="4" rx="2" fill="#2B2B2D" />
      </g>
      <g transform="translate(70,46) rotate(6)">
        <rect x="0" y="0" width="118" height="150" rx="4" fill={c.paper} stroke={c.line} />
        <rect x="16" y="18" width="50" height="8" rx="2" fill={c.ink} />
        <circle cx="98" cy="22" r="9" fill={c.red} />
        <rect x="16" y="40" width="86" height="3" rx="1.5" fill={c.line} />
        <rect x="16" y="50" width="86" height="3" rx="1.5" fill={c.line} />
        <rect x="16" y="60" width="60" height="3" rx="1.5" fill={c.line} />
        <rect x="16" y="82" width="86" height="1" fill={c.line} strokeDasharray="3 3" />
        <rect x="16" y="104" width="8" height="24" rx="1.5" fill={c.line} />
        <rect x="28" y="96" width="8" height="32" rx="1.5" fill={c.line} />
        <rect x="40" y="86" width="8" height="42" rx="1.5" fill={c.redSoft} />
        <rect x="52" y="100" width="8" height="28" rx="1.5" fill={c.line} />
        <rect x="64" y="78" width="8" height="50" rx="1.5" fill={c.red} />
        <rect x="16" y="138" width="40" height="6" rx="2" fill={c.ink} />
      </g>
      <g className="float-slow">
        <path
          d="M150 150 L170 128 L190 138 L214 100"
          stroke={c.red}
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M198 98 L214 100 L212 116"
          stroke={c.red}
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

function MiniChart() {
  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={revenueData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.red} stopOpacity={0.5} />
              <stop offset="100%" stopColor={c.red} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ stroke: c.redSoft, strokeWidth: 1 }}
            contentStyle={{
              background: c.ink,
              border: `1px solid ${c.lineDark}`,
              borderRadius: 4,
              fontSize: 11,
            }}
            labelStyle={{ color: c.mutedLight, fontFamily: 'IBM Plex Mono, monospace' }}
            itemStyle={{ color: c.paper, fontFamily: 'IBM Plex Mono, monospace' }}
            formatter={(v) => [`$${(v * 1000).toLocaleString()}`, 'Collected']}
          />
          <Area type="monotone" dataKey="v" stroke={c.redSoft} strokeWidth={2} fill="url(#rev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function TiltInvoiceCard() {
  const ref = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const onMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    setTilt({ x: py * -8, y: px * 10 })
  }, [])
  const onLeave = () => setTilt({ x: 0, y: 0 })

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="tilt-card relative rounded-md p-5 cursor-default"
      style={{
        backgroundColor: c.paper,
        boxShadow: '0 20px 40px -12px rgba(0,0,0,0.6)',
        transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      }}
    >
      <div
        className="stamp absolute -top-3 -right-3 font-display text-[9px] tracking-widest px-2.5 py-1 rounded-sm border-2"
        style={{ borderColor: c.red, color: c.red, backgroundColor: c.paper }}
      >
        PAST DUE
      </div>
      <p className="font-mono text-[10px]" style={{ color: c.muted }}>
        INV-004821
      </p>
      <p className="font-display text-sm mt-1 mb-3" style={{ color: c.ink }}>
        Acme Logistics Co.
      </p>
      <p className="font-mono text-lg font-semibold mb-3" style={{ color: c.ink }}>
        $4,280.00
      </p>
      <div className="space-y-1.5">
        {['Freight & handling', 'Fuel surcharge'].map((row, i) => (
          <div
            key={i}
            className="flex justify-between text-[11px] font-mono pb-1.5"
            style={{ borderBottom: `1px dashed ${c.line}`, color: c.muted }}
          >
            <span>{row}</span>
            <span>${(1200 + i * 430).toLocaleString()}.00</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TestimonialCarousel({ dark }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % testimonials.length), 5000)
    return () => clearInterval(t)
  }, [])
  const item = testimonials[idx]
  return (
    <div className="pb-8" style={{ borderTop: `1px solid ${c.lineDark}`, paddingTop: '1.75rem' }}>
      <div key={idx} className="pop-in flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-semibold shrink-0"
          style={{ backgroundColor: c.red, color: c.paper }}
        >
          {item.initials}
        </div>
        <div>
          <div className="flex gap-0.5 mb-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={11} fill={c.redSoft} color={c.redSoft} />
            ))}
          </div>
          <p className="text-xs leading-relaxed mb-1.5" style={{ color: c.mutedLight }}>
            "{item.quote}"
          </p>
          <p className="font-mono text-[10px]" style={{ color: c.muted }}>
            {item.name} — {item.role}
          </p>
        </div>
      </div>
      <div className="flex gap-1.5 mt-4 ml-12">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Show testimonial ${i + 1}`}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === idx ? 18 : 6,
              backgroundColor: i === idx ? c.red : c.lineDark,
            }}
          />
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------- form ---------------------------------- */

function useLoginForm() {
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [tab, setTab] = useState('signin')
  const [status, setStatus] = useState('idle') // idle | loading | success
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (status !== 'idle') return
    setError('')
    setStatus('loading')

    if (tab === 'signup') {
      setStatus('idle')
      setError('Sign up is not available yet. Please use sign in.')
      return
    }

    try {
      const response = await apiClient.post('/login', {
        username,
        password,
      })

      console.log('Login response:', response.data)

      const userData = response.data?.data || response.data

      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData))
        console.log('User stored in localStorage:', userData)
      }

      setStatus('success')
      console.log('Navigating to dashboard...')
      navigate({ to: '/dashboard' })
    } catch (err) {
      console.error('Login error:', err)
      setStatus('idle')
      setError(err?.response?.data?.message || 'Login failed. Please check your credentials.')
    }
  }

  return {
    showPw,
    setShowPw,
    remember,
    setRemember,
    tab,
    setTab,
    status,
    handleSubmit,
    username,
    setUsername,
    password,
    setPassword,
    error,
  }
}

function Field({
  id,
  label,
  icon,
  type = 'text',
  placeholder,
  dark,
  right,
  value,
  onChange,
  autoComplete,
}) {
  const sub = dark ? c.mutedLight : c.muted
  const txt = dark ? c.paper : c.ink
  const lineColor = dark ? c.lineDark : c.line
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor={id}
          className="flex items-center gap-2 font-mono text-[11px] tracking-wider"
          style={{ color: sub }}
        >
          {icon}
          {label}
        </label>
        {right}
      </div>
      <div className="underline-track" style={{ color: lineColor }}>
        <input
          id={id}
          type={type}
          required
          placeholder={placeholder}
          className="ledger-input w-full py-2 text-sm bg-transparent relative z-10"
          style={{ color: txt }}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />
        <span className="underline-base" />
        <span className="underline-active" />
      </div>
    </div>
  )
}

function LoginForm({ dark, idPrefix, form }) {
  const { showPw, setShowPw, remember, setRemember, tab, setTab, status, handleSubmit } = form
  const sub = dark ? c.mutedLight : c.muted
  const isSignup = tab === 'signup'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* tab switcher */}
      <div
        className="flex gap-1 p-1 rounded-md"
        style={{ backgroundColor: dark ? 'rgba(255,255,255,0.05)' : '#F1EEE7' }}
      >
        {['signin', 'signup'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded font-mono text-[11px] tracking-wide transition-all duration-200"
            style={{
              backgroundColor: tab === t ? (dark ? c.red : c.ink) : 'transparent',
              color: tab === t ? c.paper : sub,
            }}
          >
            {t === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        ))}
      </div>

      {isSignup && (
        <div className="pop-in">
          <Field
            id={`${idPrefix}-company`}
            label="COMPANY NAME"
            icon={<Building2 size={13} />}
            placeholder="Acme Logistics Co."
            dark={dark}
          />
        </div>
      )}

      <Field
        id={`${idPrefix}-username`}
        label="USERNAME"
        icon={<Mail size={13} />}
        type="text"
        placeholder="username"
        dark={dark}
        value={form.username}
        onChange={(e) => form.setUsername(e.target.value)}
        autoComplete="username"
      />

      <Field
        id={`${idPrefix}-password`}
        label="PASSWORD"
        icon={<Lock size={13} />}
        type={showPw ? 'text' : 'password'}
        placeholder="••••••••••"
        dark={dark}
        value={form.password}
        onChange={(e) => form.setPassword(e.target.value)}
        autoComplete="current-password"
        right={
          !isSignup && (
            <a
              href="#"
              className="text-xs font-medium hover:underline"
              style={{ color: dark ? c.redSoft : c.red }}
            >
              Forgot?
            </a>
          )
        }
      />
      <div className="-mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setShowPw((s) => !s)}
          className="flex items-center gap-1 text-[11px] font-mono"
          style={{ color: sub }}
        >
          {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
          {showPw ? 'HIDE' : 'SHOW'}
        </button>
      </div>

      {isSignup && (
        <div className="pop-in">
          <Field
            id={`${idPrefix}-confirm`}
            label="CONFIRM PASSWORD"
            icon={<Lock size={13} />}
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••••"
            dark={dark}
          />
        </div>
      )}

      {!isSignup && (
        <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            checked={remember}
            onChange={() => setRemember((r) => !r)}
            className="sr-only"
          />
          <span
            className="w-4 h-4 flex items-center justify-center rounded-sm border-2 transition-colors"
            style={{
              borderColor: remember ? c.red : dark ? c.lineDark : c.line,
              backgroundColor: remember ? c.red : 'transparent',
            }}
          >
            {remember && (
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                <path
                  d="M1 3.5L3.2 5.5L8 1"
                  stroke={c.paper}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className="text-xs" style={{ color: sub }}>
            Keep me signed in on this device
          </span>
        </label>
      )}

      <button
        type="submit"
        disabled={status !== 'idle'}
        className="press-scale group w-full flex items-center justify-center gap-2 py-3 rounded-sm font-display text-sm tracking-wide transition-colors disabled:cursor-default"
        style={{
          backgroundColor: status === 'success' ? c.redDeep : dark ? c.red : c.ink,
          color: c.paper,
        }}
        onMouseEnter={(e) =>
          status === 'idle' && (e.currentTarget.style.backgroundColor = c.redDeep)
        }
        onMouseLeave={(e) =>
          status === 'idle' && (e.currentTarget.style.backgroundColor = dark ? c.red : c.ink)
        }
      >
        {status === 'loading' && (
          <>
            <Loader2 size={15} className="animate-spin" />
            PROCESSING…
          </>
        )}
        {status === 'success' && (
          <span className="check-pulse flex items-center gap-2">
            <CheckCircle2 size={15} />
            WELCOME BACK
          </span>
        )}
        {status === 'idle' && (
          <>
            {isSignup ? 'CREATE ACCOUNT' : 'SIGN IN'}
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  )
}

/* --------------------------------- layouts --------------------------------- */

function MobileLayout({ form }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: c.ink }}>
      <div
        className="relative px-6 pt-8 pb-16 overflow-hidden"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 20%, ${c.redDeep} 0%, ${c.ink} 55%)`,
        }}
      >
        <div className="reveal reveal-1 flex items-center gap-2.5 relative z-10">
          <div
            className="w-8 h-8 flex items-center justify-center rounded-sm"
            style={{ backgroundColor: c.red }}
          >
            <Receipt size={16} color={c.paper} strokeWidth={2.25} />
          </div>
          <span className="font-display text-base tracking-tight" style={{ color: c.paper }}>
            REDLINE
          </span>
        </div>

        <p
          className="reveal reveal-2 font-mono text-[11px] tracking-[0.2em] mt-8 relative z-10"
          style={{ color: c.redSoft }}
        >
          BILLING &amp; INVOICING
        </p>
        <h1
          className="reveal reveal-3 font-display text-3xl leading-tight mt-2 relative z-10"
          style={{ color: c.paper }}
        >
          Every invoice,
          <br />
          settled on time.
        </h1>

        <div className="reveal reveal-4 flex justify-center relative z-10 -mb-4">
          <InvoiceIllustration size={170} />
        </div>
      </div>

      <div className="px-5 -mt-6 relative z-10 flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        <StatChip
          icon={<Users size={14} />}
          end={12400}
          suffix="+"
          label="businesses"
          dark
          delay="reveal-5"
        />
        <StatChip
          icon={<TrendingUp size={14} />}
          end={2.4}
          decimals={1}
          prefix="$"
          suffix="B"
          label="processed"
          dark
          delay="reveal-5"
        />
        <StatChip
          icon={<Clock size={14} />}
          end={99.98}
          decimals={2}
          suffix="%"
          label="uptime"
          dark
          delay="reveal-6"
        />
      </div>

      <div
        className="reveal reveal-5 flex-1 mt-6 rounded-t-3xl px-6 pt-8 pb-10"
        style={{ backgroundColor: c.paper }}
      >
        <p className="font-mono text-[11px] tracking-[0.25em] mb-2" style={{ color: c.red }}>
          ACCOUNT ACCESS
        </p>
        <h2 className="font-display text-2xl mb-1" style={{ color: c.ink }}>
          {form.tab === 'signup' ? 'Open a ledger' : 'Sign in to your ledger'}
        </h2>
        <p className="text-sm mb-7" style={{ color: c.muted }}>
          {form.tab === 'signup'
            ? 'Set up your team in under two minutes.'
            : 'View balances, chase payments, close the books.'}
        </p>

        <LoginForm dark={false} idPrefix="m" form={form} />

        <div className="flex items-center gap-3 my-7">
          <span className="h-px flex-1" style={{ backgroundColor: c.line }} />
          <span className="font-mono text-[10px] tracking-widest" style={{ color: c.muted }}>
            OR
          </span>
          <span className="h-px flex-1" style={{ backgroundColor: c.line }} />
        </div>

        <button
          className="press-scale w-full py-2.5 rounded-sm text-sm font-medium border"
          style={{ borderColor: c.line, color: c.ink }}
        >
          Sign in with company SSO
        </button>

        {/* compact testimonial for mobile */}
        <div
          className="mt-8 p-4 rounded-md"
          style={{ backgroundColor: '#F6F3EC', border: `1px solid ${c.line}` }}
        >
          <div className="flex gap-0.5 mb-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={10} fill={c.red} color={c.red} />
            ))}
          </div>
          <p className="text-xs leading-relaxed mb-1.5" style={{ color: c.ink }}>
            "Cut our collection time from 41 days to 12."
          </p>
          <p className="font-mono text-[10px]" style={{ color: c.muted }}>
            James Ito — CFO, Northwind Freight
          </p>
        </div>

        <div
          className="flex items-center justify-center gap-1.5 mt-6 font-mono text-[10px]"
          style={{ color: c.muted }}
        >
          <ShieldCheck size={12} />
          256-bit encrypted · SOC 2 Type II
        </div>
      </div>
    </div>
  )
}

function DesktopLayout({ form }) {
  return (
    <div className="flex min-h-screen">
      {/* left brand / ledger panel */}
      <div
        className="w-1/2 relative flex flex-col justify-between p-12 xl:p-16 overflow-hidden"
        style={{
          backgroundColor: c.ink,
          backgroundImage: `repeating-linear-gradient(180deg, transparent, transparent 35px, rgba(255,255,255,0.045) 35px, rgba(255,255,255,0.045) 36px), radial-gradient(circle at 15% 8%, ${c.redDeep}55 0%, transparent 45%)`,
        }}
      >
        <div className="reveal reveal-1 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 flex items-center justify-center rounded-sm"
              style={{ backgroundColor: c.red }}
            >
              <Receipt size={18} color={c.paper} strokeWidth={2.25} />
            </div>
            <span className="font-display text-lg tracking-tight" style={{ color: c.paper }}>
              REDLINE
            </span>
          </div>
          <span
            className="font-mono text-[10px] tracking-widest px-2.5 py-1 rounded-sm"
            style={{ color: c.redSoft, border: `1px solid ${c.lineDark}` }}
          >
            v4.2 LEDGER
          </span>
        </div>

        <div className="relative z-10 flex items-center gap-8 my-6">
          <div className="max-w-sm">
            <p
              className="reveal reveal-2 font-mono text-xs tracking-[0.25em] mb-4"
              style={{ color: c.redSoft }}
            >
              BILLING &amp; INVOICING SYSTEM
            </p>
            <h1
              className="reveal reveal-3 font-display text-4xl xl:text-[2.75rem] leading-[1.08] mb-5"
              style={{ color: c.paper }}
            >
              Every invoice,
              <br />
              settled on time.
            </h1>
            <p
              className="reveal reveal-4 text-sm leading-relaxed mb-7"
              style={{ color: c.mutedLight }}
            >
              Track balances, automate reminders, and close the books — built for finance teams that
              hate surprises.
            </p>

            <div className="flex gap-2.5 flex-wrap">
              <StatChip
                icon={<Users size={14} />}
                end={12400}
                suffix="+"
                label="businesses"
                dark
                delay="reveal-5"
              />
              <StatChip
                icon={<TrendingUp size={14} />}
                end={2.4}
                decimals={1}
                prefix="$"
                suffix="B"
                label="processed"
                dark
                delay="reveal-6"
              />
            </div>
          </div>
          <div className="reveal reveal-4 hidden xl:block shrink-0">
            <InvoiceIllustration size={190} />
          </div>
        </div>

        <div className="reveal reveal-5 relative z-10 grid grid-cols-2 gap-4 mb-8">
          <TiltInvoiceCard />

          <div
            className="lift rounded-md p-5"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${c.lineDark}` }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-mono text-[10px] tracking-wider" style={{ color: c.mutedLight }}>
                REVENUE COLLECTED
              </p>
              <span className="font-mono text-[10px]" style={{ color: c.redSoft }}>
                +37%
              </span>
            </div>
            <p className="font-display text-xl mb-1" style={{ color: c.paper }}>
              $121,050
            </p>
            <MiniChart />
            <p className="font-mono text-[9px] mt-1" style={{ color: c.muted }}>
              LAST 6 MONTHS · HOVER TO INSPECT
            </p>
          </div>
        </div>

        <div className="reveal reveal-6 relative z-10">
          <TestimonialCarousel dark />
        </div>

        <div
          className="relative z-10 flex items-center justify-between font-mono text-[11px]"
          style={{ color: c.muted, borderTop: `1px solid ${c.lineDark}`, paddingTop: '1.25rem' }}
        >
          <span>© {new Date().getFullYear()} Redline Billing Inc.</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} />
            256-bit encrypted · SOC 2 Type II
          </span>
        </div>
      </div>

      {/* right: form */}
      <div className="w-1/2 flex items-center justify-center px-10 py-12">
        <div className="reveal reveal-2 w-full max-w-sm">
          <p className="font-mono text-xs tracking-[0.25em] mb-3" style={{ color: c.red }}>
            ACCOUNT ACCESS
          </p>
          <h2 className="font-display text-3xl mb-2" style={{ color: c.ink }}>
            {form.tab === 'signup' ? 'Open a ledger' : 'Sign in to your ledger'}
          </h2>
          <p className="text-sm mb-9" style={{ color: c.muted }}>
            {form.tab === 'signup'
              ? 'Set up your team in under two minutes.'
              : 'Enter your credentials to view balances and invoices.'}
          </p>

          <LoginForm dark={false} idPrefix="d" form={form} />

          <div className="flex items-center gap-3 my-8">
            <span className="h-px flex-1" style={{ backgroundColor: c.line }} />
            <span className="font-mono text-[10px] tracking-widest" style={{ color: c.muted }}>
              OR
            </span>
            <span className="h-px flex-1" style={{ backgroundColor: c.line }} />
          </div>

          <button
            type="button"
            className="press-scale w-full py-2.5 rounded-sm text-sm font-medium border transition-colors"
            style={{ borderColor: c.line, color: c.ink }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = c.red)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.line)}
          >
            Sign in with company SSO
          </button>

          <p className="text-center text-xs mt-9" style={{ color: c.muted }}>
            New to Redline?{' '}
            <button
              type="button"
              onClick={() => form.setTab('signup')}
              className="font-semibold hover:underline"
              style={{ color: c.red }}
            >
              Request access
            </button>
          </p>

          <div
            className="flex items-center justify-center gap-4 mt-8 font-mono text-[10px]"
            style={{ color: c.muted }}
          >
            <a href="#" className="hover:underline">
              Privacy
            </a>
            <span>·</span>
            <a href="#" className="hover:underline">
              Terms
            </a>
            <span>·</span>
            <a href="#" className="hover:underline">
              Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------- root --------------------------------- */

export default function BillingLogin() {
  const isDesktop = useIsDesktop(1024)
  const form = useLoginForm()

  return (
    <div
      className="min-h-screen w-full"
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui" }}
    >
      <FontStyles />
      {isDesktop ? <DesktopLayout form={form} /> : <MobileLayout form={form} />}
    </div>
  )
}
