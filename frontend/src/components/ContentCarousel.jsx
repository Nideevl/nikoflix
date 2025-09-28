"use client"

import * as React from "react"
import ContentCard from "./ContentCard"

function mod(n, m) {
  return ((n % m) + m) % m
}

function rangeWrapped(start, count, total) {
  const out = []
  for (let i = 0; i < count; i++) out.push(mod(start + i, total))
  return out
}

function getWindowIndices({
  start,
  total,
  pageSize,
  bufferLeft,
  bufferRight,
}) {
  const leftStart = start - bufferLeft
  const rightStart = start + pageSize
  return [
    ...rangeWrapped(leftStart, bufferLeft, total),
    ...rangeWrapped(start, pageSize, total),
    ...rangeWrapped(rightStart, bufferRight, total),
  ]
}

function resolvePageSizeByWidth(w) {
  if (w < 480) return 2
  if (w < 768) return 3
  if (w < 1024) return 4
  if (w < 1280) return 5
  return 6
}

export default function ContentCarousel({ items = [], title = "We Think You'll Love These" }) {
  // If nothing passed, we'll generate dummy cards
  const baseItems = React.useMemo(() => (Array.isArray(items) ? items : []), [items])

  // Ensure at least 36 total cards by padding with dummies
  const total = Math.max(36, baseItems.length)

  // Responsive page size
  const [pageSize, setPageSize] = React.useState(6)
  React.useEffect(() => {
    const onResize = () => setPageSize(resolvePageSizeByWidth(window.innerWidth))
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const [start, setStart] = React.useState(0)
  const [hasMoved, setHasMoved] = React.useState(false)

  const containerRef = React.useRef(null)
  const listRef = React.useRef(null)

  const BUFFER = 7
  const bufferLeft = hasMoved ? BUFFER : 0
  const bufferRight = BUFFER

  const windowIndices = React.useMemo(
    () =>
      getWindowIndices({
        start,
        total,
        pageSize,
        bufferLeft,
        bufferRight,
      }),
    [start, total, pageSize, bufferLeft, bufferRight],
  )

  // Align the viewport to keep the current view centered even with left buffer
  const alignToViewport = React.useCallback(() => {
    const el = containerRef.current
    const list = listRef.current
    if (!el || !list) return

    const firstItem = list.querySelector("li[data-idx]")
    const itemWidth = firstItem?.getBoundingClientRect().width || 0

    // read horizontal gap from the list
    const style = window.getComputedStyle(list)
    const gap = Number.parseFloat(style.columnGap || "0")

    const offset = bufferLeft * itemWidth + bufferLeft * gap
    el.scrollTo({ left: offset, behavior: "auto" })
  }, [bufferLeft])

  React.useLayoutEffect(() => {
    alignToViewport()
  }, [alignToViewport, windowIndices])

  React.useEffect(() => {
    const onResize = () => alignToViewport()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [alignToViewport])

  function goRight() {
    setStart((s) => (((s + pageSize) % total) + total) % total)
    if (!hasMoved) setHasMoved(true)
  }

  function goLeft() {
    setStart((s) => (((s - pageSize) % total) + total) % total)
  }

  // Create dummy card data for missing items
  function getItemAt(index) {
    // Return real item if available
    if (index < baseItems.length && baseItems[index]) {
      return baseItems[index]
    }

    // Create dummy item for missing indices
    const n = index + 1
    return {
      id: `dummy-${n}`,
      title: `Card ${n}`,
      rating: (Math.random() * 3 + 7).toFixed(1), // Random rating between 7.0 and 10.0
      poster_url: `/placeholder.svg?height=270&width=480&text=Card+${n}`,
      isDummy: true
    }
  }

  const inspector = React.useMemo(() => {
    const leftStart = start - bufferLeft
    const rightStart = start + pageSize
    const left = rangeWrapped(leftStart, bufferLeft, total)
    const view = rangeWrapped(start, pageSize, total)
    const right = rangeWrapped(rightStart, bufferRight, total)

    const parts = []
    for (const n of left) parts.push(`(${n})`)
    parts.push(`{<${view.map((n) => `(${n})`).join("")}>}`)
    for (const n of right) parts.push(`(${n})`)
    return parts.join("")
  }, [start, total, pageSize, bufferLeft, bufferRight])

  return (
    <section className="relative">
      <header className="mb-3">
        <h2 className="text-pretty text-xl font-semibold text-foreground">{title}</h2>
      </header>

      <div
        ref={containerRef}
        className="overflow-x-auto scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] scrollbar-hide"
        aria-label="Content carousel"
      >
        <ul ref={listRef} className="flex gap-3 md:gap-4" role="list" aria-live="polite">
          {windowIndices.map((n) => {
            const item = getItemAt(n)
            return (
              <li
                key={`${n}-${item.id}`}
                data-idx={n}
                className="group shrink-0 snap-start basis-1/2 sm:basis-1/3 md:basis-[25%] lg:basis-[20%] xl:basis-[16.666%]"
              >
                <article className="relative rounded-lg border border-transparent bg-card ring-0 outline-none transition-transform focus-within:ring-2 focus-within:ring-primary/40">
                  <a href={item.href || "#"} className="block" aria-label={item.title}>
                    <ContentCard item={item} />
                  </a>
                </article>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Left control: added only after first move */}
      {hasMoved && (
        <button
          type="button"
          onClick={goLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-secondary px-3 py-2 text-foreground shadow hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Scroll left"
        >
          ‹
        </button>
      )}

      <button
        type="button"
        onClick={goRight}
        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-secondary px-3 py-2 text-foreground shadow hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Scroll right"
      >
        ›
      </button>
    </section>
  )
}