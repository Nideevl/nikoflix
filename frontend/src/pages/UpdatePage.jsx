"use client"

import { useState, useMemo, useEffect } from "react"
import axios from "axios"

export default function UpdatePage() {
  const [searchType, setSearchType] = useState("movies")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [form, setForm] = useState({})
  const [message, setMessage] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const API_BASE = useMemo(
    () => import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api",
    []
  )

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setMessage("")
      return
    }

    setIsSearching(true)
    try {
      const endpoint = searchType === "movies" ? "movies" : "series"
      const response = await axios.get(
        `${API_BASE}/${endpoint}?q=${encodeURIComponent(searchQuery.trim())}`
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

  const selectItem = (item) => {
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
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
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
                  onClick={() => setSearchType("series")}
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

              {searchType === "series" && (
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium">Poster URL</label>
                  <input
                    type="text"
                    name="poster_url"
                    value={form.poster_url}
                    onChange={handleChange}
                    className="w-full p-3 rounded bg-gray-800 text-white"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">Wide Poster URL</label>
                  <input
                    type="text"
                    name="wide_poster_url"
                    value={form.wide_poster_url}
                    onChange={handleChange}
                    className="w-full p-3 rounded bg-gray-800 text-white"
                  />
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
        </div>
      </div>
    </div>
  )
}
