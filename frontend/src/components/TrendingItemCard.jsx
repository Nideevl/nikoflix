// components/TrendingItemCard.jsx
"use client"

import { useState, useEffect } from "react"

export default function TrendingItemCard({ item, onDelete, isDeleting, isSelected = false, onClick, className = "" }) {
  const [imgError, setImgError] = useState(false)
  const [contentDetails, setContentDetails] = useState(null)
  const [loading, setLoading] = useState(false)

  // Fetch content details
  useEffect(() => {
    const fetchContentDetails = async () => {
      if (!item.content_id || !item.content_type) return;
      
      setLoading(true);
      try {
        const baseUrl = "http://localhost:5000";
        let endpoint;
        if (item.content_type === 'series') {
          endpoint = `${baseUrl}/api/series/${item.content_id}`;
        } else if (item.content_type === 'movie') {
          endpoint = `${baseUrl}/api/movies`;
        } else {
          console.warn('Unknown content type:', item.content_type);
          setContentDetails(null);
          return;
        }
        
        const response = await fetch(endpoint);
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          setContentDetails(null);
          return;
        }
        
        if (response.ok) {
          const data = await response.json();
          if (item.content_type === 'movie' && Array.isArray(data)) {
            const movie = data.find(m => m.id === item.content_id || m.movie_id === item.content_id);
            setContentDetails(movie || null);
          } else {
            setContentDetails(data);
          }
        } else {
          setContentDetails(null);
        }
      } catch (error) {
        console.error('Error fetching content details:', error);
        setContentDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchContentDetails();
  }, [item.content_id, item.content_type]);

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(item.trending_id);
  };

  const getDisplayData = () => {
    if (loading) {
      return {
        title: "Loading...",
        posterUrl: "/placeholder.svg",
        rating: "N/A",
        year: "N/A",
        duration: "N/A",
        genres: [],
        description: ""
      };
    }

    if (contentDetails) {
      return {
        title: contentDetails.title || `ID ${item.content_id}`,
        posterUrl: contentDetails.poster_url || contentDetails.posterUrl || "/placeholder.svg",
        rating: contentDetails.rating || "N/A",
        year: contentDetails.release_year || contentDetails.year || "N/A",
        duration: getDuration(contentDetails),
        genres: getGenres(contentDetails),
        description: contentDetails.description || ""
      };
    }

    return {
      title: item.title || `ID ${item.content_id}`,
      posterUrl: item.poster_url || "/placeholder.svg",
      rating: item.rating || "N/A",
      year: item.year || "N/A",
      duration: item.duration || "N/A",
      genres: item.genres || [],
      description: item.description || ""
    };
  };

  const getDuration = (details) => {
    if (item.content_type === 'movie') {
      return details.duration || "N/A";
    } else if (item.content_type === 'series' && details.episodes) {
      const totalEpisodes = details.episodes.length;
      return `${totalEpisodes} Episodes`;
    }
    return "N/A";
  };

  const getGenres = (details) => {
    if (details.genres) {
      return Array.isArray(details.genres) ? details.genres : [details.genres];
    }
    return details.genre ? [details.genre] : [];
  };

  const displayData = getDisplayData();

  return (
    <div
      className={`relative flex-none cursor-pointer w-[232px] ${className}`}
      onClick={onClick}
    >
      <div
        className={`relative w-full rounded-md overflow-hidden shadow-md ${isSelected ? "ring-2 ring-red-500" : ""}`}
      >
        <img
          src={displayData.posterUrl}
          alt={displayData.title}
          className="w-full h-[150px] object-cover"
          onError={() => setImgError(true)}
        />

        {/* Trending Badge */}
        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded capitalize">
          {item.trending_type}
        </div>

        {/* Position Badge */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          #{item.position}
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-sm">Loading...</div>
          </div>
        )}
      </div>

      {/* Title and Rating */}
      <div className="mt-2 px-1">
        <div className="flex items-center justify-between">
          <div className="text-white font-medium text-[16px] font-sans truncate max-w-[80%]">
            {displayData.title}
          </div>
          <div className="bg-white/30 text-white text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
            {displayData.rating}
          </div>
        </div>

        <div className="text-gray-400 text-sm mt-1 capitalize">
          {item.content_type} • {displayData.year}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-2">
          <a 
            href={item.video_url} 
            target="_blank" 
            rel="noreferrer" 
            className="flex-1 text-red-500 hover:text-red-400 text-sm font-medium text-center bg-black/50 py-1 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            Watch
          </a>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 text-xs bg-red-800 hover:bg-red-700 px-2 py-1 rounded text-white disabled:opacity-50"
          >
            {isDeleting ? "Removing..." : "Remove"}
          </button>
        </div>

        {item.expires_at && (
          <div className="text-gray-500 text-xs mt-2">
            Expires: {new Date(item.expires_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
