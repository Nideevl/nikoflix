"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useNavigate, Link } from "react-router-dom"
import api from "../api"
import AuthLayout from "../components/AuthLayout"

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const [message, setMessage] = useState("Verifying your email...")
  const [isSuccess, setIsSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get("token")

    if (token) {
      api
        .get(`/auth/verify-email?token=${token}`)
        .then((res) => {
          setMessage(res.data.message || "Email verified successfully!")
          setIsSuccess(true)
          setTimeout(() => navigate("/auth/login"), 3000)
        })
        .catch((err) => {
          setMessage(err.response?.data?.error || "Invalid or expired token.")
          setIsSuccess(false)
        })
    } else {
      setMessage("No verification token found.")
      setIsSuccess(false)
    }
  }, [searchParams, navigate])

  return (
    <AuthLayout title="Email Verification">
      <div className="text-center space-y-4">
        <p className={`text-lg ${isSuccess ? "text-green-400" : "text-red-400"}`}>{message}</p>

        {isSuccess ? (
          <p className="text-sm text-gray-400">Redirecting to login in 3 seconds...</p>
        ) : (
          <Link to="/auth/login" className="inline-block text-blue-400 hover:text-blue-300 underline">
            Go to Login
          </Link>
        )}
      </div>
    </AuthLayout>
  )
}
