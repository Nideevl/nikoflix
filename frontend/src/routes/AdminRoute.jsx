import { Navigate } from "react-router-dom"

export default function AdminRoute({ children }) {
  const token = localStorage.getItem("token")
  if (!token) return <Navigate to="/auth/login" />

  try {
    const payload = JSON.parse(atob(token.split(".")[1])) // decode JWT
    if (payload.role !== "admin") return <Navigate to="/browse" />
    return children
  } catch {
    return <Navigate to="/auth/login" />
  }
}
