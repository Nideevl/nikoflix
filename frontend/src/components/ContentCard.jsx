export default function ContentCard({ 
  item, 
  isSelected, 
  onClick,
  showType = false 
}) {
  return (
    <div 
      className={`bg-gray-800 rounded-lg overflow-hidden cursor-pointer transform transition duration-300 hover:scale-105 ${
        isSelected ? "ring-2 ring-red-500" : ""
      }`}
      onClick={onClick}
    >
      <div className="h-40 bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
        <span className="text-white text-lg font-bold">
          {item.title?.substring(0, 1) || 'N'}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-white truncate">{item.title}</h3>
        <p className="text-gray-400 text-sm">{item.release_year}</p>
        {showType && item.is_animated !== undefined && (
          <p className="text-gray-400 text-sm">
            {item.is_animated ? "Animated" : "Live Action"}
          </p>
        )}
      </div>
    </div>
  );
}