'use client'

import React from "react"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'

const GoogleIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
  </svg>
)

const FacebookIcon = () => (
  <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.048 0-2.606.492-2.606 1.691v2.281h3.908l-.528 3.667h-3.38v7.98h-5.208Z"></path>
  </svg>
)

const PlusIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
    <path d="M12 3v18m9-9H3m15.364-6.364l-12.728 12.728M21.364 18.364L8.636 5.636" strokeLinecap="round" strokeLinejoin="round"></path>
  </svg>
)

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setErrorMsg('')
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setIsLoading(false)
    }
  }

  const handleFacebookLogin = async () => {
    setIsLoading(true)
    setErrorMsg('')
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
      setIsLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Side - Login Form */}
      <div className="w-1/2 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-12">
            <div className="bg-primary rounded-md p-1">
              <PlusIcon className="text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">Build in Base</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Welcome back! Select method to login:</p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {errorMsg}
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium text-foreground bg-background disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GoogleIcon />
              Login with Google
            </button>
            <button
              onClick={handleFacebookLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium text-foreground bg-background disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FacebookIcon />
              Login with Facebook
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with Email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address<span className="text-destructive">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm py-2.5 px-3 transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password<span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="•••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm py-2.5 px-3 pr-10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Checkbox and Forgot Password */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="h-4 w-4 rounded border-border cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-muted-foreground cursor-pointer select-none">
                  Remember Me
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-foreground hover:text-foreground/80 transition-colors">
                  Forgot Password?
                </a>
              </div>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in to Build in Base'}
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            New on our platform?
            <a href="#" className="font-medium text-foreground hover:text-foreground/80 transition-colors underline underline-offset-4 ml-1">
              Create an account
            </a>
          </p>
        </div>
      </div>

      {/* Right Side - Dark Showcase */}
      <div className="hidden lg:flex w-1/2 relative bg-primary flex-col justify-between overflow-hidden p-12">
        {/* Background Watermark */}
        <div className="absolute -left-24 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
          <svg fill="white" height="600" viewBox="0 0 24 24" width="600" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3v18m9-9H3m15.364-6.364l-12.728 12.728M21.364 18.364L8.636 5.636" stroke="currentColor" strokeLinecap="round" strokeWidth="0.5"></path>
          </svg>
        </div>

        {/* Top Section */}
        <div className="relative z-10 max-w-lg mt-12">
          <h2 className="text-4xl font-bold text-primary-foreground mb-6 leading-tight">
            Welcome back! Please sign in to your Build in Base account
          </h2>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Thank you for registering! Please check your inbox and click the verification link to activate your account.
          </p>
        </div>

        {/* Bottom Card */}
        <div className="relative z-10 bg-background rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-w-md self-end transform transition-transform hover:-translate-y-1 duration-300 border border-border w-full">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-foreground">Please enter your login details</h3>
            <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-lg -mt-2 -mr-2">
              <PlusIcon />
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Stay connected with Build in Base. Subscribe now for the latest updates and news.
            </p>
            <div className="flex items-center justify-end pt-2">
              <div className="flex -space-x-3 overflow-hidden">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-muted grayscale opacity-80"
                    style={{
                      backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23999"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                ))}
                <div className="h-8 w-12 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-[10px] font-bold text-foreground z-10 pl-1">
                  +3695
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}