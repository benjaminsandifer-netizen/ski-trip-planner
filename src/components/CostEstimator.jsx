import { useState } from "react";
import SectionCard from "./SectionCard";

const RESORTS = [
  { name: "Park City Mountain", rate: 200 },
  { name: "Deer Valley", rate: 220 },
];

const RENTAL_RATE = 65;
const LESSON_RATE = 150;

const INPUT =
  "mt-1 rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-sky-400";
const LABEL = "flex flex-col text-sm font-medium text-slate-700";
const CHECKBOX_LABEL =
  "flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer";

const fmt = (n) => "$" + Math.round(n).toLocaleString();

// Try to extract a number from a price string like "$350/night", "350", "$1,200/night"
function parseNightlyRate(priceStr) {
  const match = priceStr.replace(/,/g, "").match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

// Shorten a URL for display
function shortUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
    return host + (u.pathname.length > 20 ? u.pathname.slice(0, 20) + "..." : u.pathname);
  } catch {
    return url.length > 30 ? url.slice(0, 30) + "..." : url;
  }
}

export default function CostEstimator({ houses = [] }) {
  // Trip basics
  const [tripDays, setTripDays] = useState(5);
  const [skiDays, setSkiDays] = useState(4);
  const [partySize, setPartySize] = useState(2);

  // Per-person inputs
  const [resort, setResort] = useState(0);
  const [wantRentals, setWantRentals] = useState(true);
  const [wantLessons, setWantLessons] = useState(false);
  const [lessonPeople, setLessonPeople] = useState(1);
  const [lessonDays, setLessonDays] = useState(1);
  const [foodBudget, setFoodBudget] = useState(100);
  const [apresBudget, setApresBudget] = useState(30);

  // Accommodation
  const [selectedHouseIdx, setSelectedHouseIdx] = useState(0);
  const [groupSize, setGroupSize] = useState(12);

  // Calculations
  const liftCost = RESORTS[resort].rate * skiDays;
  const rentalCost = wantRentals ? RENTAL_RATE * skiDays : 0;
  const lessonCost = wantLessons ? LESSON_RATE * lessonDays * lessonPeople : 0;
  const lessonCostPerPerson = partySize > 0 ? lessonCost / partySize : 0;
  const foodCost = foodBudget * tripDays;
  const apresCost = apresBudget * tripDays;

  const selectedHouse = houses[selectedHouseIdx];
  const nightlyRate = selectedHouse ? parseNightlyRate(selectedHouse.price) : 0;
  const nights = Math.max(0, tripDays - 1);
  const totalAccom = nightlyRate * nights;
  const accomPerPerson = groupSize > 0 ? totalAccom / groupSize : 0;

  const perPerson =
    liftCost + rentalCost + lessonCostPerPerson + foodCost + apresCost + accomPerPerson;
  const perCouple = perPerson * 2;

  const lineItems = [
    {
      label: `Lift tickets (${skiDays} days @ ${fmt(RESORTS[resort].rate)}/day)`,
      value: liftCost,
    },
    wantRentals && {
      label: `Rentals (${skiDays} days @ ${fmt(RENTAL_RATE)}/day)`,
      value: rentalCost,
    },
    wantLessons && {
      label: `Lessons (${lessonPeople}p x ${lessonDays}d @ ${fmt(LESSON_RATE)}/day — split ${partySize})`,
      value: lessonCostPerPerson,
    },
    {
      label: `Food (${tripDays} days @ ${fmt(foodBudget)}/day)`,
      value: foodCost,
    },
    apresBudget > 0 && {
      label: `Apres ski / drinks (${tripDays} days @ ${fmt(apresBudget)}/day)`,
      value: apresCost,
    },
    selectedHouse && nightlyRate > 0 && {
      label: `Accommodation (${nights} nights @ ${fmt(nightlyRate)}/night ÷ ${groupSize})`,
      value: accomPerPerson,
    },
  ].filter(Boolean);

  return (
    <SectionCard title="Trip Cost Calculator" emoji="💰">
      {/* ── Trip Basics ── */}
      <h3 className="text-sm font-bold text-sky-700 uppercase tracking-wide mb-3">
        Trip Basics
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <label className={LABEL}>
          Total trip days
          <input
            type="number"
            min={1}
            max={21}
            value={tripDays}
            onChange={(e) => {
              const v = Math.max(1, +e.target.value);
              setTripDays(v);
              if (skiDays > v) setSkiDays(v);
            }}
            className={INPUT}
          />
        </label>
        <label className={LABEL}>
          Ski days
          <input
            type="number"
            min={0}
            max={tripDays}
            value={skiDays}
            onChange={(e) => setSkiDays(Math.min(tripDays, Math.max(0, +e.target.value)))}
            className={INPUT}
          />
        </label>
        <label className={LABEL}>
          People in your party
          <div className="flex gap-2 mt-1">
            {[1, 2].map((n) => (
              <button
                key={n}
                onClick={() => setPartySize(n)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  partySize === n
                    ? "bg-sky-600 text-white"
                    : "bg-sky-100 text-sky-700 hover:bg-sky-200"
                }`}
              >
                {n}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={20}
              value={partySize}
              onChange={(e) => setPartySize(Math.max(1, +e.target.value))}
              className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </label>
      </div>

      {/* ── Per-Person Options ── */}
      <h3 className="text-sm font-bold text-sky-700 uppercase tracking-wide mb-3">
        Per-Person Options
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <label className={LABEL}>
          Resort
          <select
            value={resort}
            onChange={(e) => setResort(+e.target.value)}
            className={INPUT}
          >
            {RESORTS.map((r, i) => (
              <option key={i} value={i}>
                {r.name} (~{fmt(r.rate)}/day)
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <label className={CHECKBOX_LABEL}>
            <input
              type="checkbox"
              checked={wantRentals}
              onChange={(e) => setWantRentals(e.target.checked)}
              className="w-4 h-4 accent-sky-500"
            />
            Rentals (~{fmt(RENTAL_RATE)}/day, ski days only)
          </label>
          <label className={CHECKBOX_LABEL}>
            <input
              type="checkbox"
              checked={wantLessons}
              onChange={(e) => setWantLessons(e.target.checked)}
              className="w-4 h-4 accent-sky-500"
            />
            Lessons (~{fmt(LESSON_RATE)}/day/person)
          </label>
          {wantLessons && (
            <div className="flex gap-2 ml-6">
              <label className="flex flex-col text-xs text-slate-600">
                People
                <input
                  type="number"
                  min={1}
                  max={partySize}
                  value={lessonPeople}
                  onChange={(e) =>
                    setLessonPeople(Math.min(partySize, Math.max(1, +e.target.value)))
                  }
                  className="w-16 mt-0.5 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Days
                <input
                  type="number"
                  min={1}
                  max={skiDays}
                  value={lessonDays}
                  onChange={(e) =>
                    setLessonDays(Math.min(skiDays, Math.max(1, +e.target.value)))
                  }
                  className="w-16 mt-0.5 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </label>
            </div>
          )}
        </div>

        <label className={LABEL}>
          Daily food budget (per person)
          <div className="flex items-center gap-3 mt-1">
            <input
              type="range"
              min={20}
              max={250}
              step={5}
              value={foodBudget}
              onChange={(e) => setFoodBudget(+e.target.value)}
              className="flex-1 accent-sky-500"
            />
            <span className="text-base font-semibold text-sky-800 w-14 text-right">
              {fmt(foodBudget)}
            </span>
          </div>
        </label>

        <label className={LABEL}>
          Apres ski / drinks (per day)
          <div className="flex items-center gap-3 mt-1">
            <input
              type="range"
              min={0}
              max={150}
              step={5}
              value={apresBudget}
              onChange={(e) => setApresBudget(+e.target.value)}
              className="flex-1 accent-sky-500"
            />
            <span className="text-base font-semibold text-sky-800 w-14 text-right">
              {fmt(apresBudget)}
            </span>
          </div>
        </label>
      </div>

      {/* ── Accommodation ── */}
      <h3 className="text-sm font-bold text-sky-700 uppercase tracking-wide mb-3">
        Accommodation (split with full group)
      </h3>
      <div className="mb-4">
        <label className={LABEL + " mb-3 max-w-xs"}>
          Total people splitting the house
          <input
            type="number"
            min={1}
            max={30}
            value={groupSize}
            onChange={(e) => setGroupSize(Math.max(1, +e.target.value))}
            className={INPUT}
          />
        </label>

        {houses.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-sky-200 p-6 text-center">
            <p className="text-sm text-slate-400">
              No houses added yet. Add houses in the <span className="font-semibold text-sky-600">House Voting</span> section below to see accommodation costs here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {houses.map((h, i) => {
              const rate = parseNightlyRate(h.price);
              const total = rate * nights;
              const pp = groupSize > 0 ? total / groupSize : 0;
              const isSelected = selectedHouseIdx === i;

              return (
                <button
                  key={h.id}
                  onClick={() => setSelectedHouseIdx(i)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${
                    isSelected
                      ? "border-sky-500 bg-sky-50"
                      : "border-sky-200 bg-white hover:border-sky-300"
                  }`}
                >
                  <p className="text-xs text-sky-600 font-medium truncate">
                    {shortUrl(h.link)}
                  </p>
                  <p className="text-lg font-bold text-sky-800 mt-1">{h.price}</p>
                  {rate > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      {fmt(total)} total ({nights} nights) · <span className="font-semibold text-sky-700">{fmt(pp)}/person</span>
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Itemized Breakdown ── */}
      <div className="rounded-xl bg-sky-50 border border-sky-200 p-4">
        <h3 className="text-sm font-bold text-sky-700 uppercase tracking-wide mb-3">
          Your Breakdown
        </h3>
        <div className="flex flex-col gap-1.5">
          {lineItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-600">{item.label}</span>
              <span className="font-semibold text-slate-800">{fmt(item.value)}</span>
            </div>
          ))}
          {houses.length > 0 && !selectedHouse && (
            <div className="text-sm text-slate-400 italic">
              Select a house above to include accommodation
            </div>
          )}
          <div className="border-t border-sky-300 my-2" />
          <div className="flex justify-between text-base">
            <span className="font-bold text-sky-900">Per Person Total</span>
            <span className="font-bold text-sky-900 text-xl">{fmt(perPerson)}</span>
          </div>
          {partySize >= 2 && (
            <div className="flex justify-between text-base">
              <span className="font-bold text-sky-900">
                Couple Total ({partySize} people)
              </span>
              <span className="font-bold text-sky-900 text-xl">{fmt(perCouple)}</span>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
