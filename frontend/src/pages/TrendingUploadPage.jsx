"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import ContentCard from "../components/ContentCard"
import TrendingItemCard from "../components/TrendingItemCard"

const CLOUDINARY_WIDGET_URL = "https://widget.cloudinary.com/v2.0/global/all.js"

export default function TrendingUploadsPage() {
  const [form, setForm] = useState({
    content_id: "",
    content_type: "movie",
    trending_type: "movie",
    position: 1,
    video_url: "",
    expires_at: "", // New field for expiration
  })

  const [message, setMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [widgetReady, setWidgetReady] = useState(false)
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [recentTrending, setRecentTrending] = useState([])
  const [selectedContent, setSelectedContent] = useState(null)
  const [activeTab, setActiveTab] = useState("movies")
  const [animatedOnly, setAnimatedOnly] = useState(false)
  const [isDeleting, setIsDeleting] = useState(null)

  const API_BASE = useMemo(
    () => import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api",
    []
  )
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET

  // Calculate available positions based on current trending data
  const availablePositions = useMemo(() => {
    const MAX_POSITIONS = 10;
    
    const occupiedPositions = recentTrending
      .filter(item => item.trending_type === form.trending_type)
      .map(item => item.position);
    
    const available = [];
    for (let i = 1; i <= MAX_POSITIONS; i++) {
      if (!occupiedPositions.includes(i)) {
        available.push(i);
      }
    }
    
    return available;
  }, [recentTrending, form.trending_type]);

  useEffect(() => {
    if (window.cloudinary) {
      setWidgetReady(true)
    } else {
      const script = document.createElement("script")
      script.src = CLOUDINARY_WIDGET_URL
      script.async = true
      script.onload = () => setWidgetReady(true)
      document.head.appendChild(script)
    }

    loadTrendingItems();
  }, [API_BASE])

  const loadTrendingItems = () => {
    axios.get(`${API_BASE}/trending`)
      .then((res) => setRecentTrending(res.data))
      .catch((err) => console.error(err))
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search.trim() === "") {
        setSearchResults([])
        return
      }

      const endpoint = activeTab === "movies" ? "movies" : "series"
      axios
        .get(`${API_BASE}/${endpoint}?q=${encodeURIComponent(search.trim())}`)
        .then((res) => {
          if (activeTab === "series" && animatedOnly) {
            setSearchResults(res.data.filter(item => item.is_animated))
          } else {
            setSearchResults(res.data)
          }
        })
        .catch((err) => console.error(err))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [search, API_BASE, activeTab, animatedOnly])

  // Auto-select first available position when trending type changes
  useEffect(() => {
    if (availablePositions.length > 0 && !availablePositions.includes(form.position)) {
      setForm(prev => ({ ...prev, position: availablePositions[0] }))
    }
  }, [availablePositions, form.position])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleUpload = () => {
    if (!widgetReady || !window.cloudinary) {
      alert("Cloudinary widget not ready yet")
      return
    }
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      alert("Missing Cloudinary env vars")
      return
    }

    setIsUploading(true)
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources: ["local", "url", "camera"],
        resourceType: "video",
        multiple: false,
        theme: "minimal",
      },
      (error, result) => {
        if (error) {
          console.error(error)
          setMessage("Upload failed ❌")
          setIsUploading(false)
          return
        }
        if (result?.event === "success") {
          const url = result.info?.secure_url
          setForm((prev) => ({ ...prev, video_url: url || "" }))
          setMessage("Uploaded ✅")
          setIsUploading(false)
        }
        if (result?.event === "close") {
          setIsUploading(false)
        }
      }
    )
    widget.open()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")

    if (!form.content_id || !form.video_url) {
      setMessage("Content ID and video URL are required.")
      return
    }

    try {
      const token = localStorage.getItem("token")
      await axios.post(`${API_BASE}/trending`, form, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      setMessage("Trending item saved ✅")
      setForm((prev) => ({
        ...prev,
        content_id: "",
        position: 1,
        video_url: "",
        expires_at: "",
      }))
      setSelectedContent(null)

      // Reload trending items to update available positions
      loadTrendingItems();
    } catch (err) {
      console.error(err)
      setMessage(err?.response?.data?.error || "Error adding trending item ❌")
    }
  }

  const handleDelete = async (trendingId) => {
    if (!window.confirm("Are you sure you want to remove this item from trending? This will also delete the video from Cloudinary.")) {
      return;
    }

    setIsDeleting(trendingId);
    try {
      const token = localStorage.getItem("token")
      const response = await axios.delete(`${API_BASE}/trending/${trendingId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      setMessage(`Trending item removed ${response.data.cloudinaryDeleted ? "and video deleted" : ""} ✅`)
      // Reload trending items to update available positions
      loadTrendingItems();
    } catch (err) {
      console.error(err)
      const errorMsg = err?.response?.data?.error || "Error removing trending item ❌"
      setMessage(errorMsg.includes("Cloudinary") ? 
        "Item removed but Cloudinary deletion failed. Video may still exist." : 
        errorMsg)
    } finally {
      setIsDeleting(null);
    }
  }

  const selectContent = (content) => {
    setSelectedContent(content)
    
    // Determine content type and trending type automatically
    const contentType = activeTab === "movies" ? "movie" : "series"
    const trendingType = (contentType === "series" && content.is_animated) ? "anime" : contentType
    
    setForm(prev => ({ 
      ...prev, 
      content_id: content.id,
      content_type: contentType,
      trending_type: trendingType
    }))
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-red-600">NIKOFLIX ADMIN</h1>
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
            <span className="font-bold">A</span>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left Panel - Form */}
        <div className="w-1/3 bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-6 text-white border-b border-gray-700 pb-2">
            Add Trending Content
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium">Content Type</label>
              <div className="flex space-x-2 mb-4">
                <button
                  type="button"
                  className={`px-4 py-2 rounded ${activeTab === "movies" ? "bg-red-600" : "bg-gray-700"}`}
                  onClick={() => setActiveTab("movies")}
                >
                  Movies
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded ${activeTab === "series" ? "bg-red-600" : "bg-gray-700"}`}
                  onClick={() => setActiveTab("series")}
                >
                  Series
                </button>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Search {activeTab === "movies" ? "Movies" : "Series"}</label>
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-500"
              />
            </div>

            {activeTab === "series" && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="animated-only"
                  checked={animatedOnly}
                  onChange={(e) => setAnimatedOnly(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="animated-only" className="text-sm">
                  Show animated series only
                </label>
              </div>
            )}

            {selectedContent && (
              <div className="bg-gray-800 p-4 rounded-lg mb-4">
                <h3 className="font-semibold">Selected Content:</h3>
                <p className="text-red-500 font-medium">{selectedContent.title} ({selectedContent.release_year})</p>
                {selectedContent.is_animated !== undefined && (
                  <p className="text-gray-400 text-sm">
                    Type: {selectedContent.is_animated ? "Animated Series" : "Live Action Series"}
                  </p>
                )}
                <p className="text-gray-400 text-sm">
                  Content Type: <span className="text-white">{form.content_type}</span>
                </p>
                <p className="text-gray-400 text-sm">
                  Trending Type: <span className="text-white capitalize">{form.trending_type}</span>
                </p>
              </div>
            )}

            <div className="hidden">
              <input type="hidden" name="content_id" value={form.content_id} />
              <input type="hidden" name="content_type" value={form.content_type} />
              <input type="hidden" name="trending_type" value={form.trending_type} />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Position for {form.trending_type} trending
                <span className="text-gray-400 ml-2">
                  ({availablePositions.length} of 10 available)
                </span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {availablePositions.map(pos => (
                  <button
                    key={pos}
                    type="button"
                    className={`p-2 rounded text-center ${
                      parseInt(form.position) === pos 
                        ? "bg-red-600 text-white" 
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                    onClick={() => setForm(prev => ({ ...prev, position: pos }))}
                  >
                    {pos}
                  </button>
                ))}
              </div>
              {availablePositions.length === 0 && (
                <p className="text-red-400 text-sm mt-2">
                  No positions available for {form.trending_type} trending. Remove some items first.
                </p>
              )}
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Expiration Date (Optional)</label>
              <input
                type="datetime-local"
                name="expires_at"
                value={form.expires_at}
                onChange={handleChange}
                className="w-full p-3 rounded bg-gray-800 text-white"
              />
              <p className="text-gray-400 text-xs mt-1">
                Leave empty for no expiration
              </p>
            </div>

            <div className="space-y-2">
              <label className="block mb-2 text-sm font-medium">Trailer Video</label>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!widgetReady || isUploading || !selectedContent}
                className={`w-full px-4 py-3 rounded font-medium ${
                  isUploading 
                    ? "bg-gray-700 cursor-not-allowed" 
                    : !selectedContent
                    ? "bg-gray-700 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {!selectedContent ? "Select content first" : isUploading ? "Uploading..." : "Upload Trailer"}
              </button>

              {form.video_url && (
                <div className="mt-2">
                  <video
                    src={form.video_url}
                    className="w-full rounded border border-gray-700"
                    controls
                    muted
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!selectedContent || !form.video_url || availablePositions.length === 0}
              className={`w-full p-3 rounded font-medium mt-4 ${
                !selectedContent || !form.video_url || availablePositions.length === 0
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {!selectedContent ? "Select content first" : 
               !form.video_url ? "Upload trailer first" :
               availablePositions.length === 0 ? "No positions available" :
               `Add to ${form.trending_type} trending`}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded ${message.includes("✅") ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
              {message}
            </div>
          )}
        </div>

        {/* Right Panel - Search Results and Recent Items */}
        <div className="flex-1">
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">
                {activeTab === "movies" ? "Movie" : "Series"} Search Results
                {activeTab === "series" && animatedOnly && " (Animated Only)"}
              </h2>
              <div className="grid grid-cols-4 gap-4">
                {searchResults.map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    isSelected={selectedContent?.id === item.id}
                    onClick={() => selectContent(item)}
                    showType={activeTab === "series"}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Trending Items */}
          <div>
            <h2 className="text-xl font-bold mb-4">Current Trending Items</h2>
            <div className="grid grid-cols-2 gap-4">
              {recentTrending.map((item) => (
                <div key={item.trending_id} className="bg-gray-900 p-4 rounded-lg relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-white">
                        {item.content_type} ID {item.content_id}
                      </h3>
                      <p className="text-gray-400 text-sm capitalize">{item.trending_type}</p>
                      <p className="text-gray-400 text-sm">Position: {item.position}</p>
                      {item.expires_at && (
                        <p className="text-gray-400 text-sm">
                          Expires: {new Date(item.expires_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <a 
                        href={item.video_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-red-500 hover:text-red-400 text-sm font-medium"
                      >
                        Watch
                      </a>
                      <button
                        onClick={() => handleDelete(item.trending_id)}
                        disabled={isDeleting === item.trending_id}
                        className="text-xs bg-red-800 hover:bg-red-700 px-2 py-1 rounded text-white disabled:opacity-50"
                      >
                        {isDeleting === item.trending_id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {recentTrending.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  No trending items found. Add some using the form on the left.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}