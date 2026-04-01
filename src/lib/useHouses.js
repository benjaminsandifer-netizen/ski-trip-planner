import { useState, useEffect, useCallback } from "react";
import { supabase, supabaseEnabled } from "./supabase";

const LS_KEY = "ski-trip-houses";

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}
function saveLocal(houses) {
  localStorage.setItem(LS_KEY, JSON.stringify(houses));
}

export function useHouses() {
  const [houses, setHouses] = useState([]);

  const load = useCallback(async () => {
    if (!supabaseEnabled) {
      setHouses(loadLocal());
      return;
    }
    try {
      const [{ data: listings }, { data: votes }] = await Promise.all([
        supabase.from("house_listings").select("*").order("created_at", { ascending: true }),
        supabase.from("house_votes").select("*"),
      ]);
      if (!listings) return;

      const votesByHouse = {};
      for (const v of votes || []) {
        if (!votesByHouse[v.house_id]) votesByHouse[v.house_id] = {};
        votesByHouse[v.house_id][v.voter_name] = v.direction;
      }

      setHouses(
        listings.map((h) => ({
          id: h.id,
          link: h.link,
          photoUrl: h.photo_url || "",
          price: h.price,
          votes: votesByHouse[h.id] || {},
        }))
      );
    } catch {
      setHouses(loadLocal());
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { houses, setHouses, saveLocal };
}
