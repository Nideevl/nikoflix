"use client"

import { useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import api from "../api"
import AuthLayout from "../components/AuthLayout"

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const token = searchParams.get("token")

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post("/auth/reset-password", {
        token,
        newPassword: password,
      })
      setMessage(res.data.message)
      setTimeout(() => navigate("/auth/login"), 2000)
    } catch (err) {
      setMessage(err.response?.data?.error || "Reset failed")
    }
  }

  return (
    <AuthLayout title="Set New Password" showBackToLogin={true}>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-white">
          Create a new password
        </h2>
        <p className="text-gray-400 text-sm">
          Pick a strong password you haven’t used before on Nikoflix. 
          This helps keep your account safe and secure.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg enhanced-input text-white placeholder:text-gray-500 focus:outline-none"
          required
        />

        <button
          type="submit"
          className="w-full netflix-button text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200"
        >
          Update Password
        </button>

        {message && <p className="text-sm mt-2 text-red-500 text-center">{message}</p>}
      </form>
    </AuthLayout>
  )
}
