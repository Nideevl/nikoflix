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
    return arr.map((item, index) => ({
      ...item,
      position: index + 1, // 1-indexed positions
    }))
  }, [items])

  const total = baseItems.length
  const [navIndex, setNavIndex] = React.useState(0)
  const [hasClickedNext, setHasClickedNext] = React.useState(false)
  const [translateOffset, setTranslateOffset] = React.useState(0)
  const [marginOffset, setMarginOffset] = React.useState(0)
  const [isFirstShiftClick, setIsFirstShiftClick] = React.useState(true)
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)
  const sliderRef = React.useRef(null)
  const transitionTimeoutRef = React.useRef(null)

  // 🧭 Render visible indices
  function renderIndices() {
    const out = []
    if (!hasClickedNext) {
      for (let i = 0; i < 13; i++) out.push((navIndex + i) % total)
    } else {
      const startIndex = (navIndex - 1 + total) % total
      for (let i = 0; i < 19; i++) out.push((startIndex + i) % total)
    }
    return out
  }

  React.useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    }
  }, [])

  function startTransition() {
    setIsTransitioning(true)
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
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
          const newOffset = prev - 238
          sliderContent.style.marginLeft = `${newOffset}px`
          return newOffset
        })
        setIsFirstShiftClick(false)
      } else {
        setMarginOffset((prev) => {
          const newOffset = prev + 1412
          sliderContent.style.marginLeft = `${newOffset}px`
          return newOffset
        })
      }
      setTranslateOffset((prev) => {
        const newOffset = prev - 1412
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
        const newOffset = prev - 1412
        sliderContent.style.marginLeft = `${newOffset}px`
        return newOffset
      })
      setTranslateOffset((prev) => {
        const newOffset = prev + 1412
        sliderContent.style.transform = `translateX(${newOffset}px)`
        return newOffset
      })
    }
    startTransition()
  }

  const indices = renderIndices()
  const currentItems = indices.map((i) => baseItems[i])

  return (
    <div
      className={`relative group max-w-full w-full h-[170px] bg-transparent my-8 transition-all duration-300 ${
        isHovered ? "z-40" : "z-10"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slider */}
      <div className="slider-container w-full h-full bg-transparent relative pl-9">
        <div
          ref={sliderRef}
          className="sliderContent flex flex-nowrap gap-[6px] px-5 py-2 h-full w-fit transition-transform duration-[1000ms] ease-[cubic-bezier(0.4,0.8,0.6,1)]"
          style={{
            marginLeft: `${marginOffset}px`,
            transform: `translateX(${translateOffset}px)`,
          }}
        >
          {currentItems.map((item) => {
            const position = item.position
            let cardType = ""
            if ((position - 1) % 6 === 0) cardType = "First"
            else if (position % 6 === 0) cardType = "Last"

            return (
              <div key={item.id} data-card-position={position}>
                <ContentCard item={item} position={position} cardType={cardType} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Navigation Arrows */}
      {hasClickedNext && (
        <button
          onClick={goPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-13 h-[200px] flex items-center justify-center bg-black/40 text-xl font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 hover:shadow-xl text-white"
        >
          ‹
        </button>
      )}

      <button
        onClick={goNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-13 h-[200px] flex items-center justify-center bg-black/40 text-xl font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 hover:shadow-xl text-white"
      >
        ›
      </button>
    </div>
  )
}
