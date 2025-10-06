"use client"

import * as React from "react"
import ContentCard from "./ContentCard"

export default function ContentCarousel({ items = [] }) {
  const baseItems = React.useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : []
    const missing = 36 - arr.length
    if (missing > 0) {
      for (let i = 0; i < missing; i++) {
        arr.push({
          id: `dummy-${i}`,
          title: `item[${arr.length + i}]`,
          isDummy: true,
        })
      }
    }
    return arr
  }, [items])

  const total = baseItems.length
  const [navIndex, setNavIndex] = React.useState(0)
  const [hasClickedNext, setHasClickedNext] = React.useState(false)

  const [translateOffset, setTranslateOffset] = React.useState(0)
  const [marginOffset, setMarginOffset] = React.useState(0)
  const [isFirstShiftClick, setIsFirstShiftClick] = React.useState(true)
  
  // New state to track if transition is in progress
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  
  // New state to track hover
  const [isHovered, setIsHovered] = React.useState(false)

  const sliderRef = React.useRef(null)
  const transitionTimeoutRef = React.useRef(null)

  function renderIndices() {
    const out = []
    if (!hasClickedNext) {
      for (let i = 0; i < 13; i++) {
        out.push((navIndex + i) % total)
      }
    } else {
      const startIndex = (navIndex - 7 + total) % total
      for (let i = 0; i < 19; i++) {
        out.push((startIndex + i) % total)
      }
    }
    return out
  }

  // Clean up timeout on unmount
  React.useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  function startTransition() {
    setIsTransitioning(true)
    
    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current)
    }
    
    // Set timeout to match the CSS transition duration (1000ms)
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false)
    }, 1150)
  }

  function goNext() {
    if (isTransitioning) return
    
    const sliderContent = sliderRef.current
    setHasClickedNext(true)
    setNavIndex((prev) => (prev + 6) % total)

    if (sliderContent) {
      if (isFirstShiftClick) {
        setMarginOffset((prev) => {
          const newOffset = prev - 240
          sliderContent.style.marginLeft = `${newOffset}px`
          return newOffset
        })
        setIsFirstShiftClick(false)
      } else {
        setMarginOffset((prev) => {
          const newOffset = prev + 1427
          sliderContent.style.marginLeft = `${newOffset}px`
          return newOffset
        })
      }

      setTranslateOffset((prev) => {
        const newOffset = prev - 1427
        sliderContent.style.transform = `translateX(${newOffset}px)`
        return newOffset
      })
    }
    
    startTransition()
  }

  function goPrev() {
    if (isTransitioning) return
    
    const sliderContent = sliderRef.current
    setNavIndex((prev) => (prev - 6 + total) % total)

    if (sliderContent) {
      setMarginOffset((prev) => {
        const newOffset = prev - 1427
        sliderContent.style.marginLeft = `${newOffset}px`
        return newOffset
      })

      setTranslateOffset((prev) => {
        const newOffset = prev + 1427
        sliderContent.style.transform = `translateX(${newOffset}px)`
        return newOffset
      })
    }
    
    startTransition()
  }

  const indices = renderIndices()

  return (
    <div 
      className={`relative group max-w-full w-full h-[170px] bg-transparent my-8 transition-all duration-300 ${
        isHovered ? "z-40" : "z-10"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slider */}
      <div className="slider-container w-full h-full bg-transparent relative pl-7.25">
        <div
          ref={sliderRef}
          className="sliderContent flex flex-nowrap gap-[6px] px-5 py-2 h-full w-fit transition-transform duration-[1150ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
          style={{ marginLeft: `${marginOffset}px`, transform: `translateX(${translateOffset}px)` }}
        >
          {indices.map((i) => (
            <ContentCard key={baseItems[i].id} item={baseItems[i]} />
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {hasClickedNext && (
        <button
          onClick={goPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-11 h-[150px] flex items-center justify-center bg-black/40 text-xl font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 hover:shadow-xl text-white"
        >
          ‹
        </button>
      )}

      <button
        onClick={goNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-[150px] flex items-center justify-center bg-black/40 text-xl font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 hover:shadow-xl text-white"
      >
        ›
      </button>
    </div>
  )
}