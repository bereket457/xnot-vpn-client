export type VpnStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

export type TunnelProtocol =
  | "tls-tunnel"
  | "ssh"
  | "v2ray-vmess"
  | "vless-reality"
  | "trojan";

export type DnsProvider = "cloudflare" | "google" | "quad9" | "adguard" | "custom";

export type LogLevel = "INFO" | "DEBUG" | "TLS" | "WARN" | "ERR" | "SOCKET";

export type TabKey = "dashboard" | "settings" | "logs";

export interface VpnServer {
  id: string;
  name: string;
  countryCode: string;
  country: string;
  city: string;
  host: string;
  port: number;
  ping: number;
  load: number;
  favorite: boolean;
  premium: boolean;
}

export interface VpnConfig {
  sniHost: string;
  customPayload: string;
  httpHeaders: string;
  protocol: TunnelProtocol;
  dnsProvider: DnsProvider;
  customDns: string;
  serverHost: string;
  serverPort: number;
  username: string;
  password: string;
  vmessUuid: string;
  enableKillSwitch: boolean;
  enableUdpGw: boolean;
  mtuSize: number;
}

export interface TrafficSample {
  timestamp: number;
  upload: number;
  download: number;
  ping: number;
}

export interface TrafficMetric {
  uploadSpeed: number;
  downloadSpeed: number;
  ping: number;
  jitter: number;
  packetLoss: number;
  totalUploaded: number;
  totalDownloaded: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: string;
}

export interface HandshakeStep {
  key: string;
  label: string;
  detail: string;
}

export interface ImportResult {
  ok: boolean;
  message: string;
}