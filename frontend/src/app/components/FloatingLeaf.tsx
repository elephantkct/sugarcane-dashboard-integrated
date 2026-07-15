// FloatingLeaf — subtle decorative animated leaf in the upper-right corner
// Appears after the cinematic intro completes

export function FloatingLeaf() {
  return (
    <div
      className="fixed top-6 right-6 z-10 pointer-events-none select-none"
      style={{ opacity: 0.09 }}
      aria-hidden="true"
    >
      <div className="animate-wind-sway origin-bottom">
        <svg
          width="52"
          height="110"
          viewBox="0 0 80 176"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M40 170 C38 140 20 100 10 60 C5 35 15 10 40 6 C65 10 75 35 70 60 C60 100 42 140 40 170Z"
            fill="url(#floatLeafGradient)"
          />
          <path
            d="M40 170 C40 140 40 100 40 6"
            stroke="rgba(149,213,178,0.5)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="floatLeafGradient" x1="10" y1="6" x2="70" y2="170" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1B4332" />
              <stop offset="50%" stopColor="#2D6A4F" />
              <stop offset="100%" stopColor="#52B788" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
