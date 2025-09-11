"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { GoogleLogin } from "@react-oauth/google"
import api from "../api"

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" })
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      const res = await api.post("/auth/login", form)
      localStorage.setItem("token", res.data.token)
      setMessage("Login successful! Redirecting...")
      setTimeout(() => navigate("/browse"), 1500)
    } catch (err) {
      setMessage(err.response?.data?.error || "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await api.post("/auth/google", {
        id_token: credentialResponse.credential,
      })
      localStorage.setItem("token", res.data.token)
      navigate("/browse")
    } catch (err) {
      setMessage("Google login failed")
    }
  }

  return (
    <div className="min-h-screen flex flex-col auth-gradient">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/20 rounded-full animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-primary/30 rounded-full animate-ping"></div>
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-primary/25 rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* Logo */}
      <div className="p-6 z-10">
        <div className="floating">
          <h1 className="nikoflix-logo glow-effect">
            <a href="/" className="nikoflix-logo block">
              NIKOFLIX
            </a>
          </h1>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex flex-1 items-center justify-center px-4 -mt-20 z-10">
        <div className="w-full max-w-md auth-card p-8 rounded-xl shadow-2xl space-y-6 transform transition-all duration-500">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Welcome Back
            </h2>
            <div className="w-12 h-0.5 bg-gradient-to-r from-primary to-primary/50 mx-auto rounded-full"></div>
          </div>

          <div className="space-y-6">
            {/* Google Login Button */}
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setMessage("Google signup failed")}
              useOneTap={false}
              // render allows full custom button
              render={(renderProps) => (
                <button
                  onClick={renderProps.onClick}
                  disabled={renderProps.disabled}
                  className="w-full flex items-center justify-center gap-3 border border-gray-600 rounded-md bg-[#1f1f1f] hover:bg-[#2a2a2a] text-gray-200 font-medium py-3 transition-all"
                >
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-5 h-5"
                  />
                  Sign up with Google
                </button>
              )}
            />

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-4 text-gray-400 font-medium">Or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 enhanced-input text-white placeholder:text-gray-500 focus:outline-none"
                required
              />
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 enhanced-input text-white placeholder:text-gray-500 focus:outline-none"
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full netflix-button text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 ${
                  isLoading ? "loading-shimmer cursor-not-allowed opacity-80" : ""
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing In...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>

              {message && (
                <div
                  className={`p-4 rounded-lg ${
                    message.includes("successful") ? "message-success" : "message-error"
                  }`}
                >
                  <p className="text-sm text-center font-medium">{message}</p>
                </div>
              )}
            </form>

            {/* Links */}
            <div className="space-y-4 text-center text-sm">
              <div>
                <a
                  href="/auth/forgot-password"
                  className="text-primary hover:text-primary/80 underline transition-colors duration-200 font-medium"
                >
                  Forgot your password?
                </a>
              </div>
              <div className="text-gray-400">
                Don&apos;t have an account?{" "}
                <a
                  href="/auth/register"
                  className="text-primary hover:text-primary/80 underline font-medium transition-colors duration-200"
                >
                  Sign up here
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
