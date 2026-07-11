// Custom AED pin icon for Leaflet (green when available, red when not).
// Takes an `L` (Leaflet) reference rather than importing it directly, since
// leaflet is a peer dependency of whichever app renders the map.
export function getAedIcon(L, isAvailableNow) {
  const bgColor = isAvailableNow ? '#00A550' : '#E53935';
  return L.divIcon({
    html: `
      <div style="
        background-color: ${bgColor};
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.5);
      ">
        <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; margin-top: -2px; margin-left: -2px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22">
            <path fill="white" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            <path fill="${bgColor}" d="M11.5 17.5l4-7h-3V4.5L8 11.5h3v6z"/>
          </svg>
        </div>
      </div>
    `,
    className: 'custom-aed-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
}
