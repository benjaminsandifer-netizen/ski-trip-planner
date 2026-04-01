import { useMemo } from "react";

export default function Hero() {
  const snowflakes = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 4}s`,
      size: `${0.6 + Math.random() * 1}rem`,
      opacity: 0.4 + Math.random() * 0.6,
    }));
  }, []);

  return (
    <div className="relative w-full h-[400px] overflow-hidden rounded-b-3xl">
      {/* Background image — unsplash Park City / snowy mountains */}
      <img
        src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80"
        alt="Snowy mountain peaks"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-900/60 to-sky-900/30" />

      {/* Snowfall */}
      <div className="snowfall">
        {snowflakes.map((sf) => (
          <span
            key={sf.id}
            className="snowflake"
            style={{
              left: sf.left,
              animationDelay: sf.delay,
              animationDuration: sf.duration,
              fontSize: sf.size,
              opacity: sf.opacity,
            }}
          >
            ❄
          </span>
        ))}
      </div>

      {/* Title */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight drop-shadow-lg">
          Park City Ski Trip
        </h1>
        <p className="mt-3 text-lg md:text-xl text-sky-100 drop-shadow font-medium">
          It's much opener there, in the wide open air
        </p>
      </div>
    </div>
  );
}
