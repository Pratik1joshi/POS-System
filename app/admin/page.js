'use client'

import { useState, useEffect } from 'react'
import AdminPanel from '@/components/admin/admin-panel'
import { Shield, Lock, User } from 'lucide-react'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if already logged in
    const adminToken = sessionStorage.getItem('adminToken')
    if (adminToken === 'authenticated') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (data.success) {
        sessionStorage.setItem('adminToken', 'authenticated')
        sessionStorage.setItem('adminUser', data.user.username)
        setIsAuthenticated(true)
      } else {
        setError(data.error || 'Invalid credentials')
      }
    } catch (error) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken')
    sessionStorage.removeItem('adminUser')
    setIsAuthenticated(false)
    setUsername('')
    setPassword('')
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-primary-foreground px-6 py-4 flex justify-between items-center border-b">
          <div className="flex items-center gap-3">
            <Shield size={28} />
            <div>
              <h1 className="text-xl font-bold">Admin Control Panel</h1>
              <p className="text-xs opacity-90">Nepal POS Master System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">
              Welcome, <strong>{sessionStorage.getItem('adminUser')}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-primary-foreground/20 rounded-lg hover:bg-primary-foreground/30 transition-colors text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </header>
        <AdminPanel />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-background rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-foreground/20 p-4 rounded-full">
                <Shield size={48} />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Admin Access</h1>
            <p className="text-sm opacity-90 mt-2">Nepal POS Master Control Panel</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <User size={16} />
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Lock size={16} />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : 'Login to Admin Panel'}
            </button>

            <div className="text-center text-xs text-muted-foreground">
              <p>Default credentials:</p>
              <p className="font-mono mt-1">Username: <strong>admin</strong></p>
              <p className="font-mono">Password: <strong>admin123</strong></p>
              <p className="text-destructive mt-2">⚠️ Change these in production!</p>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to POS System
          </a>
        </div>
      </div>
    </div>
  )
}
