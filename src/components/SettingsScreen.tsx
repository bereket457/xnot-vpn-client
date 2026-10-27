import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  ClipboardPaste,
  Copy,
  Cpu,
  FileDown,
  KeyRound,
  Layers,
  RotateCcw,
  Save,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { downloadText, useVpn } from "../context/VpnContext";
import { DNS_PRESETS, PAYLOAD_MACROS, PRESET_PROFILES, PROTOCOLS, SNI_PRESETS } from "../mockData";

const PANEL =
  "relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0a0e15]/70 backdrop-blur-sm";
const FIELD =
  "w-full rounded-md border border-white/[0.08] bg-[#05080e] px-2.5 py-2 font-mono text-[12px] text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20";
const LABEL = "mb-1.5 block font-mono text-[9.5px] tracking-[0.14em] text-slate-500";

function SectionTitle({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-slate-300">
        {icon}
        {title}
      </h2>
      {hint && <span className="font-mono text-[9.5px] text-slate-600">{hint}</span>}
    </div>
  );
}

export default function SettingsScreen() {
  const {
    config,
    updateConfig,
    applyPreset,
    resetConfig,
    serializeConfig,
    importConfig,
    pushLog,
  } = useVpn();
  const [raw, setRaw] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const bundle = useMemo(() => serializeConfig(), [serializeConfig]);
  const needsUuid = config.protocol === "v2ray-vmess" || config.protocol === "vless-reality";

  const insertMacro = (macro: string) => {
    updateConfig({ customPayload: `${config.customPayload}${macro}` });
  };

  const copyBundle = async () => {
    try {
      await navigator.clipboard.writeText(bundle);
      toast.success("Encrypted .xnot bundle copied");
    } catch {
      toast.error("Clipboard permission denied");
    }
  };

  const exportXnot = () => {
    downloadText(`xnot-profile-${Date.now()}.xnot`, bundle);
    pushLog("INFO", "Profile exported as .xnot bundle");
    toast.success("Exported .xnot profile");
  };

  const exportJson = () => {
    downloadText(
      `xnot-profile-${Date.now()}.json`,
      JSON.stringify({ app: "xnot-vpn", version: 2, config }, null, 2),
    );
    pushLog("INFO", "Profile exported as plain JSON");
    toast.success("Exported JSON profile");
  };

  const runImport = (text: string) => {
    const result = importConfig(text);
    if (result.ok) {
      toast.success(result.message);
      setRaw("");
    } else {
      toast.error(result.message);
    }
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => runImport(String(reader.result ?? ""));
    reader.onerror = () => toast.error("Could not read that file");
    reader.readAsText(file);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <section className={`${PANEL} p-4 xl:col-span-12`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold tracking-[0.16em] text-white">
              TUNNEL CONFIGURATION
            </h1>
            <p className="mt-1 font-mono text-[11px] text-slate-500">
              spoofing, routing and cipher parameters stored locally
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_PROFILES.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  applyPreset(preset.id);
                  toast.success(`Applied ${preset.name}`);
                }}
                className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
                title={preset.note}
              >
                <Zap className="size-3" strokeWidth={1.9} />
                {preset.name}
              </button>
            ))}
            <button
              onClick={() => {
                resetConfig();
                toast.success("Factory defaults restored");
              }}
              className="flex items-center gap-1.5 rounded-md border border-rose-400/25 bg-rose-400/[0.06] px-2.5 py-1.5 text-[11px] text-rose-300 transition-colors hover:border-rose-400/50"
            >
              <RotateCcw className="size-3" strokeWidth={1.9} />
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className={`${PANEL} p-4 xl:col-span-7`}>
        <SectionTitle
          icon={<ShieldCheck className="size-3.5 text-cyan-300" strokeWidth={1.8} />}
          title="SNI SPOOFING LAB"
          hint="TLS camouflage"
        />

        <label className={LABEL} htmlFor="sni">
          CUSTOM SNI HOST
        </label>
        <input
          id="sni"
          value={config.sniHost}
          onChange={(e) => updateConfig({ sniHost: e.target.value })}
          placeholder="cdn.cloudflare.net"
          className={FIELD}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SNI_PRESETS.map((sni) => (
            <button
              key={sni}
              onClick={() => updateConfig({ sniHost: sni })}
              className={`rounded border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                config.sniHost === sni
                  ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                  : "border-white/[0.07] text-slate-400 hover:text-slate-200"
              }`}
            >
              {sni}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className={LABEL} htmlFor="payload">
              HTTP CONNECT PAYLOAD
            </label>
            <div className="mb-1.5 flex gap-1">
              {PAYLOAD_MACROS.map((macro) => (
                <button
                  key={macro}
                  onClick={() => insertMacro(macro)}
                  className="rounded border border-white/[0.07] px-1.5 py-0.5 font-mono text-[9.5px] text-slate-500 transition-colors hover:border-fuchsia-400/40 hover:text-fuchsia-300"
                >
                  {macro}
                </button>
              ))}
            </div>
          </div>
          <textarea
            id="payload"
            value={config.customPayload}
            onChange={(e) => updateConfig({ customPayload: e.target.value })}
            rows={4}
            spellCheck={false}
            className={`${FIELD} resize-y leading-relaxed`}
          />
        </div>

        <div className="mt-4">
          <label className={LABEL} htmlFor="headers">
            CUSTOM HTTP HEADERS
          </label>
          <textarea
            id="headers"
            value={config.httpHeaders}
            onChange={(e) => updateConfig({ httpHeaders: e.target.value })}
            rows={3}
            spellCheck={false}
            className={`${FIELD} resize-y leading-relaxed`}
          />
        </div>
      </section>

      <section className={`${PANEL} p-4 xl:col-span-5`}>
        <SectionTitle
          icon={<Layers className="size-3.5 text-fuchsia-300" strokeWidth={1.8} />}
          title="TUNNELING PROTOCOL"
          hint={PROTOCOLS.find((p) => p.id === config.protocol)?.tag}
        />
        <div className="space-y-1.5">
          {PROTOCOLS.map((protocol) => {
            const active = config.protocol === protocol.id;
            return (
              <button
                key={protocol.id}
                onClick={() => updateConfig({ protocol: protocol.id })}
                className={`flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  active
                    ? "border-cyan-400/40 bg-cyan-400/[0.07]"
                    : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.14]"
                }`}
              >
                <span
                  className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${
                    active ? "border-cyan-300 bg-cyan-400/20 text-cyan-200" : "border-white/15 text-transparent"
                  }`}
                >
                  <Check className="size-2.5" strokeWidth={3.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`text-[12.5px] ${active ? "text-white" : "text-slate-300"}`}>
                      {protocol.name}
                    </span>
                    <span className="font-mono text-[9px] text-slate-600">{protocol.tag}</span>
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] leading-relaxed text-slate-500">
                    {protocol.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`${PANEL} p-4 xl:col-span-5`}>
        <SectionTitle
          icon={<KeyRound className="size-3.5 text-emerald-300" strokeWidth={1.8} />}
          title="SERVER CREDENTIALS"
          hint={config.protocol}
        />
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className={LABEL} htmlFor="host">
              HOST / IP
            </label>
            <input
              id="host"
              value={config.serverHost}
              onChange={(e) => updateConfig({ serverHost: e.target.value })}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="port">
              PORT
            </label>
            <input
              id="port"
              type="number"
              value={config.serverPort}
              onChange={(e) => updateConfig({ serverPort: Number(e.target.value) || 0 })}
              className={FIELD}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="user">
              USERNAME
            </label>
            <input
              id="user"
              value={config.username}
              onChange={(e) => updateConfig({ username: e.target.value })}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="pass">
              PASSWORD / KEY
            </label>
            <div className="relative">
              <input
                id="pass"
                type={showSecret ? "text" : "password"}
                value={config.password}
                onChange={(e) => updateConfig({ password: e.target.value })}
                placeholder="optional"
                className={FIELD}
              />
              <button
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-slate-500 hover:text-cyan-300"
              >
                {showSecret ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>
        </div>

        {needsUuid && (
          <div className="mt-3">
            <label className={LABEL} htmlFor="uuid">
              {config.protocol === "vless-reality" ? "REALITY PUBLIC KEY / UUID" : "VMESS UUID"}
            </label>
            <input
              id="uuid"
              value={config.vmessUuid}
              onChange={(e) => updateConfig({ vmessUuid: e.target.value })}
              className={FIELD}
            />
          </div>
        )}
      </section>

      <section className={`${PANEL} p-4 xl:col-span-4`}>
        <SectionTitle
          icon={<Cpu className="size-3.5 text-amber-300" strokeWidth={1.8} />}
          title="DNS & ROUTING"
        />
        <div className="flex flex-wrap gap-1.5">
          {DNS_PRESETS.map((dns) => {
            const active = config.dnsProvider === dns.id;
            return (
              <button
                key={dns.id}
                onClick={() =>
                  updateConfig({
                    dnsProvider: dns.id,
                    customDns: dns.address || config.customDns,
                  })
                }
                className={`rounded-md border px-2 py-1 text-left transition-colors ${
                  active
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                    : "border-white/[0.07] text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="block text-[11px]">{dns.label}</span>
                <span className="block font-mono text-[9px] text-slate-500">
                  {dns.address || "custom"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <label className={LABEL} htmlFor="custom-dns">
            RESOLVER ADDRESS
          </label>
          <input
            id="custom-dns"
            value={config.customDns}
            onChange={(e) => updateConfig({ customDns: e.target.value, dnsProvider: "custom" })}
            className={FIELD}
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className={LABEL} htmlFor="mtu">
              MTU SIZE
            </label>
            <span className="mb-1.5 font-mono text-[10px] text-slate-300">{config.mtuSize} B</span>
          </div>
          <input
            id="mtu"
            type="range"
            min={1280}
            max={1500}
            step={4}
            value={config.mtuSize}
            onChange={(e) => updateConfig({ mtuSize: Number(e.target.value) })}
            className="w-full accent-cyan-400"
          />
        </div>

        <div className="mt-3 space-y-1.5">
          {[
            { key: "enableUdpGw" as const, label: "UDP GATEWAY", on: config.enableUdpGw },
            { key: "enableKillSwitch" as const, label: "KILL SWITCH", on: config.enableKillSwitch },
          ].map((toggle) => (
            <button
              key={toggle.key}
              onClick={() => updateConfig({ [toggle.key]: !toggle.on })}
              className="flex w-full items-center justify-between rounded-md border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5"
            >
              <span className="font-mono text-[10px] tracking-[0.12em] text-slate-400">
                {toggle.label}
              </span>
              <span
                className={`relative h-4 w-8 rounded-full transition-colors ${
                  toggle.on ? "bg-emerald-400/70" : "bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-3 rounded-full bg-[#05080e] transition-all ${
                    toggle.on ? "left-[17px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className={`${PANEL} p-4 xl:col-span-8`}>
        <SectionTitle
          icon={<Save className="size-3.5 text-cyan-300" strokeWidth={1.8} />}
          title="IMPORT / EXPORT CENTER"
          hint=".xnot bundle and JSON"
        />
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="bundle">
              ENCODED .XNOT BUNDLE
            </label>
            <textarea
              id="bundle"
              readOnly
              value={bundle}
              rows={5}
              spellCheck={false}
              className={`${FIELD} resize-none break-all text-slate-400`}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                onClick={copyBundle}
                className="flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2.5 py-1.5 text-[11px] text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
              >
                <Copy className="size-3" strokeWidth={1.9} /> Copy
              </button>
              <button
                onClick={exportXnot}
                className="flex items-center gap-1.5 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1.5 text-[11px] text-cyan-200 transition-colors hover:border-cyan-400/60"
              >
                <FileDown className="size-3" strokeWidth={1.9} /> .xnot
              </button>
              <button
                onClick={exportJson}
                className="flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2.5 py-1.5 text-[11px] text-slate-300 transition-colors hover:border-emerald-400/40 hover:text-emerald-200"
              >
                <ArrowDownToLine className="size-3" strokeWidth={1.9} /> .json
              </button>
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="paste">
              PASTE PROFILE TO IMPORT
            </label>
            <textarea
              id="paste"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={5}
              spellCheck={false}
              placeholder="Paste a base64 .xnot bundle or raw JSON profile"
              className={`${FIELD} resize-none`}
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => runImport(raw)}
                className="flex items-center gap-1.5 rounded-md border border-emerald-400/35 bg-emerald-400/10 px-2.5 py-1.5 text-[11px] text-emerald-200 transition-colors hover:border-emerald-400/60"
              >
                <ClipboardPaste className="size-3" strokeWidth={1.9} /> Apply profile
              </button>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-white/[0.08] px-2.5 py-1.5 text-[11px] text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-cyan-200">
                <ArrowUpFromLine className="size-3" strokeWidth={1.9} /> Load file
                <input
                  type="file"
                  accept=".xnot,.json,application/json,text/plain"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}