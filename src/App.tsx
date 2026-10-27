import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";
import { Cpu, Globe2, ShieldHalf } from "lucide-react";
import { VpnProvider, useVpn } from "./context/VpnContext";
import Header from "./components/Header";
import HomeScreen from "./components/HomeScreen";
import SettingsScreen from "./components/SettingsScreen";
import LogScreen from "./components/LogScreen";
import { PROTOCOLS } from "./mockData";
import type { TabKey } from "./types";

const pad = (n: number) => n.toString().padStart(2, "0");

function Shell() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const { status, config, server, virtualIp, metrics } = useVpn();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const protocol = PROTOCOLS.find((p) => p.id === config.protocol);
  const time = `${pad(clock.getHours())}:${pad(clock.getMinutes())}:${pad(clock.getSeconds())}`;

  return (
    <div className="dark min-h-screen bg-[#05080e] text-slate-200 antialiased">
      {/* ambient cyber grid */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,240,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.055) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at 50% 0%, #000 20%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, #000 20%, transparent 78%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 460px at 12% -8%, rgba(0,240,255,0.12), transparent 65%), radial-gradient(760px 420px at 88% 0%, rgba(168,85,247,0.12), transparent 62%), radial-gradient(700px 520px at 50% 105%, rgba(16,185,129,0.08), transparent 65%)",
        }}
      />

      <Header tab={tab} onTabChange={setTab} />

      <main className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            {tab === "dashboard" && <HomeScreen />}
            {tab === "settings" && <SettingsScreen />}
            {tab === "logs" && <LogScreen />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="sticky bottom-0 z-30 mt-4 border-t border-white/[0.06] bg-[#05080e]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 font-mono text-[10px] text-slate-500 sm:px-6">
          <span className="flex items-center gap-1.5">
            <ShieldHalf className="size-3 text-cyan-400" strokeWidth={1.8} />
            XNOT CORE v2.4.1
          </span>
          <span className="flex items-center gap-1.5">
            <Globe2 className="size-3" strokeWidth={1.8} />
            {server.countryCode} {server.host}:{config.serverPort}
          </span>
          <span className="hidden items-center gap-1.5 md:flex">
            <Cpu className="size-3" strokeWidth={1.8} />
            {protocol?.cipher}
          </span>
          <span className="ml-auto flex items-center gap-3">
            <span className={status === "connected" ? "text-emerald-400" : "text-slate-500"}>
              {status === "connected" ? `${metrics.ping}ms / ${virtualIp}` : "OFFLINE"}
            </span>
            <span className="text-slate-400">{time}</span>
          </span>
        </div>
      </footer>

      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#0a0e15",
            border: "1px solid rgba(0,240,255,0.18)",
            color: "#e2e8f0",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "12px",
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <VpnProvider>
      <Shell />
    </VpnProvider>
  );
}