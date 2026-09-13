"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AdminLoginForm({
  secretSlug,
  initialKey,
}: {
  secretSlug: string;
  initialKey?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessKey = initialKey || searchParams.get("key") || "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const res = await fetch(`/api/admin/auth/login?key=${encodeURIComponent(accessKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          pin,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Giriş başarısız.");
        return;
      }

      // Success: refresh to load the studio dashboard
      router.push(`/${secretSlug}`);
      router.refresh();
    } catch {
      setError("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto my-12 w-full max-w-md border-[2px] border-ink bg-surface shadow-xl">
      {/* Terminal Bar */}
      <div className="flex items-center justify-between border-b-[1.5px] border-ink bg-canvas px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <span className="h-3 w-3 rounded-full bg-accent/80" />
          <span className="ml-2 font-display text-xs tracking-wider sm:text-sm">
            TERMINAL_AUTH // STEALTH
          </span>
        </div>
        <span className="font-ui text-[10px] font-bold text-accent uppercase tracking-widest">
          SECURE
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
        <div className="border-l-2 border-accent pl-3 py-1 bg-canvas/40">
          <p className="font-ui text-xs font-bold text-ink">
            Yetkili Yönetici Doğrulaması
          </p>
          <p className="font-ui text-[11px] text-ink/60">
            Kullanıcı adı, şifre ve ikinci güvenlik PIN kodunuzu giriniz.
          </p>
        </div>

        {error && (
          <div className="border border-red-500/60 bg-red-500/10 p-3 font-ui text-xs font-bold text-red-600 dark:text-red-400">
            ✕ {error}
          </div>
        )}

        <div>
          <label className="mb-1 block font-ui text-[11px] font-bold uppercase tracking-wider text-ink/70">
            Kullanıcı Adı
          </label>
          <input
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-ink bg-canvas px-3 py-2 font-ui text-sm text-ink outline-none focus:border-accent"
            placeholder="admin"
          />
        </div>

        <div>
          <label className="mb-1 block font-ui text-[11px] font-bold uppercase tracking-wider text-ink/70">
            Şifre
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-ink bg-canvas px-3 py-2 font-ui text-sm text-ink outline-none focus:border-accent"
            placeholder="••••••••••••"
          />
        </div>

        <div>
          <label className="mb-1 block font-ui text-[11px] font-bold uppercase tracking-wider text-ink/70">
            İkinci Faktör Güvenlik PIN Kodu
          </label>
          <input
            type="password"
            required
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full border border-ink bg-canvas px-3 py-2 font-ui text-sm text-ink outline-none focus:border-accent tracking-widest"
            placeholder="••••"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-2 inline-flex items-center justify-center border-[1.5px] border-ink bg-ink py-2.5 font-ui text-xs font-bold uppercase tracking-wider text-surface transition-colors hover:bg-accent hover:text-accent-ink disabled:opacity-50"
        >
          {busy ? "Doğrulanıyor..." : "Oturum Aç →"}
        </button>

        <p className="text-center font-ui text-[10px] text-ink/40 uppercase tracking-wider">
          5 hatalı denemede IP geçici olarak engellenir
        </p>
      </form>
    </div>
  );
}

