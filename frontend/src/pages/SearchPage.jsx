"use client"
import { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get("q") || ""
  const contentType = searchParams.get("type") || "movies"
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // If query is empty, redirect to browse page
  useEffect(() => {
    if (!query) {
      navigate("/browse")
    }
  }, [query, navigate])

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) {
        setSearchResults([])
        return
      }

      setLoading(true)
      setError("")
      
      try {
        let apiUrl = ""
        
        // Determine which API endpoint to call based on content type
        if (contentType === "movies") {
          apiUrl = `http://localhost:5000/api/movies?q=${encodeURIComponent(query)}`
        } else if (contentType === "series") {
          apiUrl = `http://localhost:5000/api/series?q=${encodeURIComponent(query)}&is_animated=false`
        } else if (contentType === "anime") {
          apiUrl = `http://localhost:5000/api/series?q=${encodeURIComponent(query)}&is_animated=true`
        }
        
        console.log("Fetching from:", apiUrl); // Debug log
        
        const response = await fetch(apiUrl)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setSearchResults(data)
      } catch (err) {
        console.error("Error fetching search results:", err)
        setError("Failed to fetch search results. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchSearchResults()
  }, [query, contentType])

  // If no query, don't render anything (will be redirected)
  if (!query) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20 px-8">
      <h1 className="text-2xl font-bold mb-6">
        Search Results for "{query}" in {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
      </h1>

      {loading && <p className="text-gray-400">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {/* Display results */}
      {!loading && !error && (
        <>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="w-full aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden transform transition-transform hover:scale-105 cursor-pointer"
                >
                  {item.poster_url ? (
                    <img
                      src={item.poster_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-700">
                      <span className="text-sm text-gray-400">No image</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                    <h3 className="text-sm font-semibold truncate">{item.title}</h3>
                    <p className="text-xs text-gray-400">{item.release_year}</p>
                    {item.is_animated !== undefined && (
                      <p className="text-xs text-gray-400">
                        {item.is_animated ? "Anime" : "Series"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No results found for "{query}" in {contentType}</p>
          )}
        </>
      )}
    </div>
  )
}