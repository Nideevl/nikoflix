"use client"

export default function BrowsePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-gradient-to-b from-black/80 to-transparent px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="text-2xl font-bold text-red-600 tracking-widest">NIKOFLIX</div>

        {/* Nav */}
        <nav className="hidden md:flex space-x-6 text-sm font-medium">
          <a href="#" className="hover:text-gray-300">Home</a>
          <a href="#" className="hover:text-gray-300">TV Shows</a>
          <a href="#" className="hover:text-gray-300">Movies</a>
          <a href="#" className="hover:text-gray-300">New & Popular</a>
          <a href="#" className="hover:text-gray-300">My List</a>
        </nav>

        {/* Right */}
        <div className="flex items-center space-x-4">
          <button>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-xs font-bold">U</div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative h-[75vh] bg-cover bg-center" style={{ backgroundImage: "url('/cinematic-movie-scene.png')" }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>

        <div className="absolute bottom-24 left-12 max-w-xl space-y-4">
          <h1 className="text-5xl font-extrabold">Featured Movie</h1>
          <p className="text-lg text-gray-300 max-w-md">
            An epic story of action and drama. Watch anywhere, cancel anytime.
          </p>
          <div className="flex space-x-4">
            <button className="bg-white text-black px-6 py-2 font-semibold rounded hover:bg-gray-200 transition">
              ▶ Play
            </button>
            <button className="bg-gray-500/70 text-white px-6 py-2 font-semibold rounded hover:bg-gray-500 transition">
              ℹ More Info
            </button>
          </div>
        </div>
      </section>

      {/* Content Rows */}
      <main className="relative -mt-20 space-y-12 px-8 pb-20">
        {["Trending Now", "Top Picks For You", "New Releases"].map((title, rowIndex) => (
          <div key={rowIndex} className="space-y-3">
            <h2 className="text-xl font-bold">{title}</h2>
            <div className="flex space-x-4 overflow-x-scroll scrollbar-hide">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="w-40 h-60 flex-shrink-0 rounded-lg bg-gray-800 overflow-hidden transform transition-transform hover:scale-110"
                >
                  <div className="w-full h-full bg-[url('/abstract-movie-poster.png')] bg-cover bg-center"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
