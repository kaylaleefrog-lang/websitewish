import { useEffect, useState } from "react";
import { ImageOff, ExternalLink, AlertCircle, Check } from "lucide-react";
import heartsLogo from "../assets/images/hearts-logo.png";
import { Wishlist, WishlistItem, fmt, SaleBadge, ListIcon, polkaDotBg } from "./App";

const heartCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M3 2 L3 19 L7.5 15.2 L10.5 21.5 L13.2 20.2 L10.2 14 L16 14 Z' fill='%2342FAE1' stroke='white' stroke-width='1.3' stroke-linejoin='round'/%3E%3C/svg%3E") 3 2, auto`;

type PublicItem = WishlistItem & { claimed: boolean };
type PublicWishlist = Omit<Wishlist, "items"> & { items: PublicItem[] };

async function setClaimed(itemId: string, claimed: boolean): Promise<PublicItem> {
  const res = await fetch("/api/public-list", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, claimed }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Couldn't update that");
  return data.item;
}

export default function PublicListPage({ listId }: { listId: string }) {
  const [list, setList] = useState<PublicWishlist | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public-list?id=${encodeURIComponent(listId)}`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error || "Couldn't load this list");
        setList(data.list);
      })
      .catch(err => setError(err instanceof Error ? err.message : "Couldn't load this list"));
  }, [listId]);

  function toggleClaim(item: PublicItem) {
    const next = !item.claimed;
    setList(l => l && { ...l, items: l.items.map(i => i.id === item.id ? { ...i, claimed: next } : i) });
    setClaimed(item.id, next).catch(() => {
      // Revert on failure — the server didn't save it, so the UI shouldn't claim it did.
      setList(l => l && { ...l, items: l.items.map(i => i.id === item.id ? { ...i, claimed: !next } : i) });
    });
  }

  return (
    <div className="min-h-screen" style={{ background: "#FFFFFF", backgroundImage: polkaDotBg, cursor: heartCursor }}>
      <div className="flex items-center gap-2 px-6 py-5">
        <img src={heartsLogo} alt="" width={32} className="select-none" draggable={false} />
        <span className="text-xl font-semibold" style={{ fontFamily: "'Angelica', cursive", color: "#FF1493" }}>Wishly</span>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6" style={{ paddingTop: "15vh" }}>
          <AlertCircle size={28} color="#FF1493" />
          <p className="text-sm font-bold" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#7A5E8A" }}>{error}</p>
        </div>
      ) : !list ? (
        <div className="flex items-center justify-center" style={{ paddingTop: "20vh" }}>
          <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: "#FFD6F0", borderTopColor: "#FF1493" }} />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-6 pb-16">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-pink-500"><ListIcon value={list.icon} size={20} /></span>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Angelica', cursive", color: "#12002A" }}>{list.name}</h1>
          </div>
          <p className="text-sm mb-6" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#7A5E8A" }}>
            {list.items.length} item{list.items.length !== 1 ? "s" : ""} &middot; check off what you're getting them so no one doubles up
          </p>

          {list.items.length === 0 ? (
            <p className="text-sm" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#C0A0B0" }}>Nothing on this list yet.</p>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
              {list.items.map(item => (
                <div
                  key={item.id}
                  className="group relative block w-full min-w-0 rounded-2xl overflow-hidden transition-all duration-200"
                  style={{ background: "#fff", border: item.claimed ? "2.5px solid #42FAE1" : "2.5px solid transparent", boxShadow: "0 2px 10px rgba(255,20,147,0.08)", opacity: item.claimed ? 0.7 : 1 }}
                >
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="relative aspect-square bg-pink-50 overflow-hidden flex items-center justify-center">
                      {item.selectedImage ? (
                        <img src={item.selectedImage} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <ImageOff size={28} color="#FFB6D9" />
                      )}
                      {item.onSale && (
                        <div className="absolute top-2 left-2"><SaleBadge pct={item.salePercent!} /></div>
                      )}
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all" style={{ background: "rgba(255,255,255,0.85)" }}>
                        <ExternalLink size={12} color="#FF1493" />
                      </div>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); toggleClaim(item); }}
                        title={item.claimed ? "Getting this — click to undo" : "Mark that you're getting this"}
                        className="absolute bottom-2 left-2 w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-sm transition-all"
                        style={{ background: item.claimed ? "#42FAE1" : "rgba(255,255,255,0.85)" }}
                      >
                        <Check size={12} color={item.claimed ? "#006B5E" : "#7A5E8A"} />
                      </button>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold leading-snug line-clamp-2 mb-1" style={{ fontFamily: "'Angelica', cursive", color: "#12002A", minHeight: "2.75em" }}>{item.title}</p>
                      <div className="flex items-center gap-1.5" style={{ minHeight: "1.375em" }}>
                        {item.price !== null && <span className="text-xs font-bold" style={{ fontFamily: "'DM Mono', monospace", color: "#FF1493" }}>{fmt(item.price)}</span>}
                        {item.onSale && item.originalPrice && item.originalPrice !== item.price && (
                          <span className="text-xs line-through" style={{ fontFamily: "'DM Mono', monospace", color: "#C0A0B0" }}>{fmt(item.originalPrice)}</span>
                        )}
                      </div>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
