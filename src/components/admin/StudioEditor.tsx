"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isValidSlug, slugify } from "@/lib/slug";
import type { PostLang } from "@/lib/blog";
import { MdxCheatsheetModal } from "./MdxCheatsheetModal";

export type StudioPost = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  lang: PostLang;
  draft: boolean;
  content: string;
  translationKey?: string;
};

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function calculateReadingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/**
 * Lightweight client-side Markdown preview parser that faithfully renders
 * standard blog post markdown/MDX elements within the exact site typography.
 */
function renderMarkdownPreview(md: string): string {
  if (!md) return "<p class='text-ink/40 italic'>Yazı içeriği burada canlı önizlenecektir...</p>";

  // Escape HTML tags to prevent XSS during preview
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks: ```lang ... ```
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<div class="my-5 border border-ink/20 bg-surface"><div class="border-b border-ink/15 px-3 py-1 font-ui text-[10px] font-bold uppercase text-accent tracking-wider bg-canvas/40">${lang || "code"}</div><pre class="p-3 overflow-x-auto font-terminal text-xs text-ink leading-relaxed"><code>${code.trim()}</code></pre></div>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, "<code class='bg-ink/10 px-1.5 py-0.5 font-terminal text-xs text-accent font-bold'>$1</code>");

  // Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "<figure class='my-6'><img src='$2' alt='$1' class='w-full border border-ink/15 object-cover max-h-[400px]' /><figcaption class='mt-2 text-center font-ui text-xs text-ink/60 italic'>$1</figcaption></figure>");

  // Videos: <video src="..." ... /> or <video ...></video>
  html = html.replace(
    /&lt;video[\s\S]*?src=["']([^"']+)["'][\s\S]*?(&gt;&lt;\/video&gt;|\/&gt;)/gi,
    (_m, src) => {
      return `<div class="my-6 border border-ink/15 bg-black/5 overflow-hidden"><video src="${src}" autoplay loop muted playsinline class="w-full object-cover max-h-[450px]"></video></div>`;
    }
  );

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2' target='_blank' rel='noopener noreferrer' class='underline decoration-accent decoration-2 underline-offset-4 hover:text-accent'>$1</a>");

  // Headings
  html = html.replace(/^### (.*$)/gim, "<h3 class='font-ui uppercase font-bold text-base mt-6 mb-2 text-ink'>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2 class='font-ui uppercase tracking-wider font-bold text-lg mt-8 mb-3 text-ink border-b border-ink/10 pb-1'>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1 class='font-ui font-bold text-2xl sm:text-3xl mt-8 mb-4 text-ink tracking-tight'>$1</h1>");

  // Blockquotes: > quote
  html = html.replace(/^\> (.*$)/gim, "<blockquote class='border-l-4 border-accent pl-4 py-1 my-4 bg-canvas/40 italic font-ui text-sm text-ink/80'>$1</blockquote>");

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong class='font-bold text-ink'>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em class='italic'>$1</em>");

  // Horizontal Rule
  html = html.replace(/^---$/gim, "<hr class='my-6 border-ink/20' />");

  // Unordered list items: - item
  html = html.replace(/^\- (.*$)/gim, "<li class='ml-6 list-disc text-ink/80 mb-1'>$1</li>");

  // Paragraphs
  const lines = html.split("\n\n");
  const parsed = lines
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<div") ||
        trimmed.startsWith("<figure") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("<li")
      ) {
        return trimmed;
      }
      return `<p class='mb-4 leading-relaxed text-ink/85'>${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .join("");

  return parsed;
}

export function StudioEditor({
  mode,
  baseStudioPath,
  initialPost,
}: {
  mode: "new" | "edit";
  baseStudioPath: string;
  initialPost?: StudioPost;
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [slug, setSlug] = useState(initialPost?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [summary, setSummary] = useState(initialPost?.summary ?? "");
  const [date, setDate] = useState(initialPost?.date ?? today());
  const [tags, setTags] = useState((initialPost?.tags ?? []).join(", "));
  const [lang, setLang] = useState<PostLang>(initialPost?.lang ?? "tr");
  const [draft, setDraft] = useState(initialPost?.draft ?? true);
  const [content, setContent] = useState(initialPost?.content ?? "");
  const [translationKey, setTranslationKey] = useState(initialPost?.translationKey ?? "");

  const [viewMode, setViewMode] = useState<"split" | "editor" | "preview">("split");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slugTouched) {
      setSlug(slugify(val));
    }
  }

  function insertTextAtCursor(text: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + "\n" + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const before = current.substring(0, start);
    const after = current.substring(end);
    const updated = before + text + after;
    setContent(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Görsel yüklenemedi.");
        return;
      }

      insertTextAtCursor(`\n![${file.name.replace(/\.[^/.]+$/, "")}](${data.url})\n`);
      setNotice("Görsel başarıyla yüklendi ve editöre eklendi.");
      setTimeout(() => setNotice(null), 3000);
    } catch {
      setError("Görsel yükleme sırasında bağlantı hatası oluştu.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        handleImageUpload(file);
      } else {
        setError("Yalnızca görsel dosyaları sürüklenebilir.");
      }
    }
  }

  async function handleSave(asDraft: boolean): Promise<boolean> {
    setError(null);
    setNotice(null);

    if (!isValidSlug(slug)) {
      setError("Slug geçersiz — yalnızca küçük harf, rakam ve tire içermelidir.");
      return false;
    }

    if (!title.trim()) {
      setError("Yazı başlığı boş olamaz.");
      return false;
    }

    if (!content.trim()) {
      setError("İçerik boş olamaz.");
      return false;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          summary,
          date,
          lang,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          draft: asDraft,
          content,
          translationKey: translationKey.trim() || undefined,
          overwrite: mode === "edit",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Kaydedilemedi (HTTP ${res.status}).`);
        return false;
      }

      setDraft(asDraft);
      setNotice(asDraft ? "Taslak olarak kaydedildi." : "Yazı başarıyla yayınlandı!");
      setTimeout(() => setNotice(null), 4000);
      router.refresh();
      return true;
    } catch {
      setError("Bağlantı hatası — kaydedilemedi.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!initialPost?.slug) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/posts/${initialPost.slug}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push(baseStudioPath);
      } else {
        setError("Yazı silinemedi.");
      }
    } catch {
      setError("Silme işlemi sırasında ağ hatası oluştu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-3 py-6 sm:px-6">
      <MdxCheatsheetModal
        isOpen={cheatsheetOpen}
        onClose={() => setCheatsheetOpen(false)}
        onInsert={(code) => insertTextAtCursor("\n" + code + "\n")}
      />

      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-ink pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={baseStudioPath}
            className="border border-ink/30 px-3 py-1.5 font-ui text-xs font-bold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-surface"
          >
            ← Studio Paneli
          </Link>
          <span className="font-ui text-xs text-ink/40">/</span>
          <h1 className="font-ui text-sm sm:text-base font-bold uppercase tracking-wider text-ink">
            {mode === "new" ? "Yeni Yazı" : `Düzenle: ${initialPost?.slug}`}
          </h1>
          <span
            className={`border px-2 py-0.5 font-ui text-[10px] font-bold uppercase tracking-wider ${
              draft
                ? "border-ink/30 bg-surface text-ink/60"
                : "border-accent bg-accent/10 text-accent"
            }`}
          >
            {draft ? "TASLAK" : "YAYINDA"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View switcher */}
          <div className="hidden sm:flex border border-ink/25 bg-canvas/50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 font-ui text-[11px] font-bold uppercase ${
                viewMode === "split" ? "bg-ink text-surface" : "text-ink/60 hover:text-ink"
              }`}
            >
              Çift Panel
            </button>
            <button
              type="button"
              onClick={() => setViewMode("editor")}
              className={`px-2.5 py-1 font-ui text-[11px] font-bold uppercase ${
                viewMode === "editor" ? "bg-ink text-surface" : "text-ink/60 hover:text-ink"
              }`}
            >
              Editör
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`px-2.5 py-1 font-ui text-[11px] font-bold uppercase ${
                viewMode === "preview" ? "bg-ink text-surface" : "text-ink/60 hover:text-ink"
              }`}
            >
              Önizleme
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCheatsheetOpen(true)}
            className="border-[1.5px] border-accent bg-accent/10 px-3 py-1.5 font-ui text-xs font-bold uppercase tracking-wider text-accent transition-colors hover:bg-accent hover:text-accent-ink"
          >
            ? CheatSheet
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={busy}
            className="border-[1.5px] border-ink bg-surface px-3 py-1.5 font-ui text-xs font-bold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-surface disabled:opacity-40"
          >
            {busy ? "..." : "Taslak Kaydet"}
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={busy}
            className="border-[1.5px] border-ink bg-ink px-4 py-1.5 font-ui text-xs font-bold uppercase tracking-wider text-surface transition-colors hover:bg-accent hover:text-accent-ink disabled:opacity-40"
          >
            {busy ? "..." : "Yayınla"}
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="border border-red-500/50 bg-red-500/10 p-3 font-ui text-xs font-bold text-red-600 dark:text-red-400">
          ✕ {error}
        </div>
      )}
      {notice && (
        <div className="border border-accent bg-accent/10 p-3 font-ui text-xs font-bold text-accent">
          ✓ {notice}
        </div>
      )}

      {/* Frontmatter Grid Form */}
      <div className="grid gap-4 border-[1.5px] border-ink bg-surface p-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="mb-1 block font-ui text-[11px] font-bold uppercase tracking-wider text-ink/60">
            Yazı Başlığı *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Örn: Rust ile Dağıtık Sistemler"
            className="w-full border border-ink bg-canvas px-3 py-2 font-ui text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block font-ui text-[11px] font-bold uppercase tracking-wider text-ink/60">
            URL Slug * (küçük harf, tire)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="rust-ile-dagitik-sistemler"
            className="w-full border border-ink bg-canvas px-3 py-2 font-ui text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div className="sm:col-span-3">
          <label className="mb-1 block font-ui text-[11px] font-bold uppercase tracking-wider text-ink/60">
            Özet / Summary (SEO & Feed için kısa açıklama)
          </label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Bu yazıda P2P mimarisinde QUIC protokolünün avantajlarını inceliyoruz."
            className="w-full border border-ink bg-canvas px-3 py-2 font-ui text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block font-ui text-[11px] font-bold uppercase tracking-wider text-ink/60">
            Yayın Tarihi
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-ink bg-canvas px-3 py-2 font-ui text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block font-ui text-[11px] font-bold uppercase tracking-wider text-ink/60">
            Dil
          </label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as PostLang)}
            className="w-full border border-ink bg-canvas px-3 py-2 font-ui text-sm text-ink outline-none focus:border-accent"
          >
            <option value="tr">Türkçe (tr)</option>
            <option value="en">English (en)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block font-ui text-[11px] font-bold uppercase tracking-wider text-ink/60">
            Etiketler (Virgülle ayırın)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Rust, P2P, Networks"
            className="w-full border border-ink bg-canvas px-3 py-2 font-ui text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div className="sm:col-span-3">
          <label className="mb-1 block font-ui text-[11px] font-bold uppercase tracking-wider text-ink/60">
            Ortak Çeviri Anahtarı / Translation Key (Opsiyonel)
          </label>
          <input
            type="text"
            value={translationKey}
            onChange={(e) => setTranslationKey(e.target.value)}
            placeholder="Örn: admin-security (Aynı yazının TR ve EN versiyonunu eşleştirmek için ikisine de aynı anahtarı yazın)"
            className="w-full border border-ink bg-canvas px-3 py-2 font-ui text-sm text-ink outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Editor & Preview Split Panel */}
      <div
        className={`grid gap-6 ${
          viewMode === "split"
            ? "lg:grid-cols-2"
            : viewMode === "editor"
            ? "grid-cols-1"
            : "grid-cols-1"
        }`}
      >
        {/* LEFT: Markdown Editor with Upload & Toolbar */}
        {(viewMode === "split" || viewMode === "editor") && (
          <div className="flex flex-col border-[1.5px] border-ink bg-surface">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between border-b border-ink/15 bg-canvas/40 p-2 gap-2">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  title="Kalın"
                  onClick={() => insertTextAtCursor("**kalın metin**")}
                  className="border border-ink/20 px-2 py-1 font-ui text-xs font-bold hover:bg-ink hover:text-surface"
                >
                  B
                </button>
                <button
                  type="button"
                  title="İtalik"
                  onClick={() => insertTextAtCursor("*italik metin*")}
                  className="border border-ink/20 px-2 py-1 font-ui text-xs italic hover:bg-ink hover:text-surface"
                >
                  I
                </button>
                <button
                  type="button"
                  title="H2 Başlık"
                  onClick={() => insertTextAtCursor("\n## BÖLÜM BAŞLIĞI\n")}
                  className="border border-ink/20 px-2 py-1 font-ui text-xs font-bold hover:bg-ink hover:text-surface"
                >
                  H2
                </button>
                <button
                  type="button"
                  title="H3 Başlık"
                  onClick={() => insertTextAtCursor("\n### Alt Başlık\n")}
                  className="border border-ink/20 px-2 py-1 font-ui text-xs font-bold hover:bg-ink hover:text-surface"
                >
                  H3
                </button>
                <button
                  type="button"
                  title="Alıntı"
                  onClick={() => insertTextAtCursor("\n> Alıntı metni buraya\n")}
                  className="border border-ink/20 px-2 py-1 font-ui text-xs hover:bg-ink hover:text-surface"
                >
                  &ldquo;&rdquo;
                </button>
                <button
                  type="button"
                  title="Kod Bloğu"
                  onClick={() => insertTextAtCursor("\n```ts\n// Kod buraya\n```\n")}
                  className="border border-ink/20 px-2 py-1 font-terminal text-xs hover:bg-ink hover:text-surface"
                >
                  &lt;/&gt;
                </button>
                <button
                  type="button"
                  title="Link"
                  onClick={() => insertTextAtCursor("[Bağlantı Metni](https://)")}
                  className="border border-ink/20 px-2 py-1 font-ui text-xs hover:bg-ink hover:text-surface"
                >
                  🔗
                </button>
              </div>

              {/* Upload button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="border border-ink bg-canvas px-2.5 py-1 font-ui text-xs font-bold uppercase transition-colors hover:bg-accent hover:text-accent-ink disabled:opacity-50"
                >
                  {uploading ? "Yükleniyor..." : "↑ Görsel Yükle"}
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onDrop={handleDrop}
                placeholder="Yazınızı buraya Markdown/MDX olarak yazın. Görselleri doğrudan bu kutunun içine sürükleyip bırakabilirsiniz..."
                rows={22}
                className="w-full resize-y bg-canvas p-4 font-terminal text-sm leading-relaxed text-ink outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="border-t border-ink/10 bg-canvas/30 px-3 py-1.5 text-right font-ui text-[11px] text-ink/50">
              Sürükle-Bırak ile görsel yükleyebilirsiniz · {content.length} karakter
            </div>
          </div>
        )}

        {/* RIGHT: Live Preview in True Blog Typography */}
        {(viewMode === "split" || viewMode === "preview") && (
          <div className="flex flex-col border-[1.5px] border-ink bg-surface">
            <div className="border-b border-ink/15 bg-canvas/40 px-4 py-2">
              <p className="font-ui text-xs font-bold uppercase tracking-wider text-accent">
                ● Canlı Önizleme (Gerçek Tema & Tipografi)
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Mock post header */}
              <div className="border-b-[1.5px] border-ink pb-6 mb-6">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
                    {date}
                  </span>
                  <span className="text-ink/20">/</span>
                  <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
                    {calculateReadingTime(content)}
                  </span>
                  <span className="text-ink/20">/</span>
                  <span className="rounded-full border border-accent px-2 py-0.5 font-ui text-[10px] font-bold uppercase tracking-wider text-accent">
                    {lang.toUpperCase()}
                  </span>
                  {draft && (
                    <span className="border border-ink/30 px-2 py-0.5 font-ui text-[10px] uppercase tracking-wider text-ink/50">
                      Taslak
                    </span>
                  )}
                </div>
                <h1 className="font-ui text-2xl font-bold tracking-tight text-ink sm:text-4xl leading-tight">
                  {title || <span className="text-ink/30 italic font-normal">Başlıksız Yazı</span>}
                </h1>
                {summary && (
                  <p className="mt-3 font-ui text-xs leading-relaxed text-ink/70">
                    {summary}
                  </p>
                )}
                {tags && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-ink/15 px-2.5 py-0.5 font-ui text-[10px] uppercase tracking-wider text-ink/50"
                        >
                          {t}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Rendered post article */}
              <article
                className="prose-post"
                dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(content) }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation in Edit Mode */}
      {mode === "edit" && (
        <div className="mt-8 flex flex-wrap items-center justify-between border-t border-ink/15 pt-6">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="font-ui text-xs font-bold uppercase tracking-wider text-red-600 hover:underline dark:text-red-400"
            >
              Bu yazıyı sil...
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="font-ui text-xs font-bold text-red-600 dark:text-red-400">
                Emin misiniz? Yazı kalıcı olarak silinecek.
              </span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="border border-red-600 bg-red-600 px-3 py-1 font-ui text-xs font-bold uppercase text-white hover:bg-red-700 disabled:opacity-40"
              >
                Evet, Sil
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="border border-ink/30 px-3 py-1 font-ui text-xs font-bold uppercase hover:bg-ink hover:text-surface"
              >
                Vazgeç
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

