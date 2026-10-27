import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  CircleDot,
  Copy,
  Gauge,
  MapPin,
  Power,
  Server,
  ShieldCheck,
  Signal,
  Star,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useVpn } from "../context/VpnContext";
import { DNS_PRESETS, PROTOCOLS } from "../mockData";

const PANEL =
  "relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0a0e15]/70 backdrop-blur-sm";

const STATUS_META: Record<
  string,
  { label: string; hint: string; accent: string; ring: string; text: string }
> = {
  disconnected: {
    label: "DISCONNECTED",
    hint: "tunnel down - traffic is exposed",
    accent: "#38bdf8",
    ring: "rgba(56,189,248,0.35)",
    text: "text-sky-300",
  },
  connecting: {
    label: "CONNECTING",
    hint: "negotiating TLS handshake",
    accent: "#f59e0b",
    ring: "rgba(245,158,11,0.4)",
    text: "text-amber-300",
  },
  connected: {
    label: "CONNECTED",
    hint: "traffic is encrypted end to end",
    accent: "#10b981",
    ring: "rgba(16,185,129,0.45)",
    text: "text-emerald-300",
  },
  reconnecting: {
    label: "RECONNECTING",
    hint: "rotating exit relay",
    accent: "#a855f7",
    ring: "rgba(168,85,247,0.4)",
    text: "text-fuchsia-300",
  },
};

const formatSpeed = (mbps: number) => {
  if (mbps <= 0) return { value: "0.00", unit: "MB/s" };
  if (mbps < 1) return { value: (mbps * 1024).toFixed(0), unit: "KB/s" };
  return { value: mbps.toFixed(2), unit: "MB/s" };
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
};

const formatUptime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
};

function Sparkline({ data, color, label }: { data: number[]; color: string; label: string }) {
  const w = 300;
  const h = 72;
  const series = data.length > 1 ? data : [0, 0];
  const max = Math.max(...series, 1);
  const step = w / (series.length - 1);
  const points = series.map((v, i) => {
    const x = i * step;
    const y = h - (Math.min(v, max) / max) * (h - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M ${points.join(" L ")}`;
  const area = `${line} L ${w},${h} L 0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-[72px] w-full" aria-label={label}>
      <path d={area} fill={color} fillOpacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function PingGauge({ ping, jitter, loss }: { ping: number; jitter: number; loss: number }) {
  const frac = Math.min(ping / 220, 1);
  const arc = 144.5;
  const tone = ping === 0 ? "#475569" : ping < 45 ? "#10b981" : ping < 110 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 112 70" className="w-full max-w-[190px]">
        <path
          d="M 10 58 A 46 46 0 0 1 102 58"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M 10 58 A 46 46 0 0 1 102 58"
          fill="none"
          stroke={tone}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(frac * arc).toFixed(1)} ${arc}`}
          style={{ transition: "stroke-dasharray 700ms ease, stroke 400ms ease" }}
        />
        <text x="56" y="48" textAnchor="middle" className="fill-white" fontSize="21" fontWeight="600">
          {ping === 0 ? "--" : ping}
        </text>
        <text x="56" y="62" textAnchor="middle" fill="#64748b" fontSize="8" letterSpacing="1.4">
          MS LATENCY
        </text>
      </svg>
      <div className="mt-1 grid w-full grid-cols-2 gap-2">
        <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-center">
          <p className="font-mono text-[9px] tracking-[0.12em] text-slate-500">JITTER</p>
          <p className="font-mono text-[12px] text-slate-200">{jitter.toFixed(1)} ms</p>
        </div>
        <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-center">
          <p className="font-mono text-[9px] tracking-[0.12em] text-slate-500">LOSS</p>
          <p className={`font-mono text-[12px] ${loss > 0 ? "text-amber-300" : "text-slate-200"}`}>
            {loss.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}

function ConnectHud() {
  const { status, toggleConnection, handshakeIndex, server } = useVpn();
  const meta = STATUS_META[status];
  const busy = status === "connecting" || status === "reconnecting";

  return (
    <div className="relative flex flex-col items-center justify-center px-4 py-6">
      <div className="relative grid size-[248px] place-items-center sm:size-[272px]">
        <motion.div
          className="absolute inset-0 rounded-full border border-dashed"
          style={{ borderColor: meta.ring }}
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-4 rounded-full border border-white/[0.06]"
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        />
        <div
          className="absolute inset-[26px] rounded-full border"
          style={{ borderColor: meta.ring, boxShadow: `0 0 60px ${meta.ring} inset` }}
        />
        {status === "connected" && (
          <motion.div
            className="absolute inset-[18px] rounded-full border"
            style={{ borderColor: meta.ring }}
            animate={{ scale: [1, 1.09, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <motion.button
          onClick={toggleConnection}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="relative grid size-[150px] place-items-center rounded-full border text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 sm:size-[164px]"
          style={{
            borderColor: meta.ring,
            background: `radial-gradient(circle at 50% 28%, ${meta.accent}26, #070b11 72%)`,
            boxShadow: `0 0 44px ${meta.ring}`,
          }}
          aria-label={status === "connected" ? "Disconnect tunnel" : "Connect tunnel"}
        >
          <Power
            className={`size-9 ${meta.text}`}
            strokeWidth={1.5}
            style={{ filter: `drop-shadow(0 0 12px ${meta.ring})` }}
          />
          <span className={`mt-1.5 font-mono text-[11px] tracking-[0.2em] ${meta.text}`}>
            {status === "connected" ? "DISCONNECT" : busy ? "ABORT" : "CONNECT"}
          </span>
          <span className="mt-0.5 font-mono text-[9px] tracking-[0.12em] text-slate-500">
            {busy ? `stage ${handshakeIndex}/5` : server.countryCode}
          </span>
        </motion.button>
      </div>

      <div className="mt-5 flex flex-col items-center">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-70" style={{ color: meta.accent }} />
            <span className="relative inline-flex size-2 rounded-full" style={{ background: meta.accent }} />
          </span>
          <span className={`font-mono text-[13px] tracking-[0.22em] ${meta.text}`}>{meta.label}</span>
        </div>
        <p className="mt-1 text-center font-mono text-[11px] text-slate-500">{meta.hint}</p>
      </div>
    </div>
  );
}

function ServerPicker() {
  const { servers, server, selectServer, status, toggleFavorite } = useVpn();
  const [open, setOpen] = useState(false);

  return (
    <div className={`${PANEL} p-4`}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-slate-400">
          <Server className="size-3.5 text-cyan-300" strokeWidth={1.8} />
          EXIT RELAY
        </h2>
        <span className="font-mono text-[10px] text-slate-600">{servers.length} nodes online</span>
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-3 flex w-full items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:border-cyan-400/30"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-md border border-cyan-400/25 bg-cyan-400/10 font-mono text-[11px] tracking-[0.06em] text-cyan-200">
          {server.countryCode}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-white">{server.name}</span>
          <span className="block truncate font-mono text-[10px] text-slate-500">
            {server.host}:{server.port} - {server.city}
          </span>
        </span>
        <span className="hidden shrink-0 flex-col items-end sm:flex">
          <span className="font-mono text-[11px] text-emerald-300">{server.ping} ms</span>
          <span className="font-mono text-[9px] text-slate-600">load {server.load}%</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.8}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mt-2 max-h-[248px] overflow-y-auto rounded-lg border border-white/[0.08] bg-[#070b11]"
          >
            {servers.map((node) => {
              const active = node.id === server.id;
              return (
                <div
                  key={node.id}
                  className={`flex items-center gap-2 border-b border-white/[0.04] px-2.5 py-2 last:border-0 ${
                    active ? "bg-cyan-400/[0.07]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <button
                    onClick={() => {
                      selectServer(node.id);
                      setOpen(false);
                      toast.success(`Exit relay set to ${node.name}`);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span className="w-7 shrink-0 font-mono text-[10px] text-slate-500">
                      {node.countryCode}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-slate-200">{node.name}</span>
                      <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <span
                          className={`block h-full rounded-full ${
                            node.load > 70 ? "bg-rose-400" : node.load > 45 ? "bg-amber-400" : "bg-emerald-400"
                          }`}
                          style={{ width: `${node.load}%` }}
                        />
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10.5px] text-slate-400">{node.ping}ms</span>
                    {active && <Check className="size-3.5 shrink-0 text-cyan-300" strokeWidth={2.4} />}
                  </button>
                  <button
                    onClick={() => toggleFavorite(node.id)}
                    className="shrink-0 p-1"
                    aria-label="Toggle favorite"
                  >
                    <Star
                      className={`size-3.5 ${node.favorite ? "fill-amber-300 text-amber-300" : "text-slate-600"}`}
                      strokeWidth={1.6}
                    />
                  </button>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-slate-600">
        <MapPin className="size-3" />
        {status === "connected" ? `routed via ${server.city}, ${server.country}` : "no active route"}
      </div>
    </div>
  );
}

export default function HomeScreen() {
  const { metrics, history, uptime, config, status, virtualIp, server } = useVpn();
  const protocol = PROTOCOLS.find((p) => p.id === config.protocol);
  const dns = DNS_PRESETS.find((d) => d.id === config.dnsProvider);

  const downSeries = useMemo(() => history.map((h) => h.download), [history]);
  const upSeries = useMemo(() => history.map((h) => h.upload), [history]);
  const down = formatSpeed(metrics.downloadSpeed);
  const up = formatSpeed(metrics.uploadSpeed);

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <section className={`${PANEL} xl:col-span-4`}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-slate-400">
            <ShieldCheck className="size-3.5 text-cyan-300" strokeWidth={1.8} />
            TUNNEL CONTROL
          </h2>
          <span className="rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] text-slate-500">
            {protocol?.tag}
          </span>
        </div>
        <ConnectHud />
        <div className="mx-4 mb-4 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
            <Timer className="size-3" /> UPTIME
          </div>
          <div className="text-right font-mono text-[11px] text-slate-200">{formatUptime(uptime)}</div>
        </div>
      </section>

      <section className={`${PANEL} flex flex-col p-4 xl:col-span-5`}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-slate-400">
            <Activity className="size-3.5 text-emerald-400" strokeWidth={1.8} />
            LIVE TRAFFIC
          </h2>
          <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.1em] text-slate-500">
            <span className={`size-1.5 rounded-full ${status === "connected" ? "bg-emerald-400" : "bg-slate-600"}`} />
            {status === "connected" ? "STREAMING" : "IDLE"}
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-emerald-300">
              <ArrowDown className="size-3" strokeWidth={2.4} /> DOWNLOAD
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-2xl font-semibold text-white tabular-nums">{down.value}</span>
              <span className="font-mono text-[11px] text-emerald-300/80">{down.unit}</span>
            </div>
            <Sparkline data={downSeries} color="#10b981" label="down" />
          </div>

          <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-cyan-300">
              <ArrowUp className="size-3" strokeWidth={2.4} /> UPLOAD
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-2xl font-semibold text-white tabular-nums">{up.value}</span>
              <span className="font-mono text-[11px] text-cyan-300/80">{up.unit}</span>
            </div>
            <Sparkline data={upSeries} color="#00f0ff" label="up" />
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
          <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
            <p className="font-mono text-[9px] tracking-[0.1em] text-slate-500">TOTAL DOWN</p>
            <p className="font-mono text-[11.5px] text-slate-200">{formatBytes(metrics.totalDownloaded)}</p>
          </div>
          <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
            <p className="font-mono text-[9px] tracking-[0.1em] text-slate-500">TOTAL UP</p>
            <p className="font-mono text-[11.5px] text-slate-200">{formatBytes(metrics.totalUploaded)}</p>
          </div>
        </div>
      </section>

      <section className={`${PANEL} p-4 xl:col-span-3`}>
        <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-slate-400">
          <Gauge className="size-3.5 text-amber-300" strokeWidth={1.8} />
          LATENCY
        </h2>
        <div className="mt-3">
          <PingGauge ping={metrics.ping} jitter={metrics.jitter} loss={metrics.packetLoss} />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
          <span className="flex items-center gap-1 font-mono text-[9px] tracking-[0.1em] text-slate-500">
            <Signal className="size-3" /> QUALITY
          </span>
          <span className="font-mono text-[10px] text-slate-300">
            {metrics.ping === 0 ? "--" : metrics.ping < 45 ? "EXCELLENT" : metrics.ping < 110 ? "FAIR" : "POOR"}
          </span>
        </div>
      </section>

      <div className="xl:col-span-8">
        <ServerPicker />
      </div>

      <section className={`${PANEL} p-4 xl:col-span-4`}>
        <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-slate-400">
          <CircleDot className="size-3.5 text-fuchsia-300" strokeWidth={1.8} />
          TUNNEL SPEC
        </h2>
        <dl className="mt-3 space-y-2">
          {[
            ["VIRTUAL IP", virtualIp, true],
            ["SNI HOST", config.sniHost, false],
            ["DNS RESOLVER", `${dns?.label ?? "Custom"} ${dns?.address ? `- ${dns.address}` : ""}`, false],
            ["CIPHER", protocol?.cipher ?? "-", false],
            ["MTU", `${config.mtuSize} bytes`, false],
          ].map(([label, value, copyable]) => (
            <div key={label as string} className="flex items-center justify-between gap-2">
              <dt className="shrink-0 font-mono text-[9.5px] tracking-[0.1em] text-slate-500">{label}</dt>
              <dd className="min-w-0 truncate font-mono text-[11px] text-slate-200">{value}</dd>
            </div>
          ))}
        </dl>
        <div
          className={`mt-3 flex items-center gap-2 rounded-md border px-2 py-1.5 font-mono text-[10px] ${
            config.enableKillSwitch
              ? "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-300"
              : "border-amber-400/30 bg-amber-400/[0.06] text-amber-300"
          }`}
        >
          {config.enableKillSwitch ? (
            <ShieldCheck className="size-3.5" strokeWidth={2} />
          ) : (
            <TriangleAlert className="size-3.5" strokeWidth={2} />
          )}
          KILL SWITCH {config.enableKillSwitch ? "ARMED" : "OFF"} / {server.host}
        </div>
      </section>
    </div>
  );
}