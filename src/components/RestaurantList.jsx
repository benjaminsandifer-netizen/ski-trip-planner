import { useState } from "react";
import SectionCard from "./SectionCard";

const CATEGORIES = [
  {
    name: "Apres Ski",
    emoji: "🍻",
    restaurants: [
      { name: "No Name Saloon", note: "Iconic Main St dive bar. Buffalo burgers & live music." },
      { name: "High West Distillery", note: "Whiskey flights & upscale bar food in a beautiful space." },
      { name: "The Spur Bar & Grill", note: "At the base of PCMR. Cold beer after last run." },
      { name: "Legends Bar & Grill", note: "Ski-in/ski-out at Deer Valley base. Great nachos." },
      { name: "Pig Pen Saloon", note: "Pool tables, cheap drinks, local vibe." },
    ],
  },
  {
    name: "Nice Dinner",
    emoji: "🍷",
    restaurants: [
      { name: "Handle", note: "Modern American. Creative cocktails, seasonal menu." },
      { name: "Riverhorse on Main", note: "Park City staple. Elk loin, live music, upscale atmosphere." },
      { name: "Firewood", note: "Wood-fired everything. Great ambiance on Main St." },
      { name: "Grappa Italian", note: "Cozy Italian on Main St. House-made pasta, great wine list." },
      { name: "Prime Steakhouse", note: "Jean-Georges at St. Regis Deer Valley. Splurge-worthy." },
    ],
  },
  {
    name: "Casual Eats",
    emoji: "🍕",
    restaurants: [
      { name: "Davanza's", note: "Huge NY-style pizza slices. Late night go-to." },
      { name: "Five5eeds", note: "Healthy bowls, great coffee, Australian-inspired." },
      { name: "Hearth and Hill", note: "Comfort food, great cocktails, relaxed vibe." },
      { name: "Buona Vita", note: "Quick Italian. Solid pasta & subs near Old Town transit." },
      { name: "Silver Star Cafe", note: "Local favorite off Main St. Burgers & sandwiches." },
    ],
  },
  {
    name: "Breakfast",
    emoji: "🥞",
    restaurants: [
      { name: "Harvest", note: "Farm-to-table brunch at Park City Resort. Incredible." },
      { name: "Ritual Chocolate Cafe", note: "Pastries, coffee, bean-to-bar chocolate." },
      { name: "Atticus Coffee", note: "Best coffee in town. Bookshop vibes." },
      { name: "Squatters Roadhouse Grill", note: "Big portions, good coffee, classic American breakfast." },
      { name: "Five5eeds", note: "Acai bowls, avocado toast, flat whites." },
    ],
  },
];

export default function RestaurantList() {
  const [open, setOpen] = useState(CATEGORIES.map(() => true));

  function toggle(i) {
    setOpen((prev) => prev.map((v, j) => (j === i ? !v : v)));
  }

  return (
    <SectionCard title="Restaurant Guide" emoji="🍽️">
      <div className="flex flex-col gap-3">
        {CATEGORIES.map((cat, i) => (
          <div key={cat.name}>
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors text-left"
            >
              <span className="font-semibold text-sky-900">
                {cat.emoji} {cat.name}
              </span>
              <span className="text-sky-500">{open[i] ? "▾" : "▸"}</span>
            </button>
            {open[i] && (
              <ul className="mt-1 ml-4 flex flex-col gap-1">
                {cat.restaurants.map((r) => (
                  <li key={r.name} className="text-sm py-1">
                    <span className="font-medium text-slate-800">{r.name}</span>
                    <span className="text-slate-500"> — {r.note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
