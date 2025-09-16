"use client"
import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import ContentCard from "../components/ContentCard"

export default function BrowsePage() {
  const [searchParams] = useSearchParams()
  const contentType = searchParams.get("type") || "movies"
  const [movies, setMovies] = useState([])
  const [series, setSeries] = useState([])
  const [anime, setAnime] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        
        // Fetch movies
        const moviesResponse = await fetch("http://localhost:5000/api/movies?limit=10")
        if (moviesResponse.ok) {
          const moviesData = await moviesResponse.json()
          setMovies(moviesData)
        }
        
        // Fetch series (non-animated)
        const seriesResponse = await fetch("http://localhost:5000/api/series?is_animated=false&limit=10")
        if (seriesResponse.ok) {
          const seriesData = await seriesResponse.json()
          setSeries(seriesData)
        }
        
        // Fetch anime (animated)
        const animeResponse = await fetch("http://localhost:5000/api/series?is_animated=true&limit=10")
        if (animeResponse.ok) {
          const animeData = await animeResponse.json()
          setAnime(animeData)
        }
      } catch (err) {
        console.error("Error fetching content:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pt-20 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  // Determine which content to show based on selected type
  let featuredContent, contentRows
  if (contentType === "movies") {
    featuredContent = movies[0] || {}
    contentRows = [
      { title: "Trending Movies", content: movies },
      { title: "Top Picks For You", content: movies.slice(0, 5) },
      { title: "New Releases", content: movies.slice(5, 10) }
    ]
  } else if (contentType === "series") {
    featuredContent = series[0] || {}
    contentRows = [
      { title: "Popular Series", content: series },
      { title: "Top Rated Series", content: series.slice(0, 5) },
      { title: "New Series", content: series.slice(5, 10) }
    ]
  } else if (contentType === "anime") {
    featuredContent = anime[0] || {}
    contentRows = [
      { title: "Popular Anime", content: anime },
      { title: "Top Rated Anime", content: anime.slice(0, 5) },
      { title: "New Anime", content: anime.slice(5, 10) }
    ]
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Banner */}
      <section
        className="relative h-[75vh] bg-cover bg-center"
        style={{ 
          backgroundImage: featuredContent.wide_poster_url 
            ? `url('${featuredContent.wide_poster_url}')` 
            : "url('/cinematic-movie-scene.png')" 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>

        <div className="absolute bottom-24 left-12 max-w-xl space-y-4">
          <h1 className="text-5xl font-extrabold">{featuredContent.title || "Featured Content"}</h1>
          <p className="text-lg text-gray-300 max-w-md">
            {featuredContent.description || "An epic story of action and drama. Watch anywhere, cancel anytime."}
          </p>
          <div className="flex space-x-4">
            <button className="bg-white text-black px-6 py-2 font-semibold rounded hover:bg-gray-200 transition">
              ▶ Play
            </button>
            <button className="bg-gray-500/70 text-white px-6 py-2 font-semibold rounded hover:bg-gray-500 transition">
              ℹ More Info
            </button>
          </div>
        </div>
      </section>

      {/* Content Rows */}
      <main className="relative -mt-20 space-y-12 px-8 pb-20">
        {contentRows.map((row, rowIndex) => (
          <div key={rowIndex} className="space-y-3">
            <h2 className="text-xl font-bold">{row.title}</h2>
            <div className="flex space-x-4 overflow-x-scroll scrollbar-hide">
              {row.content.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  showType={contentType !== "movies"}
                  className="w-40 h-60 flex-shrink-0 transform transition-transform hover:scale-110"
                />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}