import styles from "./ContentCard.module.css"

export default function ContentCard({ 
  item, 
  isSelected = false, 
  onClick, 
  showType = false, 
  className = "" 
}) {
  const cardClasses = `${styles.card} ${isSelected ? styles.selected : ""} ${className}`

  return (
    <div className={cardClasses} onClick={onClick}>
      <div className={styles.poster}>
        {item.poster_url ? (
          <img
            src={item.poster_url}
            alt={item.title}
            className={styles.posterImage}
          />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.placeholderText}>No image</span>
          </div>
        )}  
      </div>
      <div className={styles.content}>
        <div className={styles.title}>{item.title}</div>
        <div className={styles.rating}>{item.rating || "8.4"}</div>
        {item.isDummy && <div className={styles.dummyBadge}>Sample</div>}
      </div>
    </div>
  )
}