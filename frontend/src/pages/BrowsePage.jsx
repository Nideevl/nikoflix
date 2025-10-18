"use client"
import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import ContentCarousel from "../components/ContentCarousel"
import styles from "./BrowsePage.module.css"

export default function BrowsePage() {
  const [searchParams] = useSearchParams()
  const contentType = searchParams.get("type") || "movies"
  const [trending, setTrending] = useState([])
  const [movies, setMovies] = useState([])
  const [series, setSeries] = useState([])
  const [anime, setAnime] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isMuted, setIsMuted] = useState(true)
  const [showVideo, setShowVideo] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [featuredDetails, setFeaturedDetails] = useState(null)
  const videoRef = useRef(null)
  const modalRef = useRef(null)
  const currentTimeRef = useRef(0)
  const selectedTrendingItemRef = useRef(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        setError(null)

        const [moviesResponse, seriesResponse, animeResponse, trendingResponse] = await Promise.all([
          fetch("http://localhost:5000/api/movies?limit=30"),
          fetch("http://localhost:5000/api/series?is_animated=false&limit=30"),
          fetch("http://localhost:5000/api/series?is_animated=true&limit=30"),
          fetch("http://localhost:5000/api/trending"),
        ])

        if (moviesResponse.ok) setMovies(await moviesResponse.json())
        if (seriesResponse.ok) setSeries(await seriesResponse.json())
        if (animeResponse.ok) setAnime(await animeResponse.json())
        if (trendingResponse.ok) {
          const trendingData = await trendingResponse.json()
          setTrending(trendingData)
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

  useEffect(() => {
    const fetchFeaturedDetails = async () => {
      if (!selectedTrendingItemRef.current) return

      const trendingItem = selectedTrendingItemRef.current
      
      try {
        let apiUrl = ""
        if (trendingItem.content_type === 'movie') {
          apiUrl = `http://localhost:5000/api/movies/${trendingItem.content_id}`
        } else if (trendingItem.content_type === 'series') {
          apiUrl = `http://localhost:5000/api/series/${trendingItem.content_id}`
        }

        if (apiUrl) {
          const response = await fetch(apiUrl)
          if (response.ok) {
            const details = await response.json()
            setFeaturedDetails(details)
          }
        }
      } catch (err) {
        console.error("Error fetching featured details:", err)
      }
    }

    if (selectedTrendingItemRef.current) {
      fetchFeaturedDetails()
    }
  }, [selectedTrendingItemRef.current])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!videoRef.current) return

      if (document.hidden) {
        currentTimeRef.current = videoRef.current.currentTime
        videoRef.current.pause()
      } else {
        if (showVideo && !isMuted && currentTimeRef.current > 0 && !videoCompleted) {
          videoRef.current.currentTime = currentTimeRef.current
          videoRef.current.play().catch((error) => {
            console.log("Autoplay prevented:", error)
          })
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [showVideo, isMuted, videoCompleted])

  useEffect(() => {
    if (!videoRef.current || !showVideo || videoCompleted) return

    const updateCurrentTime = () => {
      if (videoRef.current) {
        currentTimeRef.current = videoRef.current.currentTime
      }
    }

    const interval = setInterval(updateCurrentTime, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [showVideo, videoCompleted])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !showVideo) return

    const handleVideoEnd = () => {
      console.log("🎬 Video ended")
      setVideoCompleted(true)
      setShowVideo(false)
    }

    const handleVideoPlay = () => {
      console.log("🎬 Video started playing")
      setVideoCompleted(false)
    }

    videoElement.addEventListener("ended", handleVideoEnd)
    videoElement.addEventListener("play", handleVideoPlay)

    return () => {
      videoElement.removeEventListener("ended", handleVideoEnd)
      videoElement.removeEventListener("play", handleVideoPlay)
    }
  }, [showVideo])

  useEffect(() => {
    if (showVideo && !videoCompleted && videoRef.current) {
      console.log("🎬 Auto-playing video")
      const playTimer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch((error) => {
            console.log("Autoplay prevented:", error)
          })
        }
      }, 100)
      return () => clearTimeout(playTimer)
    }
  }, [showVideo, videoCompleted])

  const getTrendingForCurrentType = () => {
    switch (contentType) {
      case "movies":
        return trending.filter((item) => item.trending_type === "movie")
      case "series":
        return trending.filter((item) => item.trending_type === "series")
      case "anime":
        return trending.filter((item) => item.trending_type === "anime")
      default:
        return trending
    }
  }

  const getFeaturedTrendingItem = () => {
    if (selectedTrendingItemRef.current) {
      return selectedTrendingItemRef.current
    }

    const currentTypeTrending = getTrendingForCurrentType()
    
    if (currentTypeTrending.length === 0) {
      return null
    }

    const randomIndex = Math.floor(Math.random() * currentTypeTrending.length)
    const randomTrendingItem = currentTypeTrending[randomIndex]
    
    selectedTrendingItemRef.current = randomTrendingItem
    return selectedTrendingItemRef.current
  }

  const featuredTrendingItem = getFeaturedTrendingItem()
  const featuredTrendingVideo = featuredTrendingItem?.video_url || null

  // Reset when contentType changes
  useEffect(() => {
    selectedTrendingItemRef.current = null
    setFeaturedDetails(null)
  }, [contentType])

  useEffect(() => {
    if (!loading && featuredTrendingVideo) {
      const timer = setTimeout(() => {
        setShowUserModal(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [loading, featuredTrendingVideo])

  const handleUserSelection = (selectionType) => {
    if (modalRef.current) {
      modalRef.current.style.transform = "translateY(100%)"
    }

    setTimeout(() => {
      setShowUserModal(false)

      if (selectionType === "guest" || selectionType === "close") {
        setTimeout(() => {
          setShowVideo(true)
          setIsMuted(false)
          setVideoCompleted(false)
        }, 3000)
      }
    }, 500)
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(!isMuted)
    }
  }

  const handleRetryVideo = () => {
    
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      currentTimeRef.current = 0
    }
    
    setVideoCompleted(false)
    setShowVideo(true)
  }

  const handleVideoError = () => {
    console.error("Video failed to load")
    setShowVideo(false)
    setVideoCompleted(true)
  }

  const renderControlButton = () => {
    console.log("🎮 Rendering control button:", { videoCompleted, showVideo })
    
    if (videoCompleted) {
      console.log("✅ Showing RETRY button")
      return (
        <button className={styles.controlButton} onClick={handleRetryVideo} aria-label="Replay video">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
        </button>
      )
    } else if (showVideo) {
      console.log("🔊 Showing MUTE button")
      return (
        <button className={styles.controlButton} onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
          {isMuted ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>
      )
    }
    return null
  }

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
          <button className={styles.retryButton} onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const contentConfig = {
    movies: {
      featured: movies[0] || {},
      rows: [
        { title: "Trending Now", content: movies.slice(0, 18) },
        { title: "Popular on Netflix", content: movies.slice(5, 23) },
        { title: "Top Picks For You", content: movies.slice(10, 28) },
        { title: "New Releases", content: movies.slice(15, 30) },
        { title: "Award-Winning Films", content: movies.slice(2, 20) },
      ],
    },
    series: {
      featured: series[0] || {},
      rows: [
        { title: "Popular Series", content: series.slice(0, 18) },
        { title: "Bingeworthy TV Shows", content: series.slice(5, 23) },
        { title: "Critically Acclaimed", content: series.slice(10, 28) },
        { title: "New Episodes", content: series.slice(15, 30) },
        { title: "Drama Series", content: series.slice(3, 21) },
      ],
    },
    anime: {
      featured: anime[0] || {},
      rows: [
        { title: "Popular Anime", content: anime.slice(0, 18) },
        { title: "Top Rated Anime", content: anime.slice(5, 23) },
        { title: "New This Season", content: anime.slice(10, 28) },
        { title: "Action & Adventure", content: anime.slice(4, 22) },
        { title: "Fan Favorites", content: anime.slice(8, 26) },
      ],
    },
  }

  const { featured, rows } = contentConfig[contentType] || contentConfig.movies

  return (
    <div className={styles.container}>
      {showUserModal && (
        <div className={styles.modalOverlay}>
          <div ref={modalRef} className={styles.userModal}>
            <div className={styles.modalHeader}>
              <h2>Who's Watching?</h2>
              <p>Choose how you'd like to experience our content</p>
            </div>

            <div className={styles.modalOptions}>
              <button className={styles.optionButton} onClick={() => handleUserSelection("subscriber")}>
                <div className={styles.optionIcon}>👤</div>
                <div className={styles.optionText}>
                  <strong>I'm a Subscriber</strong>
                  <span>Log me in to continue watching</span>
                </div>
              </button>

              <button className={styles.optionButton} onClick={() => handleUserSelection("guest")}>
                <div className={styles.optionIcon}>🎭</div>
                <div className={styles.optionText}>
                  <strong>I'm a Guest</strong>
                  <span>Continue without logging in</span>
                </div>
              </button>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.closeButton} onClick={() => handleUserSelection("close")}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <section className={styles.heroBanner}>
        {featuredTrendingVideo && showVideo && !videoCompleted ? (
          <>
            <video
              ref={videoRef}
              className={styles.heroVideo}
              src={featuredTrendingVideo}
              autoPlay
              loop={false}
              muted={isMuted}
              playsInline
              onError={handleVideoError}
              poster={featuredDetails?.wide_poster_url || "/cinematic-movie-scene.png"}
            />
            {renderControlButton()}
          </>
        ) : (
          <>
            <div
              className={styles.heroImage}
              style={{
                backgroundImage: featuredDetails?.wide_poster_url 
                  ? `url('${featuredDetails.wide_poster_url}')`
                  : "url('/cinematic-movie-scene.png')",
              }}
            />
            {videoCompleted && featuredTrendingVideo && (
              <div className={styles.completedOverlay}>
                {renderControlButton()}
              </div>
            )}
          </>
        )}

        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            {featuredDetails?.title || `Featured ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`}
          </h1>
          <p className={styles.heroDescription}>
            {featuredDetails?.description || "Experience the best in entertainment. Watch anywhere, cancel anytime."}
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
      </section>

      <main className={styles.contentMain}>
        {rows.map((row, index) => (
          <ContentCarousel key={`${row.title}-${index}`} title={row.title} items={row.content} />
        ))}
      </main>

      <footer className={styles.footer}>
        <p>© 2024 Netflix Clone. This is a demo project for educational purposes.</p>
      </footer>
    </div>
  )
}