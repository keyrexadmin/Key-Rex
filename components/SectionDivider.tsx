'use client'

export default function SectionDivider() {
  return (
    <div className="w-full flex items-center justify-center py-8 md:py-12">
      <div className="relative w-full max-w-4xl px-4">
        {/* Subtle claw-like divider - angular shapes suggesting T-Rex claws */}
        <svg
          width="100%"
          height="40"
          viewBox="0 0 400 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-30"
          preserveAspectRatio="none"
        >
          {/* Left claw mark */}
          <path
            d="M50 20 L60 10 L70 20 L65 25 L55 25 Z"
            fill="#f97316"
            fillOpacity="0.35"
          />
          {/* Center claw mark */}
          <path
            d="M190 20 L200 10 L210 20 L205 25 L195 25 Z"
            fill="#f97316"
            fillOpacity="0.35"
          />
          {/* Right claw mark */}
          <path
            d="M330 20 L340 10 L350 20 L345 25 L335 25 Z"
            fill="#f97316"
            fillOpacity="0.35"
          />
          {/* Subtle connecting line */}
          <line
            x1="80"
            y1="20"
            x2="180"
            y2="20"
            stroke="#f97316"
            strokeWidth="1"
            strokeOpacity="0.20"
          />
          <line
            x1="220"
            y1="20"
            x2="320"
            y2="20"
            stroke="#f97316"
            strokeWidth="1"
            strokeOpacity="0.20"
          />
        </svg>
      </div>
    </div>
  )
}

