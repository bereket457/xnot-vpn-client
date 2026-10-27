import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  ImportResult,
  LogEntry,
  LogLevel,
  TrafficMetric,
  TrafficSample,
  VpnConfig,
  VpnServer,
  VpnStatus,
} from "../types";
import {
  DEFAULT_CONFIG,
  HANDSHAKE_STEPS,
  INITIAL_LOGS,
  PRESET_PROFILES,
  SERVERS,
} from "../mockData";

interface VpnContextValue {
  status: VpnStatus;
  config: VpnConfig;
  servers: VpnServer[];
  server: VpnServer;
  metrics: TrafficMetric;
  history: TrafficSample[];
  logs: LogEntry[];
  uptime: number;
  handshakeIndex: number;
  virtualIp: string;
  connect: () => void;
  disconnect: () => void;
  toggleConnection: () => void;
  selectServer: (id: string) => void;
  toggleFavorite: (id: string) => void;
  updateConfig: (patch: Partial<VpnConfig>) => void;
  applyPreset: (id: string) => void;
  resetConfig: () => void;
  clearLogs: () => void;
  pushLog: (level: LogLevel, message: string, details?: string) => void;
  serializeConfig: () => string;
  importConfig: (raw: string) => ImportResult;
}

const VpnContext = createContext<VpnContextValue | null>(null);

const EMPTY_METRICS: TrafficMetric = {
  uploadSpeed: 0,
  downloadSpeed: 0,
  ping: 0,
  jitter: 0,
  packetLoss: 0,
  totalUploaded: 0,
  totalDownloaded: 0,
};

const pad = (n: number) => n.toString().padStart(2, "0");

const stamp = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const randomIp = () =>
  `10.${Math.floor(Math.random() * 20) + 8}.${Math.floor(Math.random() * 200)}.${Math.floor(
    Math.random() * 240,
  ) + 2}`;

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function VpnProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VpnStatus>("disconnected");
  const [config, setConfig] = useState<VpnConfig>(DEFAULT_CONFIG);
  const [servers, setServers] = useState<VpnServer[]>(SERVERS);
  const [selectedId, setSelectedId] = useState<string>(SERVERS[0].id);
  const [metrics, setMetrics] = useState<TrafficMetric>(EMPTY_METRICS);
  const [history, setHistory] = useState<TrafficSample[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [uptime, setUptime] = useState(0);
  const [handshakeIndex, setHandshakeIndex] = useState(0);
  const [virtualIp, setVirtualIp] = useState("0.0.0.0");

  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;
  const logCounter = useRef(0);

  const server = useMemo(
    () => servers.find((s) => s.id === selectedId) ?? servers[0],
    [servers, selectedId],
  );

  const serverRef = useRef(server);
  serverRef.current = server;
  const configRef = useRef(config);
  configRef.current = config;

  const pushLog = useCallback((level: LogLevel, message: string, details?: string) => {
    logCounter.current += 1;
    const entry: LogEntry = {
      id: `log-${logCounter.current}-${Date.now()}`,
      timestamp: stamp(),
      level,
      message,
      details,
    };
    setLogs((prev) => [...prev.slice(-220), entry]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    pushLog("INFO", "Console buffer flushed by operator");
  }, [pushLog]);

  /* ---------------- connection state machine ---------------- */
  useEffect(() => {
    const timers: number[] = [];
    let interval: number | undefined;

    if (status === "connecting" || status === "reconnecting") {
      const cfg = configRef.current;
      const active = serverRef.current;
      setHandshakeIndex(0);
      setMetrics(EMPTY_METRICS);
      setHistory([]);
      if (status === "connecting") {
        pushLog(
          "INFO",
          `Negotiating tunnel to ${active.host}:${cfg.serverPort}`,
          `protocol=${cfg.protocol} sni=${cfg.sniHost} dns=${cfg.customDns}`,
        );
      } else {
        pushLog("WARN", `Re-negotiating session on ${active.name}`, "route expiry detected");
      }

      HANDSHAKE_STEPS.forEach((step, index) => {
        timers.push(
          window.setTimeout(() => {
            setHandshakeIndex(index + 1);
            pushLog("TLS", `${step.label}`, step.detail);
          }, 300 * (index + 1)),
        );
      });

      timers.push(
        window.setTimeout(() => {
          const ip = randomIp();
          setVirtualIp(ip);
          setUptime(0);
          setMetrics({
            uploadSpeed: 0.4,
            downloadSpeed: 1.8,
            ping: serverRef.current.ping,
            jitter: 2,
            packetLoss: 0,
            totalUploaded: 0,
            totalDownloaded: 0,
          });
          pushLog(
            "SOCKET",
            `Virtual interface up on ${ip}`,
            `mtu=${cfg.mtuSize} udp_gw=${cfg.enableUdpGw ? "on" : "off"}`,
          );
          setStatus("connected");
        }, 300 * (HANDSHAKE_STEPS.length + 1) + 260),
      );
    }

    if (status === "connected") {
      const basePing = serverRef.current.ping;
      pushLog("INFO", `Session secured via ${serverRef.current.name}`, "kill switch active");

      interval = window.setInterval(() => {
        const prev = metricsRef.current;
        const loadFactor = 1 + serverRef.current.load / 140;
        const down = Math.max(
          0.35,
          prev.downloadSpeed * 0.56 +
            (1.6 + Math.random() * 7.4) * loadFactor * (prev.downloadSpeed === 0 ? 2.2 : 1),
        );
        const up = Math.max(0.05, prev.uploadSpeed * 0.6 + (0.2 + Math.random() * 1.7));
        const ping = Math.max(
          9,
          Math.min(240, (prev.ping || basePing) + (Math.random() - 0.42) * 7),
        );
        const jitter = Math.max(0.4, Math.abs(ping - basePing) * 0.5 + Math.random() * 2.2);
        const next: TrafficMetric = {
          downloadSpeed: Number(down.toFixed(2)),
          uploadSpeed: Number(up.toFixed(2)),
          ping: Math.round(ping),
          jitter: Number(jitter.toFixed(1)),
          packetLoss: Number((Math.random() < 0.16 ? Math.random() * 0.9 : 0).toFixed(2)),
          totalDownloaded: prev.totalDownloaded + down * 1024 * 1024,
          totalUploaded: prev.totalUploaded + up * 1024 * 1024,
        };
        setMetrics(next);
        setUptime((u) => u + 1);
        setHistory((h) => [
          ...h.slice(-47),
          {
            timestamp: Date.now(),
            upload: next.uploadSpeed,
            download: next.downloadSpeed,
            ping: next.ping,
          },
        ]);
      }, 1000);
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      if (interval) window.clearInterval(interval);
    };
  }, [status, pushLog]);

  const connect = useCallback(() => {
    setStatus((prev) => (prev === "connected" ? prev : "connecting"));
  }, []);

  const disconnect = useCallback(() => {
    setStatus("disconnected");
    setHandshakeIndex(0);
    setHistory([]);
    setUptime(0);
    setVirtualIp("0.0.0.0");
    setMetrics(EMPTY_METRICS);
    pushLog("WARN", "Tunnel torn down by operator", "sockets closed, routes flushed");
  }, [pushLog]);

  const toggleConnection = useCallback(() => {
    if (status === "connected" || status === "connecting") {
      disconnect();
    } else {
      connect();
    }
  }, [status, connect, disconnect]);

  const selectServer = useCallback(
    (id: string) => {
      const next = servers.find((s) => s.id === id);
      if (!next) return;
      setSelectedId(id);
      setConfig((c) => ({ ...c, serverHost: next.host, serverPort: next.port }));
      pushLog("DEBUG", `Server preset loaded: ${next.name}`, `${next.host}:${next.port}`);
      if (server.id !== id && status === "connected") {
        setStatus("reconnecting");
      }
    },
    [servers, server.id, status, pushLog],
  );

  const toggleFavorite = useCallback((id: string) => {
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s)),
    );
  }, []);

  const updateConfig = useCallback((patch: Partial<VpnConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyPreset = useCallback(
    (id: string) => {
      const preset = PRESET_PROFILES.find((p) => p.id === id);
      if (!preset) return;
      setConfig((prev) => ({ ...prev, ...preset.patch }));
      pushLog("INFO", `Profile applied: ${preset.name}`, preset.note);
    },
    [pushLog],
  );

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    pushLog("WARN", "Configuration restored to factory defaults");
  }, [pushLog]);

  const serializeConfig = useCallback(() => {
    const payload = JSON.stringify({ app: "xnot-vpn", version: 2, config }, null, 2);
    return btoa(unescape(encodeURIComponent(payload)));
  }, [config]);

  const importConfig = useCallback(
    (raw: string): ImportResult => {
      const trimmed = raw.trim();
      if (!trimmed) return { ok: false, message: "Nothing to import" };
      let parsed: unknown;
      try {
        const jsonText = trimmed.startsWith("{")
          ? trimmed
          : decodeURIComponent(escape(atob(trimmed)));
        parsed = JSON.parse(jsonText);
      } catch {
        pushLog("ERR", "Import rejected: malformed payload");
        return { ok: false, message: "Payload is not a valid .xnot or JSON profile" };
      }
      const candidate =
        parsed && typeof parsed === "object" && "config" in parsed
          ? (parsed as { config: Partial<VpnConfig> }).config
          : (parsed as Partial<VpnConfig>);
      if (!candidate || typeof candidate !== "object" || !("protocol" in candidate)) {
        pushLog("ERR", "Import rejected: missing config keys");
        return { ok: false, message: "Profile is missing required tunnel keys" };
      }
      setConfig((prev) => ({ ...prev, ...candidate }));
      pushLog("INFO", "Configuration imported", `keys=${Object.keys(candidate).length}`);
      return { ok: true, message: "Configuration imported" };
    },
    [pushLog],
  );

  const value: VpnContextValue = {
    status,
    config,
    servers,
    server,
    metrics,
    history,
    logs,
    uptime,
    handshakeIndex,
    virtualIp,
    connect,
    disconnect,
    toggleConnection,
    selectServer,
    toggleFavorite,
    updateConfig,
    applyPreset,
    resetConfig,
    clearLogs,
    pushLog,
    serializeConfig,
    importConfig,
  };

  return <VpnContext.Provider value={value}>{children}</VpnContext.Provider>;
}

export function useVpn() {
  const ctx = useContext(VpnContext);
  if (!ctx) throw new Error("useVpn must be used inside VpnProvider");
  return ctx;
}