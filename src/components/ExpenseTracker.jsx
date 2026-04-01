import { useState, useEffect, useMemo } from "react";
import { supabase, supabaseEnabled } from "../lib/supabase";
import SectionCard from "./SectionCard";

const LS_KEY = "ski-trip-expenses";
const DEFAULT_GROUP_SIZE = 12;

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}
function saveLocal(expenses) {
  localStorage.setItem(LS_KEY, JSON.stringify(expenses));
}

const fmt = (n) => "$" + Math.abs(n).toFixed(2);

// Simplify debts: given a map of { person: netBalance }, return minimal transfers
function simplifyDebts(expenses) {
  // Calculate net balance per person: positive = owed money, negative = owes money
  const balances = {};

  for (const exp of expenses) {
    const payer = exp.paidBy;
    const amount = exp.amount;
    const splitBetween = exp.splitBetween;
    const share = amount / splitBetween.length;

    // Payer is owed by everyone in the split
    for (const person of splitBetween) {
      if (!balances[person]) balances[person] = 0;
      if (!balances[payer]) balances[payer] = 0;
      if (person !== payer) {
        balances[person] -= share; // person owes
        balances[payer] += share; // payer is owed
      }
    }
  }

  // Simplify: match debtors with creditors
  const debtors = []; // { name, amount } — people who owe (negative balance)
  const creditors = []; // { name, amount } — people who are owed (positive balance)

  for (const [name, bal] of Object.entries(balances)) {
    if (bal < -0.01) debtors.push({ name, amount: -bal });
    else if (bal > 0.01) creditors.push({ name, amount: bal });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amount, creditors[j].amount);
    if (transfer > 0.01) {
      transfers.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount: Math.round(transfer * 100) / 100,
      });
    }
    debtors[i].amount -= transfer;
    creditors[j].amount -= transfer;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return { balances, transfers };
}

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState([]);
  const [paidBy, setPaidBy] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitMode, setSplitMode] = useState("all"); // "all" or "custom"
  const [groupSize, setGroupSize] = useState(DEFAULT_GROUP_SIZE);
  const [customNames, setCustomNames] = useState("");

  // Load on mount
  useEffect(() => {
    if (supabaseEnabled) {
      supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          if (data) {
            setExpenses(
              data.map((e) => ({
                id: e.id,
                paidBy: e.paid_by,
                description: e.description,
                amount: e.amount,
                splitBetween: e.split_between,
                created_at: e.created_at,
              }))
            );
          }
        })
        .catch(() => setExpenses(loadLocal()));
    } else {
      setExpenses(loadLocal());
    }
  }, []);

  // Get all unique names from expenses
  const allNames = useMemo(() => {
    const names = new Set();
    for (const e of expenses) {
      names.add(e.paidBy);
      for (const n of e.splitBetween) names.add(n);
    }
    return [...names].sort();
  }, [expenses]);

  const { balances, transfers } = useMemo(() => simplifyDebts(expenses), [expenses]);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  async function addExpense(e) {
    e.preventDefault();
    if (!paidBy.trim() || !description.trim() || !amount) return;

    let splitBetween;
    if (splitMode === "all") {
      // Generate names: use all known names, or generate Person 1..N
      if (allNames.length >= 2) {
        splitBetween = [...allNames];
        // Make sure payer is included
        if (!splitBetween.includes(paidBy.trim())) {
          splitBetween.push(paidBy.trim());
        }
      } else {
        splitBetween = Array.from({ length: groupSize }, (_, i) => `Person ${i + 1}`);
        // Replace first placeholder with the payer name
        splitBetween[0] = paidBy.trim();
      }
    } else {
      splitBetween = customNames
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      if (splitBetween.length === 0) return;
      if (!splitBetween.includes(paidBy.trim())) {
        splitBetween.push(paidBy.trim());
      }
    }

    const expense = {
      id: Date.now(),
      paidBy: paidBy.trim(),
      description: description.trim(),
      amount: parseFloat(amount),
      splitBetween,
      created_at: new Date().toISOString(),
    };

    if (supabaseEnabled) {
      try {
        const { data } = await supabase
          .from("expenses")
          .insert({
            paid_by: expense.paidBy,
            description: expense.description,
            amount: expense.amount,
            split_between: expense.splitBetween,
          })
          .select()
          .single();
        if (data) {
          expense.id = data.id;
          expense.created_at = data.created_at;
        }
      } catch {
        // use optimistic local
      }
    }

    setExpenses((prev) => {
      const next = [...prev, expense];
      if (!supabaseEnabled) saveLocal(next);
      return next;
    });
    setDescription("");
    setAmount("");
  }

  async function removeExpense(id) {
    if (supabaseEnabled) {
      try {
        await supabase.from("expenses").delete().eq("id", id);
      } catch {
        // optimistic
      }
    }
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      if (!supabaseEnabled) saveLocal(next);
      return next;
    });
  }

  return (
    <SectionCard title="Trip Expenses" emoji="💸">
      {!supabaseEnabled && (
        <p className="text-xs text-amber-600 mb-2">
          Supabase not configured — expenses are saved locally only.
        </p>
      )}

      {/* Add expense form */}
      <form onSubmit={addExpense} className="mb-4 flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Who paid?"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            list="known-names"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
          <datalist id="known-names">
            {allNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <input
            type="text"
            placeholder="What for? (e.g. Groceries)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount ($)"
              value={amount}
              min="0.01"
              step="0.01"
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Split options */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-slate-600 font-medium">Split:</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="split"
              checked={splitMode === "all"}
              onChange={() => setSplitMode("all")}
              className="accent-sky-500"
            />
            <span className="text-slate-700">
              Everyone
              {allNames.length < 2 && (
                <span className="text-slate-400 ml-1">
                  (
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={groupSize}
                    onChange={(e) => setGroupSize(Math.max(2, +e.target.value))}
                    className="w-10 text-center border-b border-slate-300 bg-transparent text-sm"
                  />
                  {" "}people)
                </span>
              )}
            </span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="split"
              checked={splitMode === "custom"}
              onChange={() => setSplitMode("custom")}
              className="accent-sky-500"
            />
            <span className="text-slate-700">Custom</span>
          </label>
          {splitMode === "custom" && (
            <input
              type="text"
              placeholder="Names, comma separated"
              value={customNames}
              onChange={(e) => setCustomNames(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          )}
        </div>
      </form>

      {/* Expense list */}
      {expenses.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-sky-700 uppercase tracking-wide">
              All Expenses
            </h3>
            <span className="text-sm font-semibold text-sky-800">
              Total: {fmt(totalSpent)}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center gap-2 bg-sky-50 rounded-lg px-3 py-2 border border-sky-100 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold text-sky-800">{exp.paidBy}</span>
                    <span className="text-slate-500"> paid </span>
                    <span className="font-semibold text-slate-800">{fmt(exp.amount)}</span>
                    <span className="text-slate-500"> for </span>
                    <span className="text-slate-700">{exp.description}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Split {exp.splitBetween.length} ways ({fmt(exp.amount / exp.splitBetween.length)}/person)
                  </p>
                </div>
                <button
                  onClick={() => removeExpense(exp.id)}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settlement summary */}
      {transfers.length > 0 && (
        <div className="rounded-xl bg-sky-50 border border-sky-200 p-4">
          <h3 className="text-sm font-bold text-sky-700 uppercase tracking-wide mb-3">
            Who Owes Who
          </h3>
          <div className="flex flex-col gap-2">
            {transfers.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-red-700">{t.from}</span>
                <span className="text-slate-400">→</span>
                <span className="font-semibold text-green-700">{t.to}</span>
                <span className="ml-auto font-bold text-sky-800">{fmt(t.amount)}</span>
              </div>
            ))}
          </div>

          {/* Net balances */}
          <div className="mt-4 border-t border-sky-200 pt-3">
            <h4 className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-2">
              Net Balances
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(balances)
                .filter(([, bal]) => Math.abs(bal) > 0.01)
                .sort(([, a], [, b]) => b - a)
                .map(([name, bal]) => (
                  <div
                    key={name}
                    className={`rounded-lg px-3 py-2 text-center text-sm border ${
                      bal > 0
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <p className="font-semibold text-slate-800">{name}</p>
                    <p className={`font-bold ${bal > 0 ? "text-green-700" : "text-red-700"}`}>
                      {bal > 0 ? "+" : "-"}{fmt(bal)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {bal > 0 ? "is owed" : "owes"}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {expenses.length === 0 && (
        <p className="text-sm text-slate-400">
          No expenses logged yet. Add one above to start tracking!
        </p>
      )}
    </SectionCard>
  );
}
