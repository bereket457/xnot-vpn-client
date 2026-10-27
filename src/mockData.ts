import type {
  DnsProvider,
  HandshakeStep,
  LogEntry,
  TunnelProtocol,
  VpnConfig,
  VpnServer,
} from "./types";

export const SERVERS: VpnServer[] = [
  {
    id: "jp-tokyo-01",
    name: "Tokyo Edge",
    countryCode: "JP",
    country: "Japan",
    city: "Tokyo",
    host: "jp1.xnot.network",
    port: 443,
    ping: 38,
    load: 32,
    favorite: true,
    premium: false,
  },
  {
    id: "de-frankfurt-01",
    name: "Frankfurt Core",
    countryCode: "DE",
    country: "Germany",
    city: "Frankfurt",
    host: "de2.xnot.network",
    port: 8443,
    ping: 24,
    load: 58,
    favorite: false,
    premium: true,
  },
  {
    id: "sg-singapore-01",
    name: "Singapore Relay",
    countryCode: "SG",
    country: "Singapore",
    city: "Singapore",
    host: "sg3.xnot.network",
    port: 443,
    ping: 51,
    load: 41,
    favorite: false,
    premium: false,
  },
  {
    id: "us-sf-01",
    name: "San Francisco",
    countryCode: "US",
    country: "United States",
    city: "San Francisco",
    host: "us4.xnot.network",
    port: 443,
    ping: 132,
    load: 76,
    favorite: false,
    premium: true,
  },
  {
    id: "ch-zurich-01",
    name: "Zurich Vault",
    countryCode: "CH",
    country: "Switzerland",
    city: "Zurich",
    host: "ch1.xnot.network",
    port: 2053,
    ping: 33,
    load: 18,
    favorite: true,
    premium: false,
  },
  {
    id: "gb-london-01",
    name: "London Bridge",
    countryCode: "GB",
    country: "United Kingdom",
    city: "London",
    host: "gb2.xnot.network",
    port: 443,
    ping: 61,
    load: 64,
    favorite: false,
    premium: false,
  },
  {
    id: "br-saopaulo-01",
    name: "Sao Paulo",
    countryCode: "BR",
    country: "Brazil",
    city: "Sao Paulo",
    host: "br1.xnot.network",
    port: 8080,
    ping: 188,
    load: 27,
    favorite: false,
    premium: false,
  },
];

export interface ProtocolMeta {
  id: TunnelProtocol;
  name: string;
  tag: string;
  description: string;
  cipher: string;
}

export const PROTOCOLS: ProtocolMeta[] = [
  {
    id: "tls-tunnel",
    name: "TLS Tunnel",
    tag: "TLS 1.3",
    description: "HTTP CONNECT upgrade wrapped in a hardened TLS session.",
    cipher: "AES-256-GCM / TLS 1.3",
  },
  {
    id: "ssh",
    name: "SSH Direct",
    tag: "SSH2",
    description: "Encrypted SOCKS5 stream over a persistent SSH channel.",
    cipher: "ChaCha20-Poly1305",
  },
  {
    id: "v2ray-vmess",
    name: "V2Ray VMess",
    tag: "VMess",
    description: "Dynamic port requests with UUID authenticated framing.",
    cipher: "AES-128-GCM / VMess AEAD",
  },
  {
    id: "vless-reality",
    name: "VLESS Reality",
    tag: "Reality",
    description: "Steals a real TLS handshake from a trusted target host.",
    cipher: "XTLS-Vision / X25519",
  },
  {
    id: "trojan",
    name: "Trojan GFW",
    tag: "Trojan",
    description: "Blends into ordinary HTTPS traffic on port 443.",
    cipher: "TLS 1.3 / SHA-256",
  },
];

export const DNS_PRESETS: { id: DnsProvider; label: string; address: string }[] = [
  { id: "cloudflare", label: "Cloudflare DoH", address: "1.1.1.1" },
  { id: "google", label: "Google DNS", address: "8.8.8.8" },
  { id: "quad9", label: "Quad9 Secure", address: "9.9.9.9" },
  { id: "adguard", label: "AdGuard Home", address: "94.140.14.14" },
  { id: "custom", label: "Custom Resolver", address: "" },
];

export const SNI_PRESETS = [
  "cdn.cloudflare.net",
  "gateway.discord.gg",
  "www.zoom.us",
  "m.tiktok.com",
  "fast.com",
  "swcdn.apple.com",
];

export const PAYLOAD_MACROS = ["[host]", "[port]", "[crlf]", "[protocol]", "[ua]"];

export const DEFAULT_PAYLOAD =
  "CONNECT [host]:[port] HTTP/1.1[crlf]Host: [host][crlf]User-Agent: [ua][crlf]Connection: Keep-Alive[crlf][crlf]";

export const DEFAULT_HEADERS = [
  "X-Online-Host: [host]",
  "X-Forwarded-For: 1.1.1.1",
  "Accept: */*",
].join(String.fromCharCode(10));

export const DEFAULT_CONFIG: VpnConfig = {
  sniHost: "cdn.cloudflare.net",
  customPayload: DEFAULT_PAYLOAD,
  httpHeaders: DEFAULT_HEADERS,
  protocol: "tls-tunnel",
  dnsProvider: "cloudflare",
  customDns: "1.1.1.1",
  serverHost: "jp1.xnot.network",
  serverPort: 443,
  username: "xnot-operator",
  password: "",
  vmessUuid: "6f1c2e88-4d3a-4b71-9a55-77bd2f0c1e44",
  enableKillSwitch: true,
  enableUdpGw: true,
  mtuSize: 1420,
};

export const HANDSHAKE_STEPS: HandshakeStep[] = [
  { key: "hello", label: "ClientHello", detail: "SNI spoof set, cipher suites offered" },
  { key: "server", label: "ServerHello", detail: "TLS 1.3 negotiation accepted by peer" },
  { key: "cipher", label: "Cipher Negotiated", detail: "AES-256-GCM keys derived" },
  { key: "cert", label: "Certificate Validated", detail: "Chain pinned to target host" },
  { key: "tunnel", label: "Tunnel Established", detail: "Virtual interface receives route" },
];

export const INITIAL_LOGS: LogEntry[] = [
  {
    id: "boot-1",
    timestamp: "00:00:00",
    level: "INFO",
    message: "Xnot core v2.4.1 initialized",
    details: "engine=sing-box runtime=go build=prod",
  },
  {
    id: "boot-2",
    timestamp: "00:00:00",
    level: "DEBUG",
    message: "Loaded 7 server presets from local profile store",
  },
  {
    id: "boot-3",
    timestamp: "00:00:00",
    level: "INFO",
    message: "Kill switch armed, UDP gateway enabled",
  },
];

export interface PresetProfile {
  id: string;
  name: string;
  note: string;
  patch: Partial<VpnConfig>;
}

export const PRESET_PROFILES: PresetProfile[] = [
  {
    id: "gaming",
    name: "Gaming Low-Latency",
    note: "UDP relay on, 1280 MTU, minimal overhead",
    patch: {
      protocol: "tls-tunnel",
      dnsProvider: "cloudflare",
      customDns: "1.1.1.1",
      enableUdpGw: true,
      enableKillSwitch: true,
      mtuSize: 1280,
      sniHost: "fast.com",
    },
  },
  {
    id: "stealth",
    name: "Stealth SNI Bypass",
    note: "Spoofs a CDN host to defeat deep packet inspection",
    patch: {
      protocol: "tls-tunnel",
      sniHost: "cdn.cloudflare.net",
      dnsProvider: "quad9",
      customDns: "9.9.9.9",
      mtuSize: 1400,
      enableUdpGw: false,
    },
  },
  {
    id: "reality",
    name: "High-Security Reality",
    note: "VLESS Reality with pinned target handshake",
    patch: {
      protocol: "vless-reality",
      sniHost: "swcdn.apple.com",
      dnsProvider: "adguard",
      customDns: "94.140.14.14",
      enableUdpGw: true,
      enableKillSwitch: true,
      mtuSize: 1420,
    },
  },
];