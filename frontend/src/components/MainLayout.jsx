import Navbar from "./Navbar"

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-20">{children}</div>
    </div>
  )
}
