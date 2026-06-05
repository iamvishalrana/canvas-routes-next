'use client'
import { Component } from 'react'
import * as Sentry from '@sentry/nextjs'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('Canvas Routes render error:', error, info)
    try { Sentry.captureException(error, { contexts: { react: { componentStack: info?.componentStack } } }) } catch {}
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#F5F1EC',padding:'2rem',textAlign:'center'}}>
          <img src="/canvas_routes_refined.png" alt="Canvas Routes" style={{width:'200px',marginBottom:'2rem'}} />
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.4rem',fontWeight:'300',color:'#1a1a1a',marginBottom:'0.75rem'}}>Something went wrong.</p>
          <p style={{fontSize:'13px',color:'#888',marginBottom:'2rem'}}>Please refresh the page to continue.</p>
          <button onClick={() => window.location.reload()} style={{padding:'0.75rem 2rem',border:'1px solid #7B2032',background:'transparent',color:'#7B2032',fontSize:'11px',letterSpacing:'0.15em',textTransform:'uppercase',cursor:'pointer',fontFamily:"'Inter',sans-serif"}}>Refresh</button>
        </div>
      )
    }
    return this.props.children
  }
}
