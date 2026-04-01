import { useState, useEffect } from "react";
import { supabase, supabaseEnabled } from "../lib/supabase";
import SectionCard from "./SectionCard";

const LS_OPTIONS_KEY = "ski-trip-date-options";
const LS_VOTES_KEY = "ski-trip-date-poll-votes";

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

function nightCount(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export default function DateVoting() {
  const [options, setOptions] = useState([]); // [{ id, label, startDate, endDate }]
  const [votes, setVotes] = useState({}); // { optionId: ["Alice", "Bob"] }
  const [name, setName] = useState("");

  // Admin form state
  const [showAdmin, setShowAdmin] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  // Load on mount
  useEffect(() => {
    if (supabaseEnabled) {
      loadFromSupabase();
    } else {
      setOptions(loadLocal(LS_OPTIONS_KEY, []));
      setVotes(loadLocal(LS_VOTES_KEY, {}));
    }
  }, []);

  async function loadFromSupabase() {
    try {
      const [{ data: opts }, { data: voteRows }] = await Promise.all([
        supabase.from("date_options").select("*").order("created_at", { ascending: true }),
        supabase.from("date_votes").select("*"),
      ]);
      if (opts) {
        setOptions(
          opts.map((o) => ({
            id: o.id,
            label: o.label,
            startDate: o.start_date,
            endDate: o.end_date,
          }))
        );
      }
      if (voteRows) {
        const map = {};
        for (const v of voteRows) {
          if (!map[v.option_id]) map[v.option_id] = [];
          map[v.option_id].push(v.voter_name);
        }
        setVotes(map);
      }
    } catch {
      // Fall back to localStorage if Supabase fails at runtime
      setOptions(loadLocal(LS_OPTIONS_KEY, []));
      setVotes(loadLocal(LS_VOTES_KEY, {}));
    }
  }

  async function addOption(e) {
    e.preventDefault();
    if (!newStart || !newEnd) return;
    const label = newLabel.trim() || `${newStart} to ${newEnd}`;

    if (supabaseEnabled) {
      const { data } = await supabase
        .from("date_options")
        .insert({ label, start_date: newStart, end_date: newEnd })
        .select()
        .single();
      if (data) {
        setOptions((prev) => [
          ...prev,
          { id: data.id, label: data.label, startDate: data.start_date, endDate: data.end_date },
        ]);
      }
    } else {
      const opt = { id: Date.now(), label, startDate: newStart, endDate: newEnd };
      setOptions((prev) => {
        const next = [...prev, opt];
        saveLocal(LS_OPTIONS_KEY, next);
        return next;
      });
    }

    setNewLabel("");
    setNewStart("");
    setNewEnd("");
  }

  async function removeOption(optId) {
    if (supabaseEnabled) {
      await supabase.from("date_options").delete().eq("id", optId);
    }
    setOptions((prev) => {
      const next = prev.filter((o) => o.id !== optId);
      if (!supabaseEnabled) saveLocal(LS_OPTIONS_KEY, next);
      return next;
    });
    setVotes((prev) => {
      const next = { ...prev };
      delete next[optId];
      if (!supabaseEnabled) saveLocal(LS_VOTES_KEY, next);
      return next;
    });
  }

  async function castVote(optId) {
    if (!name.trim()) return;
    const trimmed = name.trim();

    // Remove previous vote by this person (one vote per name)
    const prevOptionId = Object.entries(votes).find(([, names]) =>
      names.includes(trimmed)
    )?.[0];

    const next = { ...votes };

    // Remove from old option
    if (prevOptionId) {
      next[prevOptionId] = (next[prevOptionId] || []).filter((n) => n !== trimmed);
      if (next[prevOptionId].length === 0) delete next[prevOptionId];
    }

    // If clicking the same option, just remove (toggle off)
    if (String(prevOptionId) !== String(optId)) {
      next[optId] = [...(next[optId] || []), trimmed];
    }

    setVotes(next);
    if (!supabaseEnabled) {
      saveLocal(LS_VOTES_KEY, next);
      return;
    }

    // Supabase: delete old vote, upsert new (unless toggling off)
    try {
      if (String(prevOptionId) !== String(optId)) {
        // upsert handles both insert and moving vote in one call
        await supabase
          .from("date_votes")
          .upsert({ voter_name: trimmed, option_id: optId }, { onConflict: "voter_name" });
      } else {
        // Toggling off — just delete
        await supabase
          .from("date_votes")
          .delete()
          .eq("voter_name", trimmed);
      }
    } catch {
      // Optimistic UI already updated; log silently
    }
  }

  const totalVotes = Object.values(votes).reduce((sum, arr) => sum + arr.length, 0);

  // Which option did the current user vote for?
  const myVoteOption = name.trim()
    ? Object.entries(votes).find(([, names]) => names.includes(name.trim()))?.[0]
    : null;

  return (
    <SectionCard title="Date Voting" emoji="📅">
      {!supabaseEnabled && (
        <p className="text-xs text-amber-600 mb-2">
          Supabase not configured — votes are saved locally only.
        </p>
      )}

      {/* Voter name */}
      <label className="flex flex-col text-sm font-medium text-slate-700 mb-4 max-w-xs">
        Your name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name to vote"
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </label>

      {/* Option cards */}
      {options.length === 0 && (
        <p className="text-sm text-slate-400 mb-4">
          No date options yet — use the admin section below to add some.
        </p>
      )}

      <div className="flex flex-col gap-3 mb-4">
        {options.map((opt) => {
          const voters = votes[opt.id] || [];
          const nights = nightCount(opt.startDate, opt.endDate);
          const pct = totalVotes > 0 ? Math.round((voters.length / totalVotes) * 100) : 0;
          const isMyVote = String(myVoteOption) === String(opt.id);

          return (
            <div
              key={opt.id}
              className={`rounded-xl border-2 p-4 transition-colors ${
                isMyVote
                  ? "border-sky-500 bg-sky-50"
                  : "border-sky-200 bg-white"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Info */}
                <div className="flex-1">
                  <p className="font-bold text-sky-900 text-lg">{opt.label}</p>
                  <p className="text-sm text-slate-500">
                    {nights} night{nights !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Vote button */}
                <button
                  onClick={() => castVote(opt.id)}
                  disabled={!name.trim()}
                  className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    isMyVote
                      ? "bg-sky-600 text-white hover:bg-sky-700"
                      : "bg-sky-100 text-sky-700 hover:bg-sky-200"
                  } ${!name.trim() ? "opacity-50 cursor-default" : "cursor-pointer"}`}
                >
                  {isMyVote ? "Voted ✓" : "Vote"}
                </button>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>
                    {voters.length} vote{voters.length !== 1 ? "s" : ""}
                    {voters.length > 0 && (
                      <span className="text-slate-400"> — {voters.join(", ")}</span>
                    )}
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className="bg-sky-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin section */}
      <div className="border-t border-slate-200 pt-4">
        <button
          onClick={() => setShowAdmin(!showAdmin)}
          className="text-sm font-medium text-sky-600 hover:text-sky-800 transition-colors"
        >
          {showAdmin ? "Hide admin ▾" : "Add / manage date options ▸"}
        </button>

        {showAdmin && (
          <div className="mt-3">
            <form onSubmit={addOption} className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="text"
                placeholder='Label (e.g. "Jan 10-17")'
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <input
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
              <input
                type="date"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
              <button
                type="submit"
                disabled={options.length >= 4}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </form>
            {options.length >= 4 && (
              <p className="text-xs text-amber-600 mb-2">Maximum 4 options.</p>
            )}

            {/* Remove options */}
            {options.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                  <span
                    key={opt.id}
                    className="inline-flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1 text-sm text-slate-700"
                  >
                    {opt.label}
                    <button
                      onClick={() => removeOption(opt.id)}
                      className="text-slate-400 hover:text-red-500 text-base leading-none"
                      title="Remove option"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
