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
  const videoRef = useRef(null)
  const modalRef = useRef(null)
  // Store current playback time
  const currentTimeRef = useRef(0)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        setError(null)

        const [moviesResponse, seriesResponse, animeResponse, trendingResponse] = await Promise.all([
          fetch("http://localhost:5000/api/movies?limit=30"),
          fetch("http://localhost:5000/api/series?is_animated=false&limit=30"),
          fetch("http://localhost:5000/api/series?is_animated=true&limit=30"),
          fetch("http://localhost:5000/api/trending")
        ])

        if (moviesResponse.ok) setMovies(await moviesResponse.json())
        if (seriesResponse.ok) setSeries(await seriesResponse.json())
        if (animeResponse.ok) setAnime(await animeResponse.json())
        if (trendingResponse.ok) setTrending(await trendingResponse.json())

      } catch (err) {
        console.error("Error fetching content:", err)
        setError("Failed to load content. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [])

  // Page Visibility API to handle tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!videoRef.current) return

      if (document.hidden) {
        // Tab is hidden - pause video and store current time
        currentTimeRef.current = videoRef.current.currentTime
        videoRef.current.pause()
      } else {
        // Tab is visible - resume video from stored time if user has interacted
        if (showVideo && !isMuted && currentTimeRef.current > 0 && !videoCompleted) {
          videoRef.current.currentTime = currentTimeRef.current
          videoRef.current.play().catch(error => {
            console.log("Autoplay prevented:", error)
          })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [showVideo, isMuted, videoCompleted])

  // Store current time periodically for better resume accuracy
  useEffect(() => {
    if (!videoRef.current || !showVideo || videoCompleted) return

    const updateCurrentTime = () => {
      if (videoRef.current) {
        currentTimeRef.current = videoRef.current.currentTime
      }
    }

    const interval = setInterval(updateCurrentTime, 1000) // Update every second

    return () => {
      clearInterval(interval)
    }
  }, [showVideo, videoCompleted])

  // Video event handlers
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !showVideo) return

    const handleVideoEnd = () => {
      setVideoCompleted(true)
      setShowVideo(false)
    }

    const handleVideoPlay = () => {
      setVideoCompleted(false)
    }

    videoElement.addEventListener('ended', handleVideoEnd)
    videoElement.addEventListener('play', handleVideoPlay)

    return () => {
      videoElement.removeEventListener('ended', handleVideoEnd)
      videoElement.removeEventListener('play', handleVideoPlay)
    }
  }, [showVideo])

  const getTrendingForCurrentType = () => {
    switch (contentType) {
      case "movies":
        return trending.filter(item => item.content_type === "movie" && item.trending_type === "movie")
      case "series":
        return trending.filter(item => item.content_type === "series" && item.trending_type === "series")
      case "anime":
        return trending.filter(item => item.content_type === "series" && item.trending_type === "anime")
      default:
        return trending
    }
  }

  const getFeaturedTrendingVideo = () => {
    const currentTypeTrending = getTrendingForCurrentType()
    const sortedTrending = currentTypeTrending.sort((a, b) => a.position - b.position)
    if (sortedTrending.length > 0) {
      return sortedTrending[0].video_url
    }
    const anyTrending = trending.sort((a, b) => a.position - b.position)
    return anyTrending.length > 0 ? anyTrending[0].video_url : null
  }

  const featuredTrendingVideo = getFeaturedTrendingVideo()

  useEffect(() => {
    if (!loading && featuredTrendingVideo) {
      // Show user modal after content loads
      const timer = setTimeout(() => {
        setShowUserModal(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [loading, featuredTrendingVideo])

  const handleUserSelection = (selectionType) => {
    // Slide down animation
    if (modalRef.current) {
      modalRef.current.style.transform = 'translateY(100%)'
    }
    
    setTimeout(() => {
      setShowUserModal(false)
      
      if (selectionType === 'guest' || selectionType === 'close') {
        // Show video with sound after 3 seconds
        setTimeout(() => {
          setShowVideo(true)
          setIsMuted(false)
          setVideoCompleted(false)
        }, 3000)
      }
      // For subscriber, you would handle login flow here
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
      // Reset video to beginning
      videoRef.current.currentTime = 0
      currentTimeRef.current = 0
      setVideoCompleted(false)
      setShowVideo(true)
      
      // Play the video
      videoRef.current.play().catch(error => {
        console.log("Autoplay prevented:", error)
      })
    }
  }

  const handleVideoError = () => {
    console.error("Video failed to load")
    setShowVideo(false)
    setVideoCompleted(true)
  }

  // Render appropriate control button based on video state
  const renderControlButton = () => {
    if (videoCompleted) {
      // Show retry button when video is completed
      return (
        <button
          className={styles.controlButton}
          onClick={handleRetryVideo}
          aria-label="Replay video"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
        </button>
      )
    } else if (showVideo) {
      // Show mute/unmute button when video is playing
      return (
        <button
          className={styles.controlButton}
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
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
      {/* User Interaction Modal */}
      {showUserModal && (
        <div className={styles.modalOverlay}>
          <div 
            ref={modalRef}
            className={styles.userModal}
          >
            <div className={styles.modalHeader}>
              <h2>Who's Watching?</h2>
              <p>Choose how you'd like to experience our content</p>
            </div>
            
            <div className={styles.modalOptions}>
              <button 
                className={styles.optionButton}
                onClick={() => handleUserSelection('subscriber')}
              >
                <div className={styles.optionIcon}>👤</div>
                <div className={styles.optionText}>
                  <strong>I'm a Subscriber</strong>
                  <span>Log me in to continue watching</span>
                </div>
              </button>
              
              <button 
                className={styles.optionButton}
                onClick={() => handleUserSelection('guest')}
              >
                <div className={styles.optionIcon}>🎭</div>
                <div className={styles.optionText}>
                  <strong>I'm a Guest</strong>
                  <span>Continue without logging in</span>
                </div>
              </button>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.closeButton}
                onClick={() => handleUserSelection('close')}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <section className={styles.heroBanner}>
        {/* Background video or image based on state */}
        {featuredTrendingVideo && showVideo && !videoCompleted ? (
          <>
            <video
              ref={videoRef}
              className={styles.heroVideo}
              src={featuredTrendingVideo}
              autoPlay
              loop={false} // Remove loop to allow completion detection
              muted={isMuted}
              playsInline
              onError={handleVideoError}
              poster={featured.wide_poster_url || "/cinematic-movie-scene.png"}
            />
            {/* Control Button */}
            {renderControlButton()}
          </>
        ) : (
          <>
            <div
              className={styles.heroImage}
              style={{
                backgroundImage: featured.wide_poster_url
                  ? `url('${featured.wide_poster_url}')`
                  : "url('/cinematic-movie-scene.png')"
              }}
            />
            {/* Show retry button over image when video is completed */}
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
      </section>

      <main className={styles.contentMain}>
        {rows.map((row, index) => (
          <ContentCarousel
            key={`${row.title}-${index}`}
            title={row.title}
            items={row.content}
          />
        ))}
      </main>

      <footer className={styles.footer}>
        <p>© 2024 Netflix Clone. This is a demo project for educational purposes.</p>
      </footer>
    </div>
  )
}