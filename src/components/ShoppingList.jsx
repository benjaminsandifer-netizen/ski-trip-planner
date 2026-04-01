import { useState, useEffect, useCallback } from "react";
import { supabase, supabaseEnabled } from "../lib/supabase";
import SectionCard from "./SectionCard";

const LS_KEY = "ski-trip-shopping-list";

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}
function saveLocal(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

export default function ShoppingList() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");

  // Load items
  useEffect(() => {
    if (supabaseEnabled) {
      supabase
        .from("shopping_items")
        .select("*")
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          if (data) setItems(data);
        })
        .catch(() => {
          setItems(loadLocal());
        });
    } else {
      setItems(loadLocal());
    }
  }, []);

  const persist = useCallback(
    (updater) => {
      setItems((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (!supabaseEnabled) saveLocal(next);
        return next;
      });
    },
    []
  );

  async function addItem(e) {
    e.preventDefault();
    if (!newItem.trim()) return;
    const item = {
      id: Date.now(),
      text: newItem.trim(),
      checked: false,
      created_at: new Date().toISOString(),
    };

    if (supabaseEnabled) {
      const { data } = await supabase
        .from("shopping_items")
        .insert({ text: item.text, checked: false })
        .select()
        .single();
      if (data) setItems((prev) => [...prev, data]);
    } else {
      persist((prev) => [...prev, item]);
    }
    setNewItem("");
  }

  async function toggleItem(id) {
    if (supabaseEnabled) {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      await supabase
        .from("shopping_items")
        .update({ checked: !item.checked })
        .eq("id", id);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
      );
    } else {
      persist((prev) =>
        prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
      );
    }
  }

  async function removeItem(id) {
    if (supabaseEnabled) {
      await supabase.from("shopping_items").delete().eq("id", id);
    }
    persist((prev) => prev.filter((i) => i.id !== id));
  }

  const checked = items.filter((i) => i.checked).length;

  return (
    <SectionCard title="Packing / Shopping List" emoji="🎒">
      {!supabaseEnabled && (
        <p className="text-xs text-amber-600 mb-2">
          Supabase not configured — using local storage. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env for shared persistence.
        </p>
      )}

      <form onSubmit={addItem} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Add an item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-colors"
        >
          Add
        </button>
      </form>

      {items.length > 0 && (
        <p className="text-xs text-slate-500 mb-2">
          {checked}/{items.length} packed
        </p>
      )}

      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sky-50 transition-colors group"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(item.id)}
              className="w-4 h-4 accent-sky-500"
            />
            <span
              className={`flex-1 text-sm ${
                item.checked ? "line-through text-slate-400" : "text-slate-800"
              }`}
            >
              {item.text}
            </span>
            <button
              onClick={() => removeItem(item.id)}
              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg"
              title="Remove"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <p className="text-sm text-slate-400">
          No items yet. Don't forget sunscreen and hand warmers!
        </p>
      )}
    </SectionCard>
  );
}
