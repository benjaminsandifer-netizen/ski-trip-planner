import { useMemo, useState, useEffect } from "react";

const TARGET = new Date("2027-02-01T00:00:00").getTime();

function getTimeLeft() {
  const diff = Math.max(0, TARGET - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function Hero() {
  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

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
    <div className="relative w-full h-[480px] overflow-hidden rounded-b-3xl">
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

        {/* Countdown */}
        <div className="mt-6 flex gap-3 sm:gap-4">
          {[
            { value: time.days, label: "Days", icon: "🏔️" },
            { value: time.hours, label: "Hours", icon: "⛷️" },
            { value: time.minutes, label: "Mins", icon: "🎿" },
            { value: time.seconds, label: "Secs", icon: "❄️" },
          ].map((unit) => (
            <div
              key={unit.label}
              className="flex flex-col items-center bg-white/15 backdrop-blur-md rounded-xl px-3 py-3 sm:px-5 sm:py-4 border border-white/25 min-w-[70px] sm:min-w-[85px]"
            >
              <span className="text-sm mb-1">{unit.icon}</span>
              <span className="text-2xl sm:text-4xl font-extrabold tabular-nums tracking-tight text-white drop-shadow">
                {String(unit.value).padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-sky-200 font-semibold mt-1">
                {unit.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
