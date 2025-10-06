"use client"

import { useState, useRef } from "react"

export default function ContentCard({ item, isSelected = false, onClick, className = "" }) {
  const [imgError, setImgError] = useState(false)
  const [active, setActive] = useState(false)
  const [remove, setRemove] = useState(true)
  const timeoutRef = useRef(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setActive(true)
      setRemove(false)
    }, 1000)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setActive(false)
  }

  return (
    <div
      className={`relative flex-none cursor-pointer w-[232px] ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Normal Card (always visible) */}
      <div
        className={`
          relative w-full rounded-md overflow-hidden shadow-md
          ${isSelected ? "ring-2 ring-red-500" : ""}
        `}
      >
        {item.poster_url && !imgError ? (
          <img
            src={item.poster_url || "/placeholder.svg"}
            alt={item.title || "Poster"}
            className="w-full h-[150px] object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-[150px] bg-gray-800 text-gray-300 text-sm">
            No Image
          </div>
        )}

        {/* Dummy badge */}
        {item.isDummy && (
          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-0.5 text-[10px] rounded font-bold backdrop-blur-sm">
            Sample
          </div>
        )}
      </div>

      {/* Title and Rating below the image */}
      <div className="mt-2 px-1">
        <div className="flex items-center justify-between">
          <div className="text-white font-medium text-[16px] font-sans truncate max-w-[80%]">
            {item.title || "Sakomato Days"}
          </div>
          <div className="bg-white/30 text-white text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
            {item.rating || "8.4"}
          </div>
        </div>
      </div>

      {!remove && (
        <div
          className="
            absolute top-0 left-0 z-[100]
            bg-transparent rounded-md overflow-hidden
            shadow-[0px_5px_25px_rgba(0,0,0,0.7)]
          "
          style={{
            width: "232px",
            height: "250px",
            animationName: active ? "card" : "card-exit",
            animationDuration: "0.3s",
            animationFillMode: "forwards",
            animationTimingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1.0)",
          }}
          onAnimationEnd={(e) => {
            if (e.animationName === "card-exit") {
              setRemove(true)
            }
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Poster */}
          <div className="relative w-full bg-gradient-to-br from-gray-700 to-gray-600" style={{ height: "170px" }}>
            {item.poster_url && !imgError ? (
              <img
                src={item.poster_url || "/placeholder.svg"}
                alt={item.title || "Poster"}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gray-800 text-gray-300 text-sm">
                No Image
              </div>
            )}

            {/* Sound button */}
            <button
              type="button"
              className="z-[60] absolute right-2 bottom-2 border-2 hover:text-white text-[#ffffff80] hover:border-white border-[#ffffff30] p-1.5 rounded-full transition-all duration-300 backdrop-blur-sm"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 4.00003C11 3.59557 10.7564 3.23093 10.3827 3.07615C10.009 2.92137 9.57889 3.00692 9.29289 3.29292L4.58579 8.00003H1C0.447715 8.00003 0 8.44774 0 9.00003V15C0 15.5523 0.447715 16 1 16H4.58579L9.29289 20.7071C9.57889 20.9931 10.009 21.0787 10.3827 20.9239C10.7564 20.7691 11 20.4045 11 20V4.00003Z"
                  fill="currentColor"
                />
                <path
                  d="M15.2929 9.70714L17.5858 12L15.2929 14.2929L16.7071 15.7071L19 13.4142L21.2929 15.7071L22.7071 14.2929L20.4142 12L22.7071 9.70714L21.2929 8.29292L19 10.5858L16.7071 8.29292L15.2929 9.70714Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          <div  
            className="p-4 bg-[#181818]"
            style={{
              animationName: active ? "card-cont-enter" : "card-cont-exit",
              animationDuration: "0.1s",
              animationFillMode: "forwards",
            }}
          >
            {/* Title */}
            <h3 className="text-white font-semibold text-[18px] mb-2 leading-tight">{item.title || "Sakomato Days"}</h3>

            {/* Year, Duration, and Rating */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[#bcbcbc] text-[14px]">
                <span>{item.year || "2025"}</span>
                <span>{item.duration || "2h 25m"}</span>
              </div>
              <span className="text-white text-[14px] font-medium">{item.rating || "8.4"}</span>
            </div>

            {/* Genres */}
            <div className="flex items-center gap-1 text-[#bcbcbc] text-[14px]">
              {item.genres ? (
                item.genres.map((genre, index) => (
                  <span key={genre}>
                    {genre}
                    {index < item.genres.length - 1 && <span className="mx-1">•</span>}
                  </span>
                ))
              ) : (
                <>
                  <span>Action</span>
                  <span className="mx-1">•</span>
                  <span>Romance</span>
                  <span className="mx-1">•</span>
                  <span>Sci-fi</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}