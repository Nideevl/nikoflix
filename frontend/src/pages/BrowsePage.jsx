"use client"
import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import ContentCarousel from "../components/ContentCarousel"
import styles from "./BrowsePage.module.css"

export default function BrowsePage() {
  const [searchParams] = useSearchParams()
  const contentType = searchParams.get("type") || "movies"
  const [movies, setMovies] = useState([])
  const [series, setSeries] = useState([])
  const [anime, setAnime] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        setError(null)

        const [moviesResponse, seriesResponse, animeResponse] = await Promise.all([
          fetch("http://localhost:5000/api/movies?limit=30"),
          fetch("http://localhost:5000/api/series?is_animated=false&limit=30"),
          fetch("http://localhost:5000/api/series?is_animated=true&limit=30")
        ])

        if (moviesResponse.ok) {
          const moviesData = await moviesResponse.json()
          setMovies(moviesData)
        }

        if (seriesResponse.ok) {
          const seriesData = await seriesResponse.json()
          setSeries(seriesData)
        }

        if (animeResponse.ok) {
          const animeData = await animeResponse.json()
          setAnime(animeData)
        }

      } catch (err) {
        console.error("Error fetching content:", err)
        setError("Failed to load content. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading amazing content...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button 
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Content configuration based on type
  const contentConfig = {
    movies: {
      featured: movies[0] || {},
      rows: [
        { title: "Trending Now", content: movies.slice(0, 18) },
        { title: "Popular on Netflix", content: movies.slice(5, 23) },
        { title: "Top Picks For You", content: movies.slice(10, 28) },
        { title: "New Releases", content: movies.slice(15, 30) },
        { title: "Award-Winning Films", content: movies.slice(2, 20) }
      ]
    },
    series: {
      featured: series[0] || {},
      rows: [
        { title: "Popular Series", content: series.slice(0, 18) },
        { title: "Bingeworthy TV Shows", content: series.slice(5, 23) },
        { title: "Critically Acclaimed", content: series.slice(10, 28) },
        { title: "New Episodes", content: series.slice(15, 30) },
        { title: "Drama Series", content: series.slice(3, 21) }
      ]
    },
    anime: {
      featured: anime[0] || {},
      rows: [
        { title: "Popular Anime", content: anime.slice(0, 18) },
        { title: "Top Rated Anime", content: anime.slice(5, 23) },
        { title: "New This Season", content: anime.slice(10, 28) },
        { title: "Action & Adventure", content: anime.slice(4, 22) },
        { title: "Fan Favorites", content: anime.slice(8, 26) }
      ]
    }
  }

  const { featured, rows } = contentConfig[contentType] || contentConfig.movies

  return (
    <div className={styles.container}>
      {/* Hero Banner */}
      <section
        className={styles.heroBanner}
        style={{ 
          backgroundImage: featured.wide_poster_url 
            ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url('${featured.wide_poster_url}')`
            : "linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url('/cinematic-movie-scene.png')" 
        }}
      >
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            {featured.title || `Featured ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`}
          </h1>
          <p className={styles.heroDescription}>
            {featured.description || "Experience the best in entertainment. Watch anywhere, cancel anytime."}
          </p>
          <div className={styles.heroButtons}>
            <button className={styles.btnPrimary}>
              <span className={styles.playIcon}>▶</span>
              Play
            </button>
            <button className={styles.btnSecondary}>
              <span className={styles.infoIcon}>ℹ</span>
              More Info
            </button>
          </div>
        </div>
        <div className={styles.heroOverlay}></div>
      </section>

      {/* Content Rows */}
      <main className={styles.contentMain}>
        {rows.map((row, index) => (
          <ContentCarousel
            key={`${row.title}-${index}`}
            title={row.title}
            items={row.content}
          />
        ))}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2024 Netflix Clone. This is a demo project for educational purposes.</p>
      </footer>
    </div>
  )
}