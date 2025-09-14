export default function TrendingItemCard({ item }) {
  return (
    <div className="bg-gray-900 p-4 rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-white">
            {item.content_type} ID {item.content_id}
          </h3>
          <p className="text-gray-400 text-sm capitalize">{item.trending_type}</p>
          <p className="text-gray-400 text-sm">Position: {item.position}</p>
        </div>
        <a 
          href={item.video_url} 
          target="_blank" 
          rel="noreferrer" 
          className="text-red-500 hover:text-red-400 text-sm font-medium"
        >
          Watch
        </a>
      </div>
    </div>
  );
}