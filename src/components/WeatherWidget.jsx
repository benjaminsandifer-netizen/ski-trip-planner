import { useState, useEffect } from "react";
import SectionCard from "./SectionCard";

const LAT = 40.6461;
const LON = -111.498;

const WEATHER_ICONS = {
  "01d": "☀️", "01n": "🌙",
  "02d": "⛅", "02n": "☁️",
  "03d": "☁️", "03n": "☁️",
  "04d": "☁️", "04n": "☁️",
  "09d": "🌧️", "09n": "🌧️",
  "10d": "🌦️", "10n": "🌧️",
  "11d": "⛈️", "11n": "⛈️",
  "13d": "🌨️", "13n": "🌨️",
  "50d": "🌫️", "50n": "🌫️",
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setError("Add VITE_OPENWEATHERMAP_API_KEY to .env to see weather data.");
      setLoading(false);
      return;
    }

    async function fetchWeather() {
      try {
        const [currentRes, forecastRes] = await Promise.all([
          fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=imperial&appid=${apiKey}`
          ),
          fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=imperial&appid=${apiKey}`
          ),
        ]);

        if (!currentRes.ok || !forecastRes.ok) throw new Error("API error");

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        setWeather(currentData);

        // Get one forecast per day (noon entries)
        const daily = forecastData.list
          .filter((item) => item.dt_txt.includes("12:00:00"))
          .slice(0, 5);
        setForecast(daily);
      } catch {
        setError("Could not load weather data.");
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, [apiKey]);

  function icon(code) {
    return WEATHER_ICONS[code] || "🌡️";
  }

  return (
    <SectionCard title="Park City Weather" emoji="⛰️">
      {loading && <p className="text-slate-400 text-sm">Loading weather...</p>}
      {error && <p className="text-amber-600 text-sm">{error}</p>}

      {weather && (
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">
            {icon(weather.weather[0]?.icon)}
          </span>
          <div>
            <p className="text-3xl font-bold text-sky-800">
              {Math.round(weather.main.temp)}°F
            </p>
            <p className="text-sm text-slate-600 capitalize">
              {weather.weather[0]?.description}
            </p>
            <p className="text-xs text-slate-500">
              Feels like {Math.round(weather.main.feels_like)}°F · Wind{" "}
              {Math.round(weather.wind.speed)} mph
            </p>
          </div>
        </div>
      )}

      {forecast.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {forecast.map((day) => {
            const date = new Date(day.dt * 1000);
            const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
            return (
              <div
                key={day.dt}
                className="flex flex-col items-center bg-sky-50 rounded-xl p-2 border border-sky-100"
              >
                <span className="text-xs font-semibold text-sky-700">{dayName}</span>
                <span className="text-2xl">{icon(day.weather[0]?.icon)}</span>
                <span className="text-sm font-bold text-sky-800">
                  {Math.round(day.main.temp_max)}°
                </span>
                <span className="text-xs text-slate-500">
                  {Math.round(day.main.temp_min)}°
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
