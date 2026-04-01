import { useState } from "react";
import SectionCard from "./SectionCard";

const RESORTS = [
  { name: "Park City Mountain (Epic Pass)", min: 150, max: 250 },
  { name: "Deer Valley (skiers only)", min: 175, max: 265 },
];

const RENTAL_MIN = 45;
const RENTAL_MAX = 85;

export default function CostEstimator() {
  const [people, setPeople] = useState(4);
  const [days, setDays] = useState(3);
  const [resort, setResort] = useState(0);
  const [wantRentals, setWantRentals] = useState(true);
  const [wantLessons, setWantLessons] = useState(false);
  const [lessonCost, setLessonCost] = useState(200);
  const [foodBudget, setFoodBudget] = useState(60);

  const r = RESORTS[resort];
  const liftLow = r.min * days;
  const liftHigh = r.max * days;
  const rentalLow = wantRentals ? RENTAL_MIN * days : 0;
  const rentalHigh = wantRentals ? RENTAL_MAX * days : 0;
  const lessons = wantLessons ? lessonCost : 0;
  const food = foodBudget * days;

  const perPersonLow = liftLow + rentalLow + lessons + food;
  const perPersonHigh = liftHigh + rentalHigh + lessons + food;
  const groupLow = perPersonLow * people;
  const groupHigh = perPersonHigh * people;

  const fmt = (n) => "$" + n.toLocaleString();

  return (
    <SectionCard title="Cost Estimator" emoji="💰">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* People */}
        <label className="flex flex-col text-sm font-medium text-slate-700">
          People in group
          <input
            type="number"
            min={1}
            max={30}
            value={people}
            onChange={(e) => setPeople(Math.max(1, +e.target.value))}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </label>

        {/* Days */}
        <label className="flex flex-col text-sm font-medium text-slate-700">
          Ski days
          <input
            type="number"
            min={1}
            max={14}
            value={days}
            onChange={(e) => setDays(Math.max(1, +e.target.value))}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </label>

        {/* Resort */}
        <label className="flex flex-col text-sm font-medium text-slate-700">
          Resort
          <select
            value={resort}
            onChange={(e) => setResort(+e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {RESORTS.map((r, i) => (
              <option key={i} value={i}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        {/* Food */}
        <label className="flex flex-col text-sm font-medium text-slate-700">
          Daily food budget ($)
          <input
            type="number"
            min={0}
            value={foodBudget}
            onChange={(e) => setFoodBudget(Math.max(0, +e.target.value))}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </label>

        {/* Rentals */}
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={wantRentals}
            onChange={(e) => setWantRentals(e.target.checked)}
            className="w-4 h-4 accent-sky-500"
          />
          Rentals (~${RENTAL_MIN}-${RENTAL_MAX}/day)
        </label>

        {/* Lessons */}
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={wantLessons}
              onChange={(e) => setWantLessons(e.target.checked)}
              className="w-4 h-4 accent-sky-500"
            />
            Lessons
          </label>
          {wantLessons && (
            <input
              type="number"
              min={0}
              placeholder="Lesson cost"
              value={lessonCost}
              onChange={(e) => setLessonCost(Math.max(0, +e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mt-6 rounded-xl bg-sky-50 border border-sky-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">Per Person</p>
          <p className="text-2xl font-bold text-sky-800">
            {fmt(perPersonLow)} – {fmt(perPersonHigh)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">
            Group Total ({people} people)
          </p>
          <p className="text-2xl font-bold text-sky-800">
            {fmt(groupLow)} – {fmt(groupHigh)}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
