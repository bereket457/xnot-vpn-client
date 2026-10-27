import { motion } from "framer-motion";
import { Activity, ChevronRight, LayoutDashboard, SlidersHorizontal, Terminal } from "lucide-react";
import { useVpn } from "../context/VpnContext";
import type { TabKey } from "../types";
import { PROTOCOLS } from "../mockData";

const TABS: { key: TabKey; label: string; Icon: typeof Activity }[] = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "settings", label: "Tunnel Config", Icon: SlidersHorizontal },
  { key: "logs", label: "Live Console", Icon: Terminal },
];

const STATUS_STYLE: Record<string, string> = {
  disconnected: "text-slate-400 border-slate-500/30 bg-slate-500/10",
  connecting: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  connected: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
  reconnecting: "text-fuchsia-300 border-fuchsia-400/40 bg-fuchsia-400/10",
};

export default function Header({
  tab,
  onTabChange,
}: {
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
}) {
  const { status, metrics, config, updateConfig, server } = useVpn();
  const protocol = PROTOCOLS.find((p) => p.id === config.protocol);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#050810]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative grid size-9 place-items-center rounded-lg border border-cyan-400/40 bg-cyan-400/10">
            <svg viewBox="0 0 24 24" className="size-5 text-cyan-300" fill="none" strokeWidth="1.6">
              <path d="M12 2.5 20 6v6.2c0 4.4-3.2 7.6-8 9.3-4.8-1.7-8-4.9-8-9.3V6l8-3.5Z" stroke="currentColor" />
              <path d="M8.6 12.2l2.4 2.4 4.4-4.6" stroke="currentColor" strokeLinecap="round" />
            </svg>
            <span className="absolute -inset-1 -z-10 rounded-lg bg-cyan-400/20 blur-md" />
          </div>
          <div className="leading-none">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[17px] font-semibold tracking-[0.18em] text-white">XNOT</span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-cyan-400/70">VPN</span>
            </div>
            <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-slate-500">
              SECURE TUNNEL CLIENT
            </p>
          </div>
        </div>

        <nav className="ml-2 hidden items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1 md:flex">
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className={`relative flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                  active ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-md border border-cyan-400/30 bg-cyan-400/10"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className="relative size-4" strokeWidth={1.6} />
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-md border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 lg:flex">
            <span className="font-mono text-[10px] tracking-[0.14em] text-slate-500">PROTO</span>
            <span className="font-mono text-[11px] text-cyan-300">{protocol?.tag ?? "TLS"}</span>
          </div>

          <div className="hidden items-center gap-2 rounded-md border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 sm:flex">
            <Activity
              className={`size-3.5 ${status === "connected" ? "text-emerald-400" : "text-slate-500"}`}
              strokeWidth={1.8}
            />
            <span className="font-mono text-[11px] text-slate-300">
              {status === "connected" ? `${metrics.ping}ms` : "--"}
            </span>
          </div>

          <button
            onClick={() => updateConfig({ enableKillSwitch: !config.enableKillSwitch })}
            className={`group flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors ${
              config.enableKillSwitch
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : "border-white/[0.08] bg-white/[0.02] text-slate-400"
            }`}
            title="Kill switch"
          >
            <span className="font-mono text-[10px] tracking-[0.14em] hidden sm:inline">KILL</span>
            <span
              className={`relative h-3.5 w-7 rounded-full transition-colors ${
                config.enableKillSwitch ? "bg-emerald-400/70" : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 size-2.5 rounded-full bg-[#05080e] transition-all ${
                  config.enableKillSwitch ? "left-[15px]" : "left-0.5"
                }`}
              />
            </span>
          </button>

          <div
            className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${STATUS_STYLE[status]}`}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-current" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              {status === "reconnecting" ? "re-link" : status}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-t border-white/[0.05] px-3 py-2 md:hidden">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] ${
              tab === key
                ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                : "text-slate-400"
            }`}
          >
            <Icon className="size-3.5" strokeWidth={1.7} />
            {label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-slate-600">
          {server.countryCode}
          <ChevronRight className="size-3" />
        </span>
      </div>
    </header>
  );
}