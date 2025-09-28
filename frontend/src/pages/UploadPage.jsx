"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"

const CLOUDINARY_WIDGET_URL = "https://widget.cloudinary.com/v2.0/global/all.js"

export default function UploadPage() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    release_year: new Date().getFullYear(),
    language: "English",
    poster_url: "",
    wide_poster_url: "",
    hash_code: "", // For movies only
    is_premium: false,
    duration: null, // For movies only
    is_animated: false, // For series/anime
    content_type: "movie", // movie, series, anime
  })

  const [message, setMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [widgetReady, setWidgetReady] = useState(false)
  const [uploadType, setUploadType] = useState("poster") // poster, wide_poster
  const [recentContent, setRecentContent] = useState([])
  const [activeTab, setActiveTab] = useState("movies")
  const [episodeJson, setEpisodeJson] = useState("")
  const [parsedEpisodes, setParsedEpisodes] = useState([])
  const [isUploadingEpisodes, setIsUploadingEpisodes] = useState(false)

  const API_BASE = useMemo(
    () => import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api",
    []
  )
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET

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

    loadRecentContent();
  }, [API_BASE, activeTab])

  const loadRecentContent = () => {
    const endpoint = activeTab === "movies" ? "movies" : "series"
    axios.get(`${API_BASE}/${endpoint}?limit=10`)
      .then((res) => setRecentContent(res.data))
      .catch((err) => console.error(err))
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }))
  }

  const handleUpload = (type) => {
    if (!widgetReady || !window.cloudinary) {
      alert("Cloudinary widget not ready yet")
      return
    }
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      alert("Missing Cloudinary env vars")
      return
    }

    setUploadType(type)
    setIsUploading(true)
    
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources: ["local", "url", "camera"],
        resourceType: "image",
        multiple: false,
        theme: "minimal",
        cropping: false,
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
          if (type === "poster") {
            setForm((prev) => ({ ...prev, poster_url: url || "" }))
          } else if (type === "wide_poster") {
            setForm((prev) => ({ ...prev, wide_poster_url: url || "" }))
          }
          setMessage(`${type.replace('_', ' ')} uploaded ✅`)
          setIsUploading(false)
        }
        if (result?.event === "close") {
          setIsUploading(false)
        }
      }
    )
    widget.open()
  }

  const handleJsonUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const jsonContent = event.target.result
        setEpisodeJson(jsonContent)
        
        const episodesData = JSON.parse(jsonContent)
        const formattedEpisodes = episodesData.map(ep => ({
          episode_number: parseInt(ep.ep),
          hash_code: ep.key,
          status: ep.status || 'Sub',
          release_date: new Date().toISOString().split('T')[0] // Default to today
        }))
        
        setParsedEpisodes(formattedEpisodes)
        setMessage(`✅ Parsed ${formattedEpisodes.length} episodes`)
      } catch (err) {
        console.error(err)
        setMessage("❌ Invalid JSON file")
      }
    }
    reader.readAsText(file)
  }

  const uploadEpisodes = async (seriesId) => {
    if (parsedEpisodes.length === 0) {
      setMessage("No episodes to upload")
      return
    }

    setIsUploadingEpisodes(true)
    try {
      const token = localStorage.getItem("token")
      const parsedId = seriesId.replace('s_', '') // Remove prefix if present
      
      await axios.post(`${API_BASE}/series/${parsedId}/episodes/bulk`, {
        episodes: parsedEpisodes
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      setMessage(`✅ ${parsedEpisodes.length} episodes uploaded successfully`)
      setEpisodeJson("")
      setParsedEpisodes([])
      
      // Reload recent content to show updated series
      loadRecentContent()
    } catch (err) {
      console.error(err)
      setMessage(err?.response?.data?.error || "Error uploading episodes ❌")
    } finally {
      setIsUploadingEpisodes(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")

    // Basic validation
    if (!form.title || !form.poster_url) {
      setMessage("Title and poster are required.")
      return
    }

    try {
      const token = localStorage.getItem("token")
      let endpoint = "movies"
      let payload = { ...form }

      if (form.content_type === "series" || form.content_type === "anime") {
        endpoint = "series"
        // For anime, ensure is_animated is true
        if (form.content_type === "anime") {
          payload.is_animated = true
        }
        // Remove movie-specific fields
        delete payload.duration
        delete payload.hash_code
      } else {
        // For movies, remove series-specific fields
        delete payload.is_animated
      }

      // Remove content_type from payload as it's not in the database
      delete payload.content_type

      const response = await axios.post(`${API_BASE}/${endpoint}`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      setMessage(`${form.content_type} created successfully ✅`)
      
      // If we have episodes to upload and it's a series/anime
      if ((form.content_type === "series" || form.content_type === "anime") && parsedEpisodes.length > 0) {
        const seriesId = response.data.series_id
        await uploadEpisodes(seriesId)
      }

      // Reset form
      setForm({
        title: "",
        description: "",
        release_year: new Date().getFullYear(),
        language: "English",
        poster_url: "",
        wide_poster_url: "",
        hash_code: "",
        is_premium: false,
        duration: null,
        is_animated: false,
        content_type: "movie",
      })

      // Clear episodes
      setEpisodeJson("")
      setParsedEpisodes([])

      // Reload recent content
      loadRecentContent()
    } catch (err) {
      console.error(err)
      setMessage(err?.response?.data?.error || `Error creating ${form.content_type} ❌`)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-red-600">NIKOFLIX ADMIN - UPLOADS</h1>
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
            <span className="font-bold">A</span>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left Panel - Form */}
        <div className="w-1/2 bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-6 text-white border-b border-gray-700 pb-2">
            Upload New Content
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium">Content Type</label>
              <div className="flex space-x-2 mb-4">
                <button
                  type="button"
                  className={`px-4 py-2 rounded ${form.content_type === "movie" ? "bg-red-600" : "bg-gray-700"}`}
                  onClick={() => setForm(prev => ({ ...prev, content_type: "movie" }))}
                >
                  Movie
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded ${form.content_type === "series" ? "bg-red-600" : "bg-gray-700"}`}
                  onClick={() => setForm(prev => ({ ...prev, content_type: "series", is_animated: false }))}
                >
                  Series
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded ${form.content_type === "anime" ? "bg-red-600" : "bg-gray-700"}`}
                  onClick={() => setForm(prev => ({ ...prev, content_type: "anime", is_animated: true }))}
                >
                  Anime
                </button>
              </div>
            </div>


            <div>
              <label className="block mb-2 text-sm font-medium">Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-500"
                required
                />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="3"
                className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-500"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Release Year</label>
                <input
                  type="number"
                  name="release_year"
                  value={form.release_year}
                  onChange={handleChange}
                  min="1900"
                  max="2030"
                  className="w-full p-3 rounded bg-gray-800 text-white"
                  />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Language</label>
                <select
                  name="language"
                  value={form.language}
                  onChange={handleChange}
                  className="w-full p-3 rounded bg-gray-800 text-white"
                  >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Korean">Korean</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Episode JSON Upload Section (only show for series/anime) */}
            {(form.content_type === "series" || form.content_type === "anime") && (
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-bold mb-4">Episode Upload (JSON)</h3>
                
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium">Upload Episode JSON File</label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleJsonUpload}
                    className="w-full p-2 rounded bg-gray-800 text-white"
                  />
                </div>

                {parsedEpisodes.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">
                      Parsed Episodes ({parsedEpisodes.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto bg-gray-800 p-2 rounded">
                      {parsedEpisodes.map((ep, index) => (
                        <div key={index} className="text-xs mb-1 p-1 bg-gray-700 rounded">
                          Ep {ep.episode_number} - {ep.status} - {ep.hash_code.substring(0, 20)}...
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {form.content_type === "movie" && (
              <>
                <div>
                  <label className="block mb-2 text-sm font-medium">Duration (minutes)</label>
                  <input
                    type="number"
                    name="duration"
                    value={form.duration || ""}
                    onChange={handleChange}
                    min="1"
                    className="w-full p-3 rounded bg-gray-800 text-white"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">Movie Hash Code/URL</label>
                  <input
                    type="text"
                    name="hash_code"
                    value={form.hash_code}
                    onChange={handleChange}
                    placeholder="Enter video URL or hash code"
                    className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-500"
                  />
                </div>
              </>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_premium"
                name="is_premium"
                checked={form.is_premium}
                onChange={handleChange}
                className="mr-2"
              />
              <label htmlFor="is_premium" className="text-sm">
                Premium Content
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Poster Image</label>
                <button
                  type="button"
                  onClick={() => handleUpload("poster")}
                  disabled={!widgetReady || isUploading}
                  className={`w-full px-4 py-3 rounded font-medium ${
                    isUploading && uploadType === "poster" 
                      ? "bg-gray-700 cursor-not-allowed" 
                      : form.poster_url 
                      ? "bg-green-700 hover:bg-green-800"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {isUploading && uploadType === "poster" 
                    ? "Uploading..." 
                    : form.poster_url 
                    ? "Poster Uploaded ✅" 
                    : "Upload Poster"}
                </button>

                {form.poster_url && (
                  <div className="mt-2">
                    <img
                      src={form.poster_url}
                      alt="Poster preview"
                      className="w-32 h-48 object-cover rounded border border-gray-700"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Wide Poster Image (Optional)</label>
                <button
                  type="button"
                  onClick={() => handleUpload("wide_poster")}
                  disabled={!widgetReady || isUploading}
                  className={`w-full px-4 py-3 rounded font-medium ${
                    isUploading && uploadType === "wide_poster" 
                      ? "bg-gray-700 cursor-not-allowed" 
                      : form.wide_poster_url 
                      ? "bg-green-700 hover:bg-green-800"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {isUploading && uploadType === "wide_poster" 
                    ? "Uploading..." 
                    : form.wide_poster_url 
                    ? "Wide Poster Uploaded ✅" 
                    : "Upload Wide Poster"}
                </button>

                {form.wide_poster_url && (
                  <div className="mt-2">
                    <img
                      src={form.wide_poster_url}
                      alt="Wide poster preview"
                      className="w-full h-32 object-cover rounded border border-gray-700"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!form.title || !form.poster_url || isUploadingEpisodes}
              className={`w-full p-3 rounded font-medium mt-4 ${
                !form.title || !form.poster_url || isUploadingEpisodes
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isUploadingEpisodes ? "Uploading Episodes..." : `Create ${form.content_type.charAt(0).toUpperCase() + form.content_type.slice(1)}`}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded ${message.includes("✅") ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
              {message}
            </div>
          )}
        </div>

        {/* Right Panel - Recent Content */}
        <div className="flex-1">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">Recent Uploads</h2>
            <div className="flex space-x-2 mb-4">
              <button
                className={`px-4 py-2 rounded ${activeTab === "movies" ? "bg-red-600" : "bg-gray-700"}`}
                onClick={() => setActiveTab("movies")}
              >
                Movies
              </button>
              <button
                className={`px-4 py-2 rounded ${activeTab === "series" ? "bg-red-600" : "bg-gray-700"}`}
                onClick={() => setActiveTab("series")}
              >
                Series & Anime
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {recentContent.map((item) => (
              <div key={item.id} className="bg-gray-900 p-4 rounded-lg">
                <div className="flex">
                  {item.poster_url && (
                    <img
                      src={item.poster_url}
                      alt={item.title}
                      className="w-16 h-24 object-cover rounded mr-4"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white truncate">{item.title}</h3>
                    <p className="text-gray-400 text-sm">{item.release_year}</p>
                    <p className="text-gray-400 text-sm capitalize">
                      {activeTab === "series" && item.is_animated ? "Anime" : activeTab}
                      {item.is_premium && " • Premium"}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">{item.id}</p>
                  </div>
                </div>
              </div>
            ))}
            {recentContent.length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-500">
                No {activeTab} found. Upload some using the form on the left.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}