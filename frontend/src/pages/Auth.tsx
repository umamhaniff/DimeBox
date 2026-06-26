import React, { useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { KeyRound, Mail, UserPlus, LogIn, Sparkles } from 'lucide-react'

export const Auth: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Registration successful! Please check your email for confirmation.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-hud-bg p-4 hud-scanline-container relative font-hud">
      {/* Subtle glowing grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,240,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Cybernetic HUD Box */}
      <div className="w-full max-w-md hud-corner-box bg-hud-panel border-hud-border p-8 rounded-lg shadow-2xl relative z-10 animate-hud-fade">
        <div className="hud-corner-bottom" />

        {/* Brand / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-neon-cyan-dim border border-neon-cyan rounded-full mb-4 animate-neon-pulse">
            <Sparkles className="w-8 h-8 text-neon-cyan" />
          </div>
          <h1 className="text-3xl font-bold tracking-wider text-hud-text-bright glow-text-cyan">
            DIMEBOX
          </h1>
          <p className="text-xs text-hud-text-muted mt-1 uppercase tracking-widest">
            Pocket Dimension Inventory HUD
          </p>
        </div>

        {/* Title */}
        <div className="mb-6 border-b border-hud-border pb-3 flex justify-between items-center">
          <span className="text-sm font-medium text-neon-cyan tracking-wider uppercase">
            {isSignUp ? 'Initialize Profile' : 'Access Vault'}
          </span>
          <span className="text-[10px] text-hud-text-muted font-mono">
            SYS.VER.0.1.0
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-[11px] uppercase tracking-wider text-hud-text-muted">
              Grid Access Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-hud-text-muted" />
              <input
                type="email"
                required
                placeholder="enter email address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-hud-bg border border-hud-border rounded px-10 py-2.5 text-sm text-hud-text-bright placeholder-hud-text-muted focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all duration-300 font-sans"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-[11px] uppercase tracking-wider text-hud-text-muted">
              Security Cipher
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3.5 w-4 h-4 text-hud-text-muted" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-hud-bg border border-hud-border rounded px-10 py-2.5 text-sm text-hud-text-bright placeholder-hud-text-muted focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all duration-300 font-sans"
              />
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="bg-neon-red-dim border border-neon-red text-neon-red text-xs p-3 rounded font-mono flex items-start gap-2">
              <span className="uppercase font-bold shrink-0">[Error]</span>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="bg-neon-green-dim border border-neon-green text-neon-green text-xs p-3 rounded font-mono flex items-start gap-2">
              <span className="uppercase font-bold shrink-0">[System]</span>
              <span>{message}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded font-bold uppercase tracking-wider text-sm transition-all duration-300 border flex items-center justify-center gap-2 cursor-pointer ${
              loading
                ? 'bg-hud-panel text-hud-text-muted border-hud-border cursor-not-allowed'
                : isSignUp
                ? 'bg-neon-purple-dim text-neon-purple border-neon-purple hover:bg-neon-purple hover:text-white glow-purple'
                : 'bg-neon-cyan-dim text-neon-cyan border-neon-cyan hover:bg-neon-cyan hover:text-hud-bg glow-cyan'
            }`}
          >
            {loading ? (
              <span className="animate-pulse">Loading system...</span>
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                Register New Account
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Initiate Link-start
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-8 pt-6 border-t border-hud-border text-center">
          <p className="text-xs text-hud-text-muted">
            {isSignUp ? 'Already registered in this sector?' : 'New explorer in this sector?'}
          </p>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
              setMessage(null)
            }}
            className="mt-2 text-xs font-bold text-neon-cyan hover:underline uppercase tracking-wider cursor-pointer"
          >
            {isSignUp ? 'Establish Existing Access' : 'Create New Inventory Sector'}
          </button>
        </div>
      </div>
    </div>
  )
}
