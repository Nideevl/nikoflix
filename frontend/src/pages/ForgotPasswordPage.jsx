"use client"

import { useState } from "react"
import api from "../api"
import AuthLayout from "../components/AuthLayout"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post("/auth/forgot-password", { email })
      setMessage(res.data.message)
    } catch (err) {
      setMessage(err.response?.data?.error || "Something went wrong")
    }
  }

  return (
    <AuthLayout title="Reset Password" showBackToLogin={true}>
      {/* Info text */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-white">
          Trouble signing in?
        </h2>
        <p className="text-gray-400 text-sm">
          Enter your email address and we’ll send you a secure link to reset
          your password. You’ll be back to streaming in no time.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 enhanced-input text-white placeholder:text-gray-500 focus:outline-none"
        />

        <button
          type="submit"
          className="w-full nikoflix-button text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200"
        >
          Send Reset Link
        </button>

        {message && <p className="text-sm mt-2 text-red-500 text-center">{message}</p>}


      </form>
    </AuthLayout>
  )
}
