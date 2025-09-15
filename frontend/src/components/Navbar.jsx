"use client"
import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState("")
  const [contentType, setContentType] = useState("movies") // Default to movies

  // Extract query and type from URL when component mounts or location changes
  useEffect(() => {
    if (location.pathname === "/search") {
      const searchParams = new URLSearchParams(location.search)
      const query = searchParams.get("q") || ""
      const type = searchParams.get("type") || "movies"
      setSearchQuery(query)
      setContentType(type)
    } else if (location.pathname === "/browse") {
      const searchParams = new URLSearchParams(location.search)
      const type = searchParams.get("type") || "movies"
      setSearchQuery("")
      setContentType(type)
    } else {
      setSearchQuery("")
      setContentType("movies")
    }
  }, [location])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    
    // Immediately navigate based on search input
    if (value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value)}&type=${contentType}`)
    } else {
      // If search is empty, stay on browse page but keep the content type
      navigate(`/browse?type=${contentType}`)
    }
  }

  const handleContentTypeChange = (type) => {
    setContentType(type)
    
    // Update the URL with the new content type
    if (location.pathname === "/search" && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&type=${type}`)
    } else if (location.pathname === "/browse") {
      navigate(`/browse?type=${type}`)
    } else {
      navigate(`/browse?type=${type}`)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&type=${contentType}`)
    } else {
      navigate(`/browse?type=${contentType}`)
    }
  }

  return (
    <nav className="fixed top-0 w-full bg-gradient-to-b from-black to-transparent z-50 p-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-8">
          <h1 className="text-red-600 text-2xl font-bold">NETFLIX</h1>
          
          {/* Navigation Links */}
          <div className="hidden md:flex space-x-6">
            <a href="/browse" className="hover:text-gray-400 transition">Home</a>
            
            {/* Content Type Filters */}
            <button
              onClick={() => handleContentTypeChange("movies")}
              className={`hover:text-gray-400 transition ${
                contentType === "movies" ? "text-white font-bold" : "text-gray-400"
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => handleContentTypeChange("series")}
              className={`hover:text-gray-400 transition ${
                contentType === "series" ? "text-white font-bold" : "text-gray-400"
              }`}
            >
              Series
            </button>
            <button
              onClick={() => handleContentTypeChange("anime")}
              className={`hover:text-gray-400 transition ${
                contentType === "anime" ? "text-white font-bold" : "text-gray-400"
              }`}
            >
              Anime
            </button>
            
            <a href="#" className="hover:text-gray-400 transition">My List</a>
          </div>
        </div>

        {/* Search and User Menu */}
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="bg-black/70 border border-gray-700 rounded-md px-3 py-1 text-sm focus:outline-none focus:border-gray-500 transition-all w-40 md:w-64"
            />
            <svg
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </form>

          {/* User Profile */}
          <div className="w-8 h-8 bg-red-600 rounded-md flex items-center justify-center">
            <span className="text-sm font-semibold">U</span>
          </div>
        </div>
      </div>
    </nav>
  )
}