import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  Copy,
  Eraser,
  FileDown,
  Lock,
  Search,
  Terminal,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { downloadText, useVpn } from "../context/VpnContext";
import { HANDSHAKE_STEPS } from "../mockData";
import type { LogLevel } from "../types";

const LEVEL_STYLE: Record<LogLevel, string> = {
  INFO: "text-sky-300 border-sky-400/40 bg-sky-400/10",
  DEBUG: "text-slate-300 border-slate-400/30 bg-slate-400/10",
  TLS: "text-cyan-300 border-cyan-400/40 bg-cyan-400/10",
  WARN: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  ERR: "text-rose-300 border-rose-400/40 bg-rose-400/10",
  SOCKET: "text-fuchsia-300 border-fuchsia-400/40 bg-fuchsia-400/10",
};

const FILTERS: (LogLevel | "ALL")[] = ["ALL", "TLS", "SOCKET", "INFO", "WARN", "ERR", "DEBUG"];

export default function LogScreen() {
  const { logs, clearLogs, status, handshakeIndex, pushLog } = useVpn();
  const [level, setLevel] = useState<LogLevel | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [locked, setLocked] = useState(true);
  const scroller = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((entry) => {
      const levelOk = level === "ALL" || entry.level === level;
      const textOk =
        !q ||
        entry.message.toLowerCase().includes(q) ||
        (entry.details ?? "").toLowerCase().includes(q);
      return levelOk && textOk;
    });
  }, [logs, level, query]);

  useEffect(() => {
    if (!locked) return;
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [filtered.length, locked]);

  const asText = () =>
    filtered
      .map((e) => `[${e.timestamp}] ${e.level.padEnd(6)} ${e.message}${e.details ? ` | ${e.details}` : ""}`)
      .join(String.fromCharCode(10));

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(asText());
      toast.success("Console buffer copied");
    } catch {
      toast.error("Clipboard permission denied");
    }
  };

  const exportLog = () => {
    downloadText(`xnot-console-${Date.now()}.log`, asText());
    pushLog("INFO", "Console exported to disk");
    toast.success("Log file exported");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <section className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0a0e15]/70 p-4 xl:col-span-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-[0.14em] text-white">
              <Lock className="size-4 text-cyan-300" strokeWidth={1.7} />
              TLS HANDSHAKE INSPECTOR
            </h2>
            <p className="mt-1 font-mono text-[11px] text-slate-500">
              stage {Math.min(handshakeIndex, HANDSHAKE_STEPS.length)} / {HANDSHAKE_STEPS.length} - {status}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-slate-400">
            {status === "connected" ? (
              <Unlock className="size-3 text-emerald-400" />
            ) : (
              <Lock className="size-3 text-slate-500" />
            )}
            X25519 KEY EXCHANGE
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {HANDSHAKE_STEPS.map((step, index) => {
            const done = handshakeIndex > index;
            const active = handshakeIndex === index && status !== "disconnected";
            return (
              <div
                key={step.key}
                className={`rounded-lg border p-2.5 transition-colors ${
                  done
                    ? "border-emerald-400/40 bg-emerald-400/[0.07]"
                    : active
                      ? "border-amber-400/50 bg-amber-400/[0.07]"
                      : "border-white/[0.06] bg-white/[0.015]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`grid size-4 shrink-0 place-items-center rounded-full border text-[9px] font-bold ${
                      done
                        ? "border-emerald-400/60 bg-emerald-400/20 text-emerald-300"
                        : active
                          ? "border-amber-400/60 bg-amber-400/20 text-amber-300"
                          : "border-white/15 text-slate-500"
                    }`}
                  >
                    {done ? <Check className="size-2.5" strokeWidth={3} /> : index + 1}
                  </span>
                  <span
                    className={`truncate font-mono text-[10px] uppercase tracking-[0.08em] ${
                      done ? "text-emerald-200" : active ? "text-amber-200" : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 font-mono text-[10px] leading-relaxed text-slate-500">
                  {step.detail}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#070b11]/85 xl:col-span-12">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
          <Terminal className="size-4 text-emerald-400" strokeWidth={1.7} />
          <span className="font-mono text-[11px] tracking-[0.16em] text-slate-300">CONSOLE</span>
          <span className="rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
            {filtered.length} lines
          </span>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1">
              <Search className="size-3.5 text-slate-500" strokeWidth={1.8} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="filter"
                className="w-24 bg-transparent font-mono text-[11px] text-slate-200 outline-none placeholder:text-slate-600 sm:w-36"
              />
            </div>
            <button
              onClick={() => setLocked((v) => !v)}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] tracking-[0.1em] transition-colors ${
                locked
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "border-white/[0.08] text-slate-400"
              }`}
            >
              {locked ? "AUTO-SCROLL" : "LOCKED"}
            </button>
            <button
              onClick={copyAll}
              className="rounded-md border border-white/[0.08] p-1.5 text-slate-400 transition-colors hover:text-cyan-300"
              title="Copy all"
            >
              <Copy className="size-3.5" strokeWidth={1.8} />
            </button>
            <button
              onClick={exportLog}
              className="rounded-md border border-white/[0.08] p-1.5 text-slate-400 transition-colors hover:text-cyan-300"
              title="Export .log"
            >
              <FileDown className="size-3.5" strokeWidth={1.8} />
            </button>
            <button
              onClick={clearLogs}
              className="rounded-md border border-white/[0.08] p-1.5 text-slate-400 transition-colors hover:text-rose-300"
              title="Clear console"
            >
              <Eraser className="size-3.5" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-white/[0.06] px-3 py-2">
          {FILTERS.map((f) => {
            const active = level === f;
            return (
              <button
                key={f}
                onClick={() => setLevel(f)}
                className={`rounded border px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] transition-colors ${
                  active
                    ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                    : "border-white/[0.07] text-slate-500 hover:text-slate-300"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>

        <div
          ref={scroller}
          className="h-[420px] overflow-y-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed"
        >
          {filtered.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <Terminal className="mx-auto size-6 text-slate-700" strokeWidth={1.5} />
                <p className="mt-2 text-slate-500">No log lines match this filter.</p>
                <p className="text-slate-600">Connect a tunnel to generate traffic events.</p>
              </div>
            </div>
          ) : (
            filtered.map((entry) => (
              <div
                key={entry.id}
                className="group flex gap-2 rounded px-1 py-0.5 hover:bg-white/[0.03]"
              >
                <span className="shrink-0 text-slate-600">{entry.timestamp}</span>
                <span
                  className={`h-4 shrink-0 rounded border px-1 text-[9px] leading-4 tracking-[0.08em] ${
                    LEVEL_STYLE[entry.level]
                  }`}
                >
                  {entry.level}
                </span>
                <span className="min-w-0 flex-1 break-words text-slate-300">
                  {entry.message}
                  {entry.details && (
                    <span className="ml-2 text-slate-600">{entry.details}</span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2 font-mono text-[10px] text-slate-600">
          <ArrowDownToLine className="size-3" />
          buffered locally - nothing leaves this device
        </div>
      </section>
    </div>
  );
}