import { useState, useEffect } from "react";
import SectionCard from "./SectionCard";

const LAT = 40.6461;
const LON = -111.498;
const NWS_POINT_URL = `https://api.weather.gov/points/${LAT},${LON}`;

// Powder rating based on recent snowfall
function powderRating(snow24h, snow7d) {
  if (snow24h >= 12) return { label: "EPIC POWDER", stars: 5, emoji: "🤩" };
  if (snow24h >= 6) return { label: "DEEP DAY", stars: 4, emoji: "😍" };
  if (snow24h >= 2) return { label: "FRESH SNOW", stars: 3, emoji: "😊" };
  if (snow7d >= 6) return { label: "DECENT BASE", stars: 2, emoji: "👍" };
  if (snow7d >= 1) return { label: "THIN COVER", stars: 1, emoji: "🤷" };
  return { label: "NO NEW SNOW", stars: 0, emoji: "😐" };
}

function snowflakeIcons(count) {
  return "❄️".repeat(count) + "·".repeat(5 - count);
}

export default function SnowConditions() {
  const [conditions, setConditions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");

  const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;

  useEffect(() => {
    fetchConditions();
  }, []);

  async function fetchConditions() {
    // Try NWS first
    try {
      const data = await fetchNWS();
      if (data) {
        setConditions(data);
        setSource("National Weather Service");
        setLoading(false);
        return;
      }
    } catch {
      // fall through to OpenWeatherMap
    }

    // Fall back to OpenWeatherMap
    if (apiKey) {
      try {
        const data = await fetchOWM();
        if (data) {
          setConditions(data);
          setSource("OpenWeatherMap");
          setLoading(false);
          return;
        }
      } catch {
        // both failed
      }
    }

    setLoading(false);
  }

  async function fetchNWS() {
    // Step 1: get the forecast office / grid for Park City coordinates
    const pointRes = await fetch(NWS_POINT_URL, {
      headers: { "User-Agent": "SkiTripPlanner/1.0" },
    });
    if (!pointRes.ok) return null;
    const pointData = await pointRes.json();

    const forecastUrl = pointData.properties?.forecast;
    const stationsUrl = pointData.properties?.observationStations;

    // Step 2: get current observation from nearest station
    let temp = null;
    let snowDepth = null;

    if (stationsUrl) {
      const stationsRes = await fetch(stationsUrl, {
        headers: { "User-Agent": "SkiTripPlanner/1.0" },
      });
      if (stationsRes.ok) {
        const stationsData = await stationsRes.json();
        const stationId = stationsData.features?.[0]?.properties?.stationIdentifier;
        if (stationId) {
          const obsRes = await fetch(
            `https://api.weather.gov/stations/${stationId}/observations/latest`,
            { headers: { "User-Agent": "SkiTripPlanner/1.0" } }
          );
          if (obsRes.ok) {
            const obsData = await obsRes.json();
            const props = obsData.properties;
            if (props?.temperature?.value != null) {
              temp = Math.round(props.temperature.value * 9 / 5 + 32); // C to F
            }
            if (props?.snowDepth?.value != null) {
              snowDepth = Math.round(props.snowDepth.value / 25.4); // mm to inches
            }
          }
        }
      }
    }

    // Step 3: get forecast for snowfall predictions
    let snow24h = 0;
    let snow7d = 0;
    let forecastText = "";

    if (forecastUrl) {
      const fcRes = await fetch(forecastUrl, {
        headers: { "User-Agent": "SkiTripPlanner/1.0" },
      });
      if (fcRes.ok) {
        const fcData = await fcRes.json();
        const periods = fcData.properties?.periods || [];

        // Extract snow info from forecast text
        for (const p of periods.slice(0, 2)) {
          const text = p.detailedForecast || "";
          const snowMatch = text.match(/new snow accumulation of (\d+) to (\d+) inch/i);
          if (snowMatch) {
            snow24h = Math.round((+snowMatch[1] + +snowMatch[2]) / 2);
          }
          if (!forecastText && text.toLowerCase().includes("snow")) {
            forecastText = p.name + ": " + p.shortForecast;
          }
        }

        // Sum snow mentions across 7-day periods for rough 7d total
        for (const p of periods.slice(0, 14)) {
          const text = p.detailedForecast || "";
          const snowMatch = text.match(/new snow accumulation of (\d+) to (\d+) inch/i);
          if (snowMatch) {
            snow7d += Math.round((+snowMatch[1] + +snowMatch[2]) / 2);
          }
          const lightSnow = text.match(/dusting to (\d+) inch/i);
          if (lightSnow) {
            snow7d += Math.round(+lightSnow[1] / 2);
          }
        }
      }
    }

    // If we couldn't even get temp, consider it a failure
    if (temp === null && snowDepth === null) return null;

    return {
      temp,
      snowDepth,
      snow24h,
      snow7d,
      forecastText,
      summitTemp: temp != null ? temp - 15 : null, // rough estimate: summit ~15F colder
    };
  }

  async function fetchOWM() {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=imperial&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=imperial&appid=${apiKey}`
      ),
    ]);

    if (!currentRes.ok) return null;
    const current = await currentRes.json();
    const forecast = forecastRes.ok ? await forecastRes.json() : null;

    const temp = Math.round(current.main.temp);
    const snow1h = current.snow?.["1h"] || 0; // mm
    const snow3h = current.snow?.["3h"] || 0; // mm

    // Estimate 24h snow from current rate
    const snow24h = Math.round(Math.max(snow1h * 24, snow3h * 8) / 25.4); // mm to inches

    // Sum forecast snow over 7 days
    let snow7d = snow24h;
    if (forecast?.list) {
      for (const entry of forecast.list) {
        const s = entry.snow?.["3h"] || 0;
        snow7d += s / 25.4; // mm to inches
      }
    }
    snow7d = Math.round(snow7d);

    const desc = current.weather?.[0]?.description || "";

    return {
      temp,
      summitTemp: temp - 15,
      snowDepth: null,
      snow24h,
      snow7d,
      forecastText: desc.charAt(0).toUpperCase() + desc.slice(1),
    };
  }

  if (loading) {
    return (
      <SectionCard title="Snow Conditions" emoji="🏔️">
        <p className="text-slate-400 text-sm">Loading snow data...</p>
      </SectionCard>
    );
  }

  if (!conditions) {
    return (
      <SectionCard title="Snow Conditions" emoji="🏔️">
        <p className="text-amber-600 text-sm">
          Could not load snow conditions. Check back later.
        </p>
      </SectionCard>
    );
  }

  const rating = powderRating(conditions.snow24h, conditions.snow7d);

  return (
    <SectionCard title="Snow Conditions" emoji="🏔️">
      <p className="text-xs text-slate-400 mb-3">Source: {source}</p>

      {/* Powder rating banner */}
      <div className="rounded-xl bg-gradient-to-r from-sky-600 to-sky-800 text-white p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-2xl font-extrabold">{rating.emoji} {rating.label}</p>
          <p className="text-sky-200 text-sm mt-1 tracking-wide">
            {snowflakeIcons(rating.stars)}
          </p>
        </div>
        <div className="text-5xl">{rating.stars >= 3 ? "🎿" : "⛷️"}</div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {conditions.temp != null && (
          <div className="bg-sky-50 rounded-xl border border-sky-100 p-3 text-center">
            <p className="text-xs text-sky-600 font-semibold uppercase tracking-wide">Base Temp</p>
            <p className="text-2xl font-bold text-sky-800">{conditions.temp}°F</p>
          </div>
        )}
        {conditions.summitTemp != null && (
          <div className="bg-sky-50 rounded-xl border border-sky-100 p-3 text-center">
            <p className="text-xs text-sky-600 font-semibold uppercase tracking-wide">Summit (est)</p>
            <p className="text-2xl font-bold text-sky-800">{conditions.summitTemp}°F</p>
          </div>
        )}
        <div className="bg-sky-50 rounded-xl border border-sky-100 p-3 text-center">
          <p className="text-xs text-sky-600 font-semibold uppercase tracking-wide">Last 24h</p>
          <p className="text-2xl font-bold text-sky-800">
            {conditions.snow24h > 0 ? `${conditions.snow24h}"` : "0\""}
          </p>
          <p className="text-xs text-slate-500">new snow</p>
        </div>
        <div className="bg-sky-50 rounded-xl border border-sky-100 p-3 text-center">
          <p className="text-xs text-sky-600 font-semibold uppercase tracking-wide">Last 7 Days</p>
          <p className="text-2xl font-bold text-sky-800">
            {conditions.snow7d > 0 ? `${conditions.snow7d}"` : "0\""}
          </p>
          <p className="text-xs text-slate-500">total snow</p>
        </div>
        {conditions.snowDepth != null && (
          <div className="bg-sky-50 rounded-xl border border-sky-100 p-3 text-center col-span-2">
            <p className="text-xs text-sky-600 font-semibold uppercase tracking-wide">Snow Depth</p>
            <p className="text-2xl font-bold text-sky-800">{conditions.snowDepth}"</p>
            <p className="text-xs text-slate-500">at base</p>
          </div>
        )}
      </div>

      {/* Forecast text */}
      {conditions.forecastText && (
        <p className="mt-3 text-sm text-slate-600 bg-sky-50 rounded-lg px-3 py-2 border border-sky-100">
          <span className="font-semibold text-sky-700">Forecast:</span> {conditions.forecastText}
        </p>
      )}
    </SectionCard>
  );
}
