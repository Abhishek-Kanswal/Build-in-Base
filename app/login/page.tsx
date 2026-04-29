'use client'

import React from "react"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={`w-6 h-6 ${className || ''}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
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

  const handleXLogin = async () => {
    setIsLoading(true)
    setErrorMsg('')
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
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
    <div className="min-h-screen w-full flex bg-[#0A0A0A]">
      {/* Left Side - Login Form */}
      <div className="w-1/2 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-12">
            <div className="bg-[#151414] border border-[#222] rounded-md p-1">
              <PlusIcon className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Build in Base</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">Welcome back! Select method to login:</p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {errorMsg}
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#222] rounded-lg hover:bg-[#1a1919] transition-colors text-sm font-medium text-white bg-[#151414] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img src="/google.svg" alt="Google" className="w-5 h-5" />
              Login with Google
            </button>
            <button
              onClick={handleXLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#222] rounded-lg hover:bg-[#1a1919] transition-colors text-sm font-medium text-white bg-[#151414] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img src="/x.svg" alt="X" className="w-5 h-5" />
              Login with X
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#222]"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0A0A0A] px-2 text-gray-500">Or continue with Email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-white">
                Email address<span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border-[#222] bg-[#151414] text-white placeholder:text-gray-500 shadow-sm py-2.5 px-3 transition-all focus:border-white focus:ring-1 focus:ring-white"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-white">
                Password<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="•••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border-[#222] bg-[#151414] text-white placeholder:text-gray-500 shadow-sm py-2.5 px-3 pr-10 transition-all focus:border-white focus:ring-1 focus:ring-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-white transition-colors"
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
                  className="h-4 w-4 rounded border-[#222] bg-[#151414] data-[state=checked]:bg-white data-[state=checked]:text-[#0A0A0A] cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400 cursor-pointer select-none">
                  Remember Me
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-white hover:text-gray-300 transition-colors">
                  Forgot Password?
                </a>
              </div>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-[#222] rounded-lg shadow-sm text-sm font-medium text-[#0A0A0A] bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in to Build in Base'}
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-sm text-gray-400">
            New on our platform?
            <a href="#" className="font-medium text-white hover:text-gray-300 transition-colors underline underline-offset-4 ml-1">
              Create an account
            </a>
          </p>
        </div>
      </div>

      {/* Right Side - Dark Showcase */}
      <div className="hidden lg:flex w-1/2 relative bg-[#151414] flex-col justify-between overflow-hidden p-12">
        {/* Background Watermark */}
        <div className="absolute -left-24 top-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none">
          <svg fill="white" height="600" viewBox="0 0 24 24" width="600" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3v18m9-9H3m15.364-6.364l-12.728 12.728M21.364 18.364L8.636 5.636" stroke="currentColor" strokeLinecap="round" strokeWidth="0.5"></path>
          </svg>
        </div>

        {/* Top Section */}
        <div className="relative z-10 max-w-lg mt-12">
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
            Welcome back! Please sign in to your Build in Base account
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Thank you for registering! Please check your inbox and click the verification link to activate your account.
          </p>
        </div>

        {/* Bottom Card */}
        <div className="relative z-10 bg-[#0A0A0A] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-w-md self-end transform transition-transform hover:-translate-y-1 duration-300 border border-[#222] w-full">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-white">Please enter your login details</h3>
            <div className="bg-[#151414] border border-[#222] text-white p-2 rounded-xl shadow-lg -mt-2 -mr-2">
              <PlusIcon />
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Stay connected with Build in Base. Subscribe now for the latest updates and news.
            </p>
            <div className="flex items-center justify-end pt-2">
              <div className="flex -space-x-3 overflow-hidden">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-[#0A0A0A] bg-[#151414] grayscale opacity-80"
                    style={{
                      backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23999"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                ))}
                <div className="h-8 w-12 rounded-full bg-[#151414] ring-2 ring-[#0A0A0A] flex items-center justify-center text-[10px] font-bold text-white z-10 pl-1 border border-[#222]">
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