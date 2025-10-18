"use client";

import { useState, useRef } from "react";

export default function ContentCard({
  item,
  isSelected = false,
  onClick,
  className = "",
  cardType = "",
}) {
  const [imgError, setImgError] = useState(false);
  const [active, setActive] = useState(false);
  const [remove, setRemove] = useState(true);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActive(true);
      setRemove(false);
    }, 800);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActive(false);
  };

  return (
    <div
      className={`relative flex-none cursor-pointer w-[229.75px] overflow-visible ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Normal Card */}
      <div
        className={`relative w-full rounded-md overflow-hidden shadow-md ${
          isSelected ? "ring-2 ring-red-500" : ""
        }`}
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
      </div>

      {/* Title and Rating */}
      <div className="mt-1 px-1 flex items-center justify-between">
        <div className="text-white font-medium text-[16px] font-sans truncate max-w-[80%]">
          {item.title || "Sakomato Days"}
        </div>
        <div className="bg-white/30 text-white text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
          {item.rating || "8.4"}
        </div>
      </div>

      {/* Hover Overlay */}
      {!remove && (
        <div
          className="absolute top-0 z-[1000] bg-transparent rounded-md overflow-hidden shadow-[0px_5px_25px_rgba(0,0,0,0.7)]"
          style={{
            width: "232px",
            height: "250px",
            animationName: active ? "card" : "card-exit",
            animationDuration: "0.15s",
            animationFillMode: "forwards",
            animationTimingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1.0)",

            // Position adjustments for First and Last
            left: "0px",

            // Keep fixed edge pinned when scaling
            transformOrigin:
              cardType === "First"
                ? "left center"
                : cardType === "Last"
                ? "right center"
                : "center center",

            transform: active ? "scale(1.1)" : "scale(1)",
            transition: "transform 150ms ease-in-out, left 150ms ease-in-out",
          }}
          onAnimationEnd={(e) => {
            if (e.animationName === "card-exit") setRemove(true);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Poster */}
          <div
            className="relative w-full bg-gradient-to-br from-gray-700 to-gray-600"
            style={{ height: "145px" }}
          >
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
          </div>

          {/* Info */}
          <div
            className="p-4 bg-[#181818]"
            style={{
              animationName: active ? "card-cont-enter" : "card-cont-exit",
              animationDuration: "0.1s",
              animationFillMode: "forwards",
            }}
          >
            <h3 className="text-white font-semibold text-[18px] mb-2 leading-tight">
              {item.title || "Sakomato Days"}
            </h3>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[#bcbcbc] text-[14px]">
                <span>{item.year || "2025"}</span>
                <span>{item.duration || "2h 25m"}</span>
              </div>
              <span className="text-white text-[14px] font-medium">
                {item.rating || "8.4"}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[#bcbcbc] text-[14px]">
              {item.genres ? (
                item.genres.map((genre, index) => (
                  <span key={genre}>
                    {genre}
                    {index < item.genres.length - 1 && (
                      <span className="mx-1">•</span>
                    )}
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
  );
} 