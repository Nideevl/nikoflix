export default function ContentCard({ item, isSelected = false, onClick, showType = false, className = "" }) {
  return (
    <div
      className={`bg-gray-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected ? "ring-2 ring-red-500" : "hover:scale-105"
      } ${className}`}
      onClick={onClick}
    >
      {item.poster_url ? (
        <img
          src={item.poster_url}
          alt={item.title}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gray-700 flex items-center justify-center">
          <span className="text-gray-400">No image</span>
        </div>
      )}
      <div className="p-3">
        <h3 className="font-semibold text-white truncate">{item.title}</h3>
        <p className="text-gray-400 text-sm">{item.release_year}</p>
        {showType && item.is_animated !== undefined && (
          <p className="text-gray-400 text-xs mt-1">
            {item.is_animated ? "Anime" : "Series"}
          </p>
        )}
      </div>
    </div>
  )
}