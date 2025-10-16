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
    expires_at: "",
  })

  const [message, setMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [widgetReady, setWidgetReady] = useState(false)
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [recentTrending, setRecentTrending] = useState([])
  const [selectedContent, setSelectedContent] = useState(null)
  const [activeTab, setActiveTab] = useState("movies")
  const [isDeleting, setIsDeleting] = useState(null)

  const API_BASE = useMemo(
    () => import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api",
    []
  )
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET

  // Calculate available positions for each trending type separately
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

  // Group trending items by type for display
  const trendingByType = useMemo(() => {
    const grouped = {
      movie: [],
      series: [],
      anime: []
    };

    recentTrending.forEach(item => {
      if (grouped[item.trending_type]) {
        grouped[item.trending_type].push(item);
      }
    });

    // Sort each group by position
    Object.keys(grouped).forEach(type => {
      grouped[type].sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [recentTrending]);

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

      let endpoint = "movies";
      let query = search.trim();

      if (activeTab === "series" || activeTab === "anime") {
        endpoint = "series";
      }

      axios
        .get(`${API_BASE}/${endpoint}?q=${encodeURIComponent(query)}`)
        .then((res) => {
          let results = res.data;

          // Filter based on active tab
          if (activeTab === "series") {
            // Series tab: only show live-action series (is_animated = false)
            results = results.filter(item => !item.is_animated);
          } else if (activeTab === "anime") {
            // Anime tab: only show animated series (is_animated = true)
            results = results.filter(item => item.is_animated);
          }

          setSearchResults(results);
        })
        .catch((err) => console.error(err))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [search, API_BASE, activeTab])

  // Auto-select first available position when trending type changes
  useEffect(() => {
    if (availablePositions.length > 0 && !availablePositions.includes(form.position)) {
      setForm(prev => ({ ...prev, position: availablePositions[0] }))
    }
  }, [availablePositions, form.position])

  // Reset form when tab changes
  useEffect(() => {
    setSelectedContent(null);
    setSearch("");
    setSearchResults([]);

    let contentType = "movie";
    let trendingType = "movie";

    if (activeTab === "series") {
      contentType = "series";
      trendingType = "series";
    } else if (activeTab === "anime") {
      contentType = "series";
      trendingType = "anime";
    }

    setForm(prev => ({
      ...prev,
      content_id: "",
      content_type: contentType,
      trending_type: trendingType,
      position: 1,
      video_url: "",
    }));
  }, [activeTab])

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
      setSearchResults([])

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
    setForm(prev => ({
      ...prev,
      content_id: content.id,
      // content_type and trending_type are already set based on activeTab
    }))
  }

  const getTabLabel = (tab) => {
    switch (tab) {
      case "movies": return "Movies";
      case "series": return "Series";
      case "anime": return "Anime";
      default: return tab;
    }
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
                <button
                  type="button"
                  className={`px-4 py-2 rounded ${activeTab === "anime" ? "bg-red-600" : "bg-gray-700"}`}
                  onClick={() => setActiveTab("anime")}
                >
                  Anime
                </button>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Search {getTabLabel(activeTab)}</label>
              <input
                type="text"
                placeholder={`Search ${getTabLabel(activeTab).toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-500"
              />
            </div>

            {selectedContent && (
              <div className="bg-gray-800 p-4 rounded-lg mb-4">
                <h3 className="font-semibold">Selected Content:</h3>
                <p className="text-red-500 font-medium">{selectedContent.title} ({selectedContent.release_year})</p>
                <p className="text-gray-400 text-sm">
                  Type: {activeTab === "movies" ? "Movie" : activeTab === "series" ? "Live Action Series" : "Anime Series"}
                </p>
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
                    className={`p-2 rounded text-center ${parseInt(form.position) === pos
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
                className={`w-full px-4 py-3 rounded font-medium ${isUploading
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
              className={`w-full p-3 rounded font-medium mt-4 ${!selectedContent || !form.video_url || availablePositions.length === 0
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

        {/* Right Panel - Search Results and Current Trending */}
        <div className="flex-1">
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">
                {getTabLabel(activeTab)} Search Results
              </h2>
              <div className="grid grid-cols-4 gap-4">
                {searchResults.map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    isSelected={selectedContent?.id === item.id}
                    onClick={() => selectContent(item)}
                    showType={activeTab === "series" || activeTab === "anime"}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Current Trending Items by Type */}
          <div className="space-y-8">
            {/* Movies Trending */}
            <div>
              <h2 className="text-xl font-bold mb-4 text-white">Movies Trending</h2>
              <div className="grid grid-cols-2 gap-4">
                {trendingByType.movie.map((item) => (
                  <TrendingItemCard
                    key={item.trending_id}
                    item={item}
                    onDelete={handleDelete}
                    isDeleting={isDeleting === item.trending_id}
                  />
                ))}
                {trendingByType.movie.length === 0 && (
                  <div className="col-span-2 text-center py-4 text-gray-500 bg-gray-800 rounded-lg">
                    No movies in trending
                  </div>
                )}
              </div>
            </div>

            {/* Series Trending */}
            <div>
              <h2 className="text-xl font-bold mb-4 text-white">Series Trending</h2>
              <div className="grid grid-cols-2 gap-4">
                {trendingByType.series.map((item) => (
                  <TrendingItemCard
                    key={item.trending_id}
                    item={item}
                    onDelete={handleDelete}
                    isDeleting={isDeleting === item.trending_id}
                  />
                ))}
                {trendingByType.series.length === 0 && (
                  <div className="col-span-2 text-center py-4 text-gray-500 bg-gray-800 rounded-lg">
                    No series in trending
                  </div>
                )}
              </div>
            </div>

            {/* Anime Trending */}
            <div>
              <h2 className="text-xl font-bold mb-4 text-white">Anime Trending</h2>
              <div className="grid grid-cols-2 gap-4">
                {trendingByType.anime.map((item) => (
                  <TrendingItemCard
                    key={item.trending_id}
                    item={item}
                    onDelete={handleDelete}
                    isDeleting={isDeleting === item.trending_id}
                  />
                ))}
                {trendingByType.anime.length === 0 && (
                  <div className="col-span-2 text-center py-4 text-gray-500 bg-gray-800 rounded-lg">
                    No anime in trending
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}