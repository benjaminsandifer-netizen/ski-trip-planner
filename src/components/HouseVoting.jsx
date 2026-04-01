import { useState, useEffect } from "react";
import { supabase, supabaseEnabled } from "../lib/supabase";
import SectionCard from "./SectionCard";

const LS_KEY = "ski-trip-houses";
const LS_COMMENTS_KEY = "ski-trip-house-comments";

function loadLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}
function saveLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }) + " at " + d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HouseVoting() {
  const [houses, setHouses] = useState([]);
  const [comments, setComments] = useState({}); // { houseId: [{ id, author, text, created_at }] }
  const [link, setLink] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [price, setPrice] = useState("");
  const [voterName, setVoterName] = useState("");
  const [commentTexts, setCommentTexts] = useState({}); // { houseId: "draft text" }

  // Load houses + votes + comments on mount
  useEffect(() => {
    if (supabaseEnabled) {
      loadFromSupabase();
    } else {
      setHouses(loadLocal(LS_KEY, []));
      setComments(loadLocal(LS_COMMENTS_KEY, {}));
    }
  }, []);

  async function loadFromSupabase() {
    try {
      const [{ data: listings }, { data: votes }, { data: cmts }] = await Promise.all([
        supabase.from("house_listings").select("*").order("created_at", { ascending: true }),
        supabase.from("house_votes").select("*"),
        supabase.from("house_comments").select("*").order("created_at", { ascending: true }),
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

      const commentsByHouse = {};
      for (const c of cmts || []) {
        if (!commentsByHouse[c.house_id]) commentsByHouse[c.house_id] = [];
        commentsByHouse[c.house_id].push({
          id: c.id,
          author: c.author,
          text: c.text,
          created_at: c.created_at,
        });
      }
      setComments(commentsByHouse);
    } catch {
      setHouses(loadLocal(LS_KEY, []));
      setComments(loadLocal(LS_COMMENTS_KEY, {}));
    }
  }

  async function addHouse(e) {
    e.preventDefault();
    if (!link.trim() || !price.trim()) return;

    if (supabaseEnabled) {
      const { data } = await supabase
        .from("house_listings")
        .insert({ link: link.trim(), photo_url: photoUrl.trim() || null, price: price.trim() })
        .select()
        .single();
      if (data) {
        setHouses((prev) => [
          ...prev,
          { id: data.id, link: data.link, photoUrl: data.photo_url || "", price: data.price, votes: {} },
        ]);
      }
    } else {
      const house = {
        id: Date.now(),
        link: link.trim(),
        photoUrl: photoUrl.trim(),
        price: price.trim(),
        votes: {},
      };
      setHouses((prev) => {
        const next = [...prev, house];
        saveLocal(LS_KEY, next);
        return next;
      });
    }

    setLink("");
    setPhotoUrl("");
    setPrice("");
  }

  async function vote(houseId, direction) {
    if (!voterName.trim()) return;
    const trimmed = voterName.trim();

    setHouses((prev) => {
      const next = prev.map((h) => {
        if (h.id !== houseId) return h;
        const current = h.votes[trimmed];
        const newVotes = { ...h.votes };
        if (current === direction) {
          delete newVotes[trimmed];
        } else {
          newVotes[trimmed] = direction;
        }
        return { ...h, votes: newVotes };
      });
      if (!supabaseEnabled) saveLocal(LS_KEY, next);
      return next;
    });

    if (!supabaseEnabled) return;

    const house = houses.find((h) => h.id === houseId);
    const current = house?.votes[trimmed];

    if (current === direction) {
      await supabase
        .from("house_votes")
        .delete()
        .eq("house_id", houseId)
        .eq("voter_name", trimmed);
    } else {
      await supabase
        .from("house_votes")
        .upsert(
          { house_id: houseId, voter_name: trimmed, direction },
          { onConflict: "house_id,voter_name" }
        );
    }
  }

  async function removeHouse(houseId) {
    if (supabaseEnabled) {
      try {
        await supabase.from("house_listings").delete().eq("id", houseId);
      } catch {
        // optimistic UI handles it
      }
    }
    setHouses((prev) => {
      const next = prev.filter((h) => h.id !== houseId);
      if (!supabaseEnabled) saveLocal(LS_KEY, next);
      return next;
    });
    setComments((prev) => {
      const next = { ...prev };
      delete next[houseId];
      if (!supabaseEnabled) saveLocal(LS_COMMENTS_KEY, next);
      return next;
    });
  }

  async function addComment(houseId) {
    const text = (commentTexts[houseId] || "").trim();
    if (!text || !voterName.trim()) return;
    const author = voterName.trim();

    const comment = {
      id: Date.now(),
      author,
      text,
      created_at: new Date().toISOString(),
    };

    if (supabaseEnabled) {
      try {
        const { data } = await supabase
          .from("house_comments")
          .insert({ house_id: houseId, author, text })
          .select()
          .single();
        if (data) {
          comment.id = data.id;
          comment.created_at = data.created_at;
        }
      } catch {
        // use optimistic local comment
      }
    }

    setComments((prev) => {
      const next = { ...prev, [houseId]: [...(prev[houseId] || []), comment] };
      if (!supabaseEnabled) saveLocal(LS_COMMENTS_KEY, next);
      return next;
    });
    setCommentTexts((prev) => ({ ...prev, [houseId]: "" }));
  }

  function score(house) {
    return Object.values(house.votes).reduce(
      (acc, v) => acc + (v === "up" ? 1 : -1),
      0
    );
  }

  const sorted = [...houses].sort((a, b) => score(b) - score(a));

  return (
    <SectionCard title="House Voting" emoji="🏠">
      {!supabaseEnabled && (
        <p className="text-xs text-amber-600 mb-2">
          Supabase not configured — houses and votes are saved locally only.
        </p>
      )}

      <label className="flex flex-col text-sm font-medium text-slate-700 mb-4 max-w-xs">
        Your name (to vote & comment)
        <input
          type="text"
          value={voterName}
          onChange={(e) => setVoterName(e.target.value)}
          placeholder="Enter your name"
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </label>

      {/* Add house form */}
      <form onSubmit={addHouse} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="url"
          placeholder="VRBO / Airbnb link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          required
        />
        <input
          type="url"
          placeholder="Photo URL (optional)"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <input
          type="text"
          placeholder="Price (e.g. $350/night)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          required
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-colors"
        >
          Add
        </button>
      </form>

      {/* House list */}
      {sorted.length === 0 && (
        <p className="text-slate-400 text-sm">No houses added yet. Paste a link above!</p>
      )}
      <div className="flex flex-col gap-3">
        {sorted.map((house, i) => {
          const ups = Object.values(house.votes).filter((v) => v === "up").length;
          const downs = Object.values(house.votes).filter((v) => v === "down").length;
          const myVote = voterName.trim() ? house.votes[voterName.trim()] : null;
          const houseComments = comments[house.id] || [];
          const draft = commentTexts[house.id] || "";

          return (
            <div
              key={house.id}
              className="relative bg-sky-50 rounded-xl border border-sky-200 p-3"
            >
              {/* Delete button */}
              <button
                onClick={() => removeHouse(house.id)}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors text-lg leading-none"
                title="Remove house"
              >
                ×
              </button>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                {/* Rank */}
                <div className="text-xl font-bold text-sky-600 w-8 text-center">
                  #{i + 1}
                </div>

                {/* Photo */}
                {house.photoUrl && (
                  <img
                    src={house.photoUrl}
                    alt="House"
                    className="w-24 h-18 object-cover rounded-lg"
                  />
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <a
                    href={house.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 hover:text-sky-900 underline text-sm font-medium break-all"
                  >
                    {house.link}
                  </a>
                  <p className="text-lg font-bold text-slate-800">{house.price}</p>
                </div>

                {/* Voting */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => vote(house.id, "up")}
                    disabled={!voterName.trim()}
                    className={`text-2xl transition-transform hover:scale-110 ${myVote === "up" ? "grayscale-0" : "grayscale opacity-50"}`}
                    title="Thumbs up"
                  >
                    👍
                  </button>
                  <span className="text-sm font-semibold text-green-700">{ups}</span>
                  <button
                    onClick={() => vote(house.id, "down")}
                    disabled={!voterName.trim()}
                    className={`text-2xl transition-transform hover:scale-110 ${myVote === "down" ? "grayscale-0" : "grayscale opacity-50"}`}
                    title="Thumbs down"
                  >
                    👎
                  </button>
                  <span className="text-sm font-semibold text-red-700">{downs}</span>
                  <span className="ml-2 text-sm font-bold text-sky-800">
                    Score: {score(house)}
                  </span>
                </div>
              </div>

              {/* Comments section */}
              <div className="mt-3 border-t border-sky-200 pt-3">
                {houseComments.length > 0 && (
                  <div className="flex flex-col gap-2 mb-3">
                    {houseComments.map((c) => (
                      <div key={c.id} className="bg-white rounded-lg px-3 py-2 border border-sky-100">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-sky-800">{c.author}</span>
                          <span className="text-xs text-slate-400">{formatTime(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-slate-700 mt-0.5">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <textarea
                    placeholder={voterName.trim() ? "Add a comment..." : "Enter your name above to comment"}
                    value={draft}
                    onChange={(e) =>
                      setCommentTexts((prev) => ({ ...prev, [house.id]: e.target.value }))
                    }
                    disabled={!voterName.trim()}
                    rows={1}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none disabled:opacity-50"
                  />
                  <button
                    onClick={() => addComment(house.id)}
                    disabled={!voterName.trim() || !draft.trim()}
                    className="px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
