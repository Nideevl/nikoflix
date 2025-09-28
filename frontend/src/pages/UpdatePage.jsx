"use client"

import { useState, useMemo, useEffect } from "react"
import axios from "axios"

const CLOUDINARY_WIDGET_URL = "https://widget.cloudinary.com/v2.0/global/all.js"

export default function UpdatePage() {
  const [searchType, setSearchType] = useState("movies")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [form, setForm] = useState({})
  const [message, setMessage] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [episodes, setEpisodes] = useState([])
  const [newEpisode, setNewEpisode] = useState({
    episode_number: "",
    release_date: "",
    hash_code: "",
    status: "Sub",
    duration: ""
  })
  const [widgetReady, setWidgetReady] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadType, setUploadType] = useState("")

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
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setMessage("")
      return
    }

    setIsSearching(true)
    try {
      let endpoint = "movies"
      let params = { q: searchQuery.trim() }
      
      if (searchType === "series") {
        endpoint = "series"
      } else if (searchType === "anime") {
        endpoint = "series"
        params.is_animated = true
      }

      const response = await axios.get(
        `${API_BASE}/${endpoint}`,
        { params }
      )
      setSearchResults(response.data)
      setMessage(`Found ${response.data.length} results`)
    } catch (err) {
      console.error(err)
      setMessage("Search failed ❌")
    } finally {
      setIsSearching(false)
    }
  }

  // Auto search when query/type changes (debounced)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleSearch()
    }, 500)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery, searchType])

  const selectItem = async (item) => {
    setSelectedItem(item)
    setForm({
      title: item.title || "",
      description: item.description || "",
      release_year: item.release_year || new Date().getFullYear(),
      language: item.language || "English",
      poster_url: item.poster_url || "",
      wide_poster_url: item.wide_poster_url || "",
      hash_code: item.hash_code || "",
      is_premium: item.is_premium || false,
      duration: item.duration || null,
      is_animated: item.is_animated || false,
    })

    // If it's a series or anime, load episodes
    if (searchType === "series" || searchType === "anime") {
      try {
        const id = item.id || item.series_id
        const response = await axios.get(`${API_BASE}/series/${id}`)
        setEpisodes(response.data.episodes || [])
      } catch (err) {
        console.error("Error loading episodes:", err)
        setEpisodes([])
      }
    } else {
      setEpisodes([])
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleEpisodeChange = (e) => {
    const { name, value } = e.target
    setNewEpisode((prev) => ({
      ...prev,
      [name]: value,
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
        cropping: false
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

const deleteImage = async (type) => {
  if (!window.confirm(`Are you sure you want to delete this ${type.replace('_', ' ')}?`)) return;

  try {
    const token = localStorage.getItem("token");
    const url = type === "poster" ? form.poster_url : form.wide_poster_url;
    
    if (!url) {
      setMessage("No image URL found");
      return;
    }

    // Get content info for specific deletion
    const content_type = searchType === "movies" ? "movies" : "series";
    const content_id = selectedItem.id || selectedItem.movie_id || selectedItem.series_id;

    console.log("🔄 Deleting image with:", { content_type, content_id, url });

    // Single API call that handles both Cloudinary and database
    const response = await axios.delete(
      `${API_BASE}/cloudinary/delete-image`,
      {
        data: { 
          image_url: url,
          content_type: content_type,
          content_id: content_id
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    console.log("✅ Delete response:", response.data);

    // Update local form state
    if (type === "poster") {
      setForm((prev) => ({ ...prev, poster_url: "" }));
    } else {
      setForm((prev) => ({ ...prev, wide_poster_url: "" }));
    }

    // Refresh the item to get updated data from database
    await selectItem(selectedItem);

    setMessage(`${type.replace('_', ' ')} deleted successfully ✅`);
  } catch (err) {
    console.error("Delete image error:", err);
    setMessage(`Error deleting ${type.replace('_', ' ')} ❌: ${err.response?.data?.error || err.message}`);
  }
};

  const addEpisode = async () => {
    if (!selectedItem || !newEpisode.episode_number || !newEpisode.hash_code) {
      setMessage("Episode number and hash code are required")
      return
    }

    try {
      const token = localStorage.getItem("token")
      const id = selectedItem.id || selectedItem.series_id
      const response = await axios.post(
        `${API_BASE}/series/${id}/episodes`,
        newEpisode,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )

      setEpisodes([...episodes, response.data])
      setNewEpisode({
        episode_number: "",
        release_date: "",
        hash_code: "",
        status: "Sub",
        duration: ""
      })
      setMessage("Episode added successfully ✅")
    } catch (err) {
      console.error(err)
      setMessage(err?.response?.data?.error || "Error adding episode ❌")
    }
  }

  const deleteEpisode = async (episodeId) => {
    if (!window.confirm("Are you sure you want to delete this episode?")) return

    try {
      const token = localStorage.getItem("token")
      console.log("id=",episodeId)
      await axios.delete(
        `${API_BASE}/cloudinary/delete-image/${episodeId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )

      setEpisodes(episodes.filter(ep => ep.episode_id !== episodeId))
      setMessage("Episode deleted successfully ✅")
    } catch (err) {
      console.error(err)
      setMessage(err?.response?.data?.error || "Error deleting episode ❌")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedItem) return

    setMessage("")

    try {
      const token = localStorage.getItem("token")
      const endpoint = searchType === "movies" ? "movies" : "series"
      const id = selectedItem.id || selectedItem.movie_id || selectedItem.series_id

      await axios.put(
        `${API_BASE}/${endpoint}/${id}`,
        form,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )

      setMessage("Content updated successfully ✅")
      handleSearch()
    } catch (err) {
      console.error(err)
      setMessage(err?.response?.data?.error || "Error updating content ❌")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-red-600">NIKOFLIX ADMIN - UPDATE CONTENT</h1>
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
            <span className="font-bold">A</span>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left Panel - Search */}
        <div className="w-1/2 bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-6 text-white border-b border-gray-700 pb-2">
            Search Content
          </h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block mb-2 text-sm font-medium">Content Type</label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  className={`px-4 py-2 rounded ${searchType === "movies" ? "bg-red-600" : "bg-gray-700"}`}
                  onClick={() => setSearchType("movies")}
                >
                  Movies
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded ${searchType === "series" ? "bg-red-600" : "bg-gray-700"}`}
                  onClick={() => setSearchType("series")}
                >
                  Series
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded ${searchType === "anime" ? "bg-red-600" : "bg-gray-700"}`}
                  onClick={() => setSearchType("anime")}
                >
                  Anime
                </button>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${searchType}...`}
                className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-500"
              />
              {isSearching && <p className="text-gray-400 text-sm mt-2">Searching...</p>}
            </div>
          </div>

          {searchResults.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Search Results</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded cursor-pointer ${
                      selectedItem?.id === item.id ? "bg-red-800" : "bg-gray-800 hover:bg-gray-700"
                    }`}
                    onClick={() => selectItem(item)}
                  >
                    <div className="flex items-center">
                      {item.poster_url && (
                        <img
                          src={item.poster_url}
                          alt={item.title}
                          className="w-12 h-16 object-cover rounded mr-3"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium truncate">{item.title}</h4>
                        <p className="text-gray-400 text-sm">{item.release_year}</p>
                        <p className="text-gray-400 text-xs">{item.id}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {message && (
            <div
              className={`mt-4 p-3 rounded ${
                message.includes("✅")
                  ? "bg-green-900 text-green-300"
                  : "bg-red-900 text-red-300"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Right Panel - Edit Form */}
        <div className="w-1/2 bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-6 text-white border-b border-gray-700 pb-2">
            {selectedItem ? "Edit Content" : "Select an item to edit"}
          </h2>

          {selectedItem && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full p-3 rounded bg-gray-800 text-white"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full p-3 rounded bg-gray-800 text-white"
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

              {searchType === "movies" && (
                <>
                  <div>
                    <label className="block mb-2 text-sm font-medium">Duration (minutes)</label>
                    <input
                      type="number"
                      name="duration"
                      value={form.duration || ""}
                      onChange={handleChange}
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
                      className="w-full p-3 rounded bg-gray-800 text-white"
                    />
                  </div>
                </>
              )}

              {(searchType === "series" || searchType === "anime") && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_animated"
                    name="is_animated"
                    checked={form.is_animated}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <label htmlFor="is_animated" className="text-sm">
                    Is Animated (Anime)
                  </label>
                </div>
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

              {/* Poster Image Section */}
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium">Poster Image</label>
                  {form.poster_url ? (
                    <div className="relative">
                      <img
                        src={form.poster_url}
                        alt="Poster preview"
                        className="w-32 h-48 object-cover rounded border border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => deleteImage("poster")}
                        className="absolute top-0 right-0 bg-red-600 text-white p-1 rounded-full"
                        title="Delete poster"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpload("poster")}
                      disabled={!widgetReady || isUploading}
                      className={`w-full px-4 py-3 rounded font-medium ${
                        isUploading && uploadType === "poster" 
                          ? "bg-gray-700 cursor-not-allowed" 
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {isUploading && uploadType === "poster" 
                        ? "Uploading..." 
                        : "Upload Poster"}
                    </button>
                  )}
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">Wide Poster Image (Optional)</label>
                  {form.wide_poster_url ? (
                    <div className="relative">
                      <img
                        src={form.wide_poster_url}
                        alt="Wide poster preview"
                        className="w-full h-32 object-cover rounded border border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => deleteImage("wide_poster")}
                        className="absolute top-0 right-0 bg-red-600 text-white p-1 rounded-full"
                        title="Delete wide poster"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpload("wide_poster")}
                      disabled={!widgetReady || isUploading}
                      className={`w-full px-4 py-3 rounded font-medium ${
                        isUploading && uploadType === "wide_poster" 
                          ? "bg-gray-700 cursor-not-allowed" 
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {isUploading && uploadType === "wide_poster" 
                        ? "Uploading..." 
                        : "Upload Wide Poster"}
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full p-3 bg-red-600 rounded font-medium hover:bg-red-700"
              >
                Update Content
              </button>
            </form>
          )}

          {/* Episode Management for Series/Anime */}
          {(searchType === "series" || searchType === "anime") && selectedItem && (
            <div className="mt-8 pt-6 border-t border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Episodes</h3>
              
              {/* Add Episode Form */}
              <div className="bg-gray-800 p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-3">Add New Episode</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block mb-1 text-sm">Episode Number</label>
                    <input
                      type="number"
                      name="episode_number"
                      value={newEpisode.episode_number}
                      onChange={handleEpisodeChange}
                      className="w-full p-2 rounded bg-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm">Status</label>
                    <select
                      name="status"
                      value={newEpisode.status}
                      onChange={handleEpisodeChange}
                      className="w-full p-2 rounded bg-gray-700 text-white"
                    >
                      <option value="Sub">Sub</option>
                      <option value="Dub">Dub</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm">Release Date</label>
                    <input
                      type="date"
                      name="release_date"
                      value={newEpisode.release_date}
                      onChange={handleEpisodeChange}
                      className="w-full p-2 rounded bg-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm">Duration (min)</label>
                    <input
                      type="number"
                      name="duration"
                      value={newEpisode.duration}
                      onChange={handleEpisodeChange}
                      className="w-full p-2 rounded bg-gray-700 text-white"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block mb-1 text-sm">Hash Code/URL</label>
                  <input
                    type="text"
                    name="hash_code"
                    value={newEpisode.hash_code}
                    onChange={handleEpisodeChange}
                    className="w-full p-2 rounded bg-gray-700 text-white"
                    placeholder="Enter hash code or URL"
                  />
                </div>
                <button
                  type="button"
                  onClick={addEpisode}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                  Add Episode
                </button>
              </div>

              {/* Episode List */}
              {episodes.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {episodes.map((episode) => (
                    <div key={episode.episode_id} className="bg-gray-800 p-3 rounded flex justify-between items-center">
                      <div>
                        <div className="font-medium">Episode {episode.episode_number} ({episode.status})</div>
                        <div className="text-sm text-gray-400">
                          {episode.release_date} • {episode.duration || 'N/A'} min
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {episode.hash_code}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteEpisode(episode.episode_id)}
                        className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">No episodes added yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}