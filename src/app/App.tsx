import { useState } from "react";
import {
  Plus, X, Share2, Bell, Heart, ExternalLink, Tag, Check,
  Copy, Trash2, Edit3, AlertCircle, Sparkles,
  Gift, Home, Star, Shirt, BookOpen, Leaf, Palette, ShoppingBag, Search
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WishlistItem {
  id: string;
  url: string;
  title: string;
  description: string;
  selectedImage: string;
  availableImages: string[];
  price: number | null;
  originalPrice: number | null;
  onSale: boolean;
  salePercent: number | null;
  store: string;
  addedAt: Date;
  notifyOnSale: boolean;
}

interface Wishlist {
  id: string;
  name: string;
  icon: string;
  items: WishlistItem[];
  createdAt: Date;
}

interface Notification {
  id: string;
  itemTitle: string;
  listName: string;
  oldPrice: number;
  newPrice: number;
  salePercent: number;
  timestamp: Date;
  read: boolean;
}

// ─── Mock scraper ──────────────────────────────────────────────────────────────
function simulateScrape(url: string): Omit<WishlistItem, "id" | "addedAt" | "notifyOnSale" | "selectedImage"> {
  const domain = (() => { try { return new URL(url).hostname.replace("www.", ""); } catch { return "shop.example.com"; } })();
  const mocks: Record<string, Omit<WishlistItem, "id" | "addedAt" | "notifyOnSale" | "selectedImage">> = {
    "amazon.com": { url, title: "Artisan Leather Tote Bag — Saddle Brown", description: "Full-grain vegetable-tanned leather, hand-stitched gusset, brass hardware.", availableImages: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1575844611132-ab49e4218ead?w=600&h=600&fit=crop&auto=format"], price: 189.99, originalPrice: 189.99, onSale: false, salePercent: null, store: "Amazon" },
    "etsy.com": { url, title: "Hand-thrown Ceramic Mug — Speckled Sage", description: "Wheel-thrown stoneware, food-safe glaze, 12 oz. Made in Portland, OR.", availableImages: ["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1571019613914-85f342c6a11e?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&auto=format"], price: 34.00, originalPrice: 34.00, onSale: false, salePercent: null, store: "Etsy" },
    "nordstrom.com": { url, title: "Merino Wool Crewneck Sweater — Oatmeal", description: "100% extra-fine merino, relaxed fit, dropped shoulders.", availableImages: ["https://images.unsplash.com/photo-1516826957135-700dedea698c?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=600&h=600&fit=crop&auto=format"], price: 78.00, originalPrice: 130.00, onSale: true, salePercent: 40, store: "Nordstrom" },
    "urbanoutfitters.com": { url, title: "Linen Throw Pillow Cover — Natural", description: "Stonewashed 100% European linen, invisible zipper, 18x18.", availableImages: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1540638349517-3abd5afc5847?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1567016432779-094069958ea5?w=600&h=600&fit=crop&auto=format"], price: 29.00, originalPrice: 29.00, onSale: false, salePercent: null, store: "Urban Outfitters" },
  };
  if (mocks[domain]) return mocks[domain];
  const price = Math.round((Math.random() * 200 + 20) * 100) / 100;
  const onSale = Math.random() > 0.6;
  const salePercent = onSale ? Math.round(Math.random() * 40 + 10) : null;
  return { url, title: `Product from ${domain}`, description: "A gorgeous find! Choose a photo below to personalize how it looks in your list.", availableImages: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=600&fit=crop&auto=format"], price: onSale ? Math.round(price * (1 - (salePercent! / 100)) * 100) / 100 : price, originalPrice: price, onSale, salePercent, store: domain };
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const LIST_ICONS: { value: string; Icon: React.ElementType }[] = [
  { value: "gift", Icon: Gift }, { value: "home", Icon: Home }, { value: "star", Icon: Star },
  { value: "shirt", Icon: Shirt }, { value: "book", Icon: BookOpen }, { value: "leaf", Icon: Leaf },
  { value: "palette", Icon: Palette }, { value: "bag", Icon: ShoppingBag },
];
function ListIcon({ value, size = 16 }: { value: string; size?: number }) {
  const found = LIST_ICONS.find(i => i.value === value);
  if (!found) return <Star size={size} />;
  return <found.Icon size={size} />;
}

const SEED_LISTS: Wishlist[] = [
  { id: "wl-1", name: "Holiday Gifts", icon: "gift", createdAt: new Date("2024-11-01"), items: [
    { id: "item-1", url: "https://www.nordstrom.com/s/sweater", title: "Merino Wool Crewneck Sweater — Oatmeal", description: "100% extra-fine merino, relaxed fit, dropped shoulders.", selectedImage: "https://images.unsplash.com/photo-1516826957135-700dedea698c?w=600&h=600&fit=crop&auto=format", availableImages: ["https://images.unsplash.com/photo-1516826957135-700dedea698c?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=600&fit=crop&auto=format"], price: 78.00, originalPrice: 130.00, onSale: true, salePercent: 40, store: "Nordstrom", addedAt: new Date("2024-11-10"), notifyOnSale: true },
    { id: "item-2", url: "https://www.etsy.com/listing/mug", title: "Hand-thrown Ceramic Mug — Speckled Sage", description: "Wheel-thrown stoneware, food-safe glaze, 12 oz.", selectedImage: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&h=600&fit=crop&auto=format", availableImages: ["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1571019613914-85f342c6a11e?w=600&h=600&fit=crop&auto=format"], price: 34.00, originalPrice: 34.00, onSale: false, salePercent: null, store: "Etsy", addedAt: new Date("2024-11-12"), notifyOnSale: true },
    { id: "item-3", url: "https://www.amazon.com/tote", title: "Artisan Leather Tote Bag — Saddle Brown", description: "Full-grain vegetable-tanned leather, brass hardware.", selectedImage: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=600&fit=crop&auto=format", availableImages: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop&auto=format"], price: 189.99, originalPrice: 189.99, onSale: false, salePercent: null, store: "Amazon", addedAt: new Date("2024-11-13"), notifyOnSale: false },
  ]},
  { id: "wl-2", name: "For My Apartment", icon: "home", createdAt: new Date("2024-10-15"), items: [
    { id: "item-4", url: "https://www.urbanoutfitters.com/pillow", title: "Linen Throw Pillow Cover — Natural", description: "Stonewashed 100% European linen, invisible zipper.", selectedImage: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop&auto=format", availableImages: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop&auto=format","https://images.unsplash.com/photo-1540638349517-3abd5afc5847?w=600&h=600&fit=crop&auto=format"], price: 29.00, originalPrice: 29.00, onSale: false, salePercent: null, store: "Urban Outfitters", addedAt: new Date("2024-10-20"), notifyOnSale: false },
  ]},
];
const SEED_NOTIFICATIONS: Notification[] = [
  { id: "notif-1", itemTitle: "Merino Wool Crewneck Sweater — Oatmeal", listName: "Holiday Gifts", oldPrice: 130.00, newPrice: 78.00, salePercent: 40, timestamp: new Date("2024-11-14T09:22:00"), read: false },
];

function uid() { return Math.random().toString(36).slice(2, 10); }
function fmt(n: number) { return "$" + n.toFixed(2); }

// ─── Polka dot background ─────────────────────────────────────────────────────
const polkaDotBg = `url("data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='24' cy='24' r='5.5' fill='%2342FAE1' fill-opacity='0.35'/%3E%3C/svg%3E")`;

// ─── Subcomponents ────────────────────────────────────────────────────────────
function SaleBadge({ pct }: { pct: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#42FAE1", color: "#006B5E", fontFamily: "'DM Mono', monospace" }}>
      <Tag size={9} />-{pct}%
    </span>
  );
}

function ItemCard({ item, onDelete, onChangePhoto, onClick, isSelected }: {
  item: WishlistItem; onDelete: () => void; onChangePhoto: (img: string) => void;
  onClick: () => void; isSelected: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left w-full transition-all duration-200"
      style={{ outline: "none" }}
    >
      <div
        className="rounded-2xl overflow-hidden transition-all duration-200"
        style={{
          background: "#fff",
          border: isSelected ? "2.5px solid #FF1493" : "2.5px solid transparent",
          boxShadow: isSelected ? "0 0 0 4px #FF149322" : "0 2px 10px rgba(255,20,147,0.08)",
        }}
      >
        <div className="relative aspect-square bg-pink-50 overflow-hidden">
          <img src={item.selectedImage} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          {item.onSale && (
            <div className="absolute top-2 left-2"><SaleBadge pct={item.salePercent!} /></div>
          )}
        </div>
        <div className="p-2.5">
          <p className="text-xs font-bold leading-snug line-clamp-2 mb-1" style={{ fontFamily: "'Crazy Curlz', cursive", color: "#12002A" }}>{item.title}</p>
          <div className="flex items-center gap-1.5">
            {item.price !== null && <span className="text-xs font-bold" style={{ fontFamily: "'DM Mono', monospace", color: "#FF1493" }}>{fmt(item.price)}</span>}
            {item.onSale && item.originalPrice && item.originalPrice !== item.price && (
              <span className="text-xs line-through" style={{ fontFamily: "'DM Mono', monospace", color: "#C0A0B0" }}>{fmt(item.originalPrice)}</span>
            )}
          </div>
        </div>
      </div>
      {/* hover actions */}
      <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "#FF1493", color: "#fff" }}
        >
          <X size={11} />
        </button>
      </div>
    </button>
  );
}

function PhotoPickerModal({ images, selected, onSelect, onClose }: {
  images: string[]; selected: string; onSelect: (img: string) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative rounded-3xl border-2 p-6 max-w-xs w-full shadow-2xl" style={{ background: "#fff", borderColor: "#FF1493" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold" style={{ fontFamily: "'Crazy Curlz', cursive", color: "#FF1493" }}>Pick a photo</h4>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#FFE8F5" }}><X size={14} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {images.map((img, i) => (
            <button key={i} onClick={() => { onSelect(img); onClose(); }} className="relative aspect-square rounded-2xl overflow-hidden transition-all"
              style={{ border: img === selected ? "2.5px solid #FF1493" : "2.5px solid #FFD6F0" }}>
              <img src={img} alt={`Option ${i + 1}`} className="w-full h-full object-cover" />
              {img === selected && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(255,20,147,0.2)" }}>
                  <div className="rounded-full p-1" style={{ background: "#FF1493" }}><Check size={14} color="#fff" /></div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddItemModal({ onClose, onAdd }: { onClose: () => void; onAdd: (item: WishlistItem) => void }) {
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<"url" | "pick">("url");
  const [loading, setLoading] = useState(false);
  const [scraped, setScraped] = useState<Omit<WishlistItem, "id" | "addedAt" | "notifyOnSale" | "selectedImage"> | null>(null);
  const [selectedImg, setSelectedImg] = useState<string>("");
  const [notifyOnSale, setNotifyOnSale] = useState(true);

  function handleFetch() {
    if (!url.trim()) return;
    setLoading(true);
    setTimeout(() => { const data = simulateScrape(url.trim()); setScraped(data); setSelectedImg(data.availableImages[0]); setStep("pick"); setLoading(false); }, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" style={{ background: "#fff", border: "2.5px solid #FFD6F0" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ background: "linear-gradient(135deg, #FFE8F5 0%, #E8FDF9 100%)" }}>
          <div>
            <h2 className="text-xl font-semibold" style={{ fontFamily: "'Crazy Curlz', cursive", color: "#FF1493" }}>Add to wishlist</h2>
            <p className="text-xs mt-0.5" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#7A5E8A" }}>
              {step === "url" ? "Paste a product link to get started" : "Now pick your fave photo!"}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#FFD6F0" }}><X size={15} color="#FF1493" /></button>
        </div>

        <div className="p-6">
          {step === "url" ? (
            <div className="space-y-4">
              <input
                type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleFetch()}
                placeholder="https://www.example.com/product/..."
                className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#FDF5FF", border: "2px solid #FFD6F0", fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#12002A" }}
                autoFocus
              />
              <p className="text-xs" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#C0A0B0" }}>
                Try: amazon.com, etsy.com, nordstrom.com, urbanoutfitters.com
              </p>
              <button
                onClick={handleFetch} disabled={!url.trim() || loading}
                className="w-full rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #FF1493, #FF69B4)", color: "#fff", fontFamily: "'ZT Bros Oskon 90s', sans-serif" }}
              >
                {loading ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Fetching...</> : <><Sparkles size={15} />Fetch details</>}
              </button>
            </div>
          ) : scraped ? (
            <div className="space-y-4">
              <div className="flex gap-3 p-3 rounded-2xl" style={{ background: "#FFF5FD" }}>
                <img src={selectedImg} alt={scraped.title} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" style={{ border: "2px solid #FFD6F0" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold line-clamp-2" style={{ fontFamily: "'Crazy Curlz', cursive", color: "#12002A" }}>{scraped.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {scraped.price && <span className="text-sm font-bold" style={{ fontFamily: "'DM Mono', monospace", color: "#FF1493" }}>{fmt(scraped.price)}</span>}
                    {scraped.onSale && scraped.originalPrice && scraped.originalPrice !== scraped.price && <span className="text-xs line-through" style={{ fontFamily: "'DM Mono', monospace", color: "#C0A0B0" }}>{fmt(scraped.originalPrice)}</span>}
                    {scraped.onSale && scraped.salePercent && <SaleBadge pct={scraped.salePercent} />}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold mb-2" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#7A5E8A" }}>Choose a photo</p>
                <div className="grid grid-cols-4 gap-2">
                  {scraped.availableImages.map((img, i) => (
                    <button key={i} onClick={() => setSelectedImg(img)} className="relative aspect-square rounded-xl overflow-hidden transition-all"
                      style={{ border: img === selectedImg ? "2.5px solid #FF1493" : "2.5px solid #FFD6F0" }}>
                      <img src={img} alt={`Option ${i + 1}`} className="w-full h-full object-cover" />
                      {img === selectedImg && <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(255,20,147,0.15)" }}><div className="rounded-full p-0.5" style={{ background: "#FF1493" }}><Check size={10} color="#fff" /></div></div>}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setNotifyOnSale(!notifyOnSale)} className="relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0" style={{ background: notifyOnSale ? "#FF1493" : "#E8C8F0" }}>
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200" style={{ transform: notifyOnSale ? "translateX(20px)" : "translateX(0)" }} />
                </div>
                <span className="text-sm font-bold" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#12002A" }}>Notify me when price drops</span>
              </label>
              <div className="flex gap-2">
                <button onClick={() => setStep("url")} className="flex-1 rounded-2xl py-2.5 text-sm font-bold transition-colors" style={{ border: "2px solid #FFD6F0", fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#FF1493", background: "#fff" }}>Back</button>
                <button onClick={() => { if (!scraped) return; onAdd({ ...scraped, id: uid(), selectedImage: selectedImg, addedAt: new Date(), notifyOnSale }); onClose(); }} className="flex-[2] rounded-2xl py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #FF1493, #FF69B4)", color: "#fff", fontFamily: "'ZT Bros Oskon 90s', sans-serif" }}>
                  <Heart size={14} fill="#fff" />Add to wishlist
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ShareModal({ list, onClose }: { list: Wishlist; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://wishly.app/list/${list.id}`;
  function copy() { navigator.clipboard.writeText(shareUrl).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative rounded-3xl p-6 max-w-sm w-full shadow-2xl" style={{ background: "#fff", border: "2.5px solid #FFD6F0" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-semibold" style={{ fontFamily: "'Crazy Curlz', cursive", color: "#FF1493" }}>Share this list</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#FFE8F5" }}><X size={14} color="#FF1493" /></button>
        </div>
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FFE8F5, #E8FDF9)" }}>
            <span className="text-pink-500"><ListIcon value={list.icon} size={24} /></span>
          </div>
          <p className="text-lg font-semibold" style={{ fontFamily: "'Crazy Curlz', cursive", color: "#12002A" }}>{list.name}</p>
          <p className="text-sm" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#7A5E8A" }}>{list.items.length} item{list.items.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 mb-3">
          <input readOnly value={shareUrl} className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none" style={{ background: "#FDF5FF", border: "2px solid #FFD6F0", fontFamily: "'DM Mono', monospace", color: "#7A5E8A" }} />
          <button onClick={copy} className="px-4 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all" style={{ background: copied ? "#42FAE1" : "#FF1493", color: copied ? "#006B5E" : "#fff", fontFamily: "'ZT Bros Oskon 90s', sans-serif" }}>
            {copied ? <><Check size={14} />Copied!</> : <><Copy size={14} />Copy</>}
          </button>
        </div>
        <p className="text-xs text-center" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#C0A0B0" }}>Anyone with this link can view your wishlist</p>
      </div>
    </div>
  );
}

function NotificationsPanel({ notifications, onMarkRead, onClose }: { notifications: Notification[]; onMarkRead: (id: string) => void; onClose: () => void }) {
  const unread = notifications.filter(n => !n.read);
  return (
    <div className="absolute top-12 right-0 z-40 w-80 rounded-3xl shadow-2xl overflow-hidden" style={{ background: "#fff", border: "2.5px solid #FFD6F0" }} onClick={e => e.stopPropagation()}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #FFE8F5, #E8FDF9)" }}>
        <h4 className="font-semibold" style={{ fontFamily: "'Crazy Curlz', cursive", color: "#FF1493" }}>Price alerts</h4>
        {unread.length > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#FF1493", color: "#fff", fontFamily: "'DM Mono', monospace" }}>{unread.length} new</span>}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#C0A0B0" }}>No alerts yet!</div>
        ) : notifications.map(n => (
          <div key={n.id} onClick={() => onMarkRead(n.id)} className="px-4 py-3 border-b cursor-pointer hover:bg-pink-50 transition-colors" style={{ borderColor: "#FFE8F5" }}>
            <div className="flex items-start gap-2">
              {!n.read && <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#FF1493" }} />}
              <div className={!n.read ? "" : "pl-4"}>
                <p className="text-sm font-bold line-clamp-1" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#12002A" }}>{n.itemTitle}</p>
                <p className="text-xs mt-0.5" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#7A5E8A" }}>in <span className="font-bold">{n.listName}</span></p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold" style={{ fontFamily: "'DM Mono', monospace", color: "#FF1493" }}>{fmt(n.newPrice)}</span>
                  <span className="text-xs line-through" style={{ fontFamily: "'DM Mono', monospace", color: "#C0A0B0" }}>{fmt(n.oldPrice)}</span>
                  <SaleBadge pct={n.salePercent} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onClose} className="w-full py-2.5 text-xs font-bold transition-colors" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#FF1493", borderTop: "2px solid #FFE8F5" }}>Close</button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [lists, setLists] = useState<Wishlist[]>(SEED_LISTS);
  const [activeListId, setActiveListId] = useState<string>(SEED_LISTS[0].id);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(SEED_LISTS[0].items[0]?.id ?? null);
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListIcon, setNewListIcon] = useState("star");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);

  const activeList = lists.find(l => l.id === activeListId)!;
  const selectedItem = activeList?.items.find(i => i.id === selectedItemId) ?? activeList?.items[0] ?? null;
  const unreadCount = notifications.filter(n => !n.read).length;

  function addItem(item: WishlistItem) {
    setLists(ls => ls.map(l => l.id === activeListId ? { ...l, items: [item, ...l.items] } : l));
    setSelectedItemId(item.id);
    if (item.onSale && item.salePercent) {
      setNotifications(ns => [{ id: uid(), itemTitle: item.title, listName: activeList.name, oldPrice: item.originalPrice!, newPrice: item.price!, salePercent: item.salePercent!, timestamp: new Date(), read: false }, ...ns]);
    }
  }
  function deleteItem(itemId: string) {
    setLists(ls => ls.map(l => l.id === activeListId ? { ...l, items: l.items.filter(i => i.id !== itemId) } : l));
    if (selectedItemId === itemId) setSelectedItemId(activeList.items.find(i => i.id !== itemId)?.id ?? null);
  }
  function changePhoto(itemId: string, img: string) {
    setLists(ls => ls.map(l => l.id === activeListId ? { ...l, items: l.items.map(i => i.id === itemId ? { ...i, selectedImage: img } : i) } : l));
  }
  function createList() {
    if (!newListName.trim()) return;
    const nl: Wishlist = { id: uid(), name: newListName.trim(), icon: newListIcon, items: [], createdAt: new Date() };
    setLists(ls => [...ls, nl]); setActiveListId(nl.id); setSelectedItemId(null);
    setNewListName(""); setNewListIcon("star"); setShowNewList(false);
  }
  function deleteList(id: string) {
    const remaining = lists.filter(l => l.id !== id);
    setLists(remaining);
    if (activeListId === id) { setActiveListId(remaining[0]?.id ?? ""); setSelectedItemId(null); }
  }
  function saveRename() {
    if (!editingName.trim()) return;
    setLists(ls => ls.map(l => l.id === editingListId ? { ...l, name: editingName.trim() } : l));
    setEditingListId(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8" style={{ background: "#FFFFFF", backgroundImage: polkaDotBg }}>

      {/* Main card */}
      <div className="w-full max-w-5xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col" style={{ background: "#FFE8F5", minHeight: "580px", maxHeight: "90vh", border: "3px solid #fff" }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ background: "#fff" }}>
          <div className="flex items-center gap-2">
            <Heart size={20} fill="#FF1493" color="#FF1493" />
            <span className="text-2xl font-semibold" style={{ fontFamily: "'Crazy Curlz', cursive", color: "#FF1493", letterSpacing: "0.02em" }}>Wishly</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowShare(true)} className="flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-bold transition-all" style={{ background: "#fff", border: "2px solid #FFD6F0", color: "#FF1493", fontFamily: "'ZT Bros Oskon 90s', sans-serif" }}>
              <Share2 size={14} /> Share
            </button>
            <div className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all" style={{ background: "#FFF5FD", border: "2px solid #FFD6F0" }}>
                <Bell size={16} color="#FF1493" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#42FAE1", color: "#006B5E", fontFamily: "'DM Mono', monospace" }}>{unreadCount}</span>}
              </button>
              {showNotifs && (
                <div onClick={() => setShowNotifs(false)} className="fixed inset-0 z-30">
                  <NotificationsPanel notifications={notifications} onMarkRead={id => setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))} onClose={() => setShowNotifs(false)} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* Left: wishlist tabs + item grid */}
          <div className="flex flex-col w-[320px] flex-shrink-0" style={{ background: "#FFE8F5" }}>
            {/* List tabs */}
            <div className="px-4 pt-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                {lists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => { setActiveListId(list.id); setSelectedItemId(list.items[0]?.id ?? null); }}
                    className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-bold transition-all"
                    style={{
                      background: activeListId === list.id ? "#FF1493" : "#fff",
                      color: activeListId === list.id ? "#fff" : "#FF1493",
                      fontFamily: "'ZT Bros Oskon 90s', sans-serif",
                      border: "2px solid",
                      borderColor: activeListId === list.id ? "#FF1493" : "#FFD6F0",
                    }}
                  >
                    <ListIcon value={list.icon} size={12} />
                    <span className="max-w-[80px] truncate">{list.name}</span>
                    <span className="text-xs rounded-full px-1" style={{ background: activeListId === list.id ? "rgba(255,255,255,0.3)" : "#FFE8F5", fontFamily: "'DM Mono', monospace" }}>{list.items.length}</span>
                  </button>
                ))}
                <button
                  onClick={() => setShowNewList(!showNewList)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={{ background: "#fff", border: "2px solid #FFD6F0", color: "#FF1493" }}
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* New list form */}
              {showNewList && (
                <div className="mb-3 p-3 rounded-2xl" style={{ background: "#fff", border: "2px solid #FFD6F0" }}>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {LIST_ICONS.map(({ value, Icon }) => (
                      <button key={value} onClick={() => setNewListIcon(value)} className="aspect-square rounded-xl flex items-center justify-center transition-colors"
                        style={{ background: newListIcon === value ? "#FF1493" : "#FFE8F5", color: newListIcon === value ? "#fff" : "#FF1493" }}>
                        <Icon size={13} />
                      </button>
                    ))}
                  </div>
                  <input value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") createList(); if (e.key === "Escape") setShowNewList(false); }} placeholder="List name..." className="w-full rounded-xl px-2.5 py-1.5 text-xs focus:outline-none mb-2" style={{ background: "#FDF5FF", border: "2px solid #FFD6F0", fontFamily: "'ZT Bros Oskon 90s', sans-serif" }} autoFocus />
                  <div className="flex gap-1.5">
                    <button onClick={createList} className="flex-1 rounded-xl py-1.5 text-xs font-bold" style={{ background: "#FF1493", color: "#fff", fontFamily: "'ZT Bros Oskon 90s', sans-serif" }}>Create</button>
                    <button onClick={() => setShowNewList(false)} className="flex-1 rounded-xl py-1.5 text-xs font-bold" style={{ border: "2px solid #FFD6F0", color: "#FF1493", background: "#fff", fontFamily: "'ZT Bros Oskon 90s', sans-serif" }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Edit / delete active list */}
              {editingListId === activeListId ? (
                <div className="flex gap-1.5 mb-2">
                  <input value={editingName} onChange={e => setEditingName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setEditingListId(null); }} onBlur={saveRename} className="flex-1 rounded-xl px-2.5 py-1 text-xs focus:outline-none" style={{ background: "#fff", border: "2px solid #FF1493", fontFamily: "'ZT Bros Oskon 90s', sans-serif" }} autoFocus />
                </div>
              ) : null}
            </div>

            {/* Item grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {activeList?.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <p className="text-sm font-bold mb-2" style={{ fontFamily: "'Crazy Curlz', cursive", color: "#FF1493" }}>Nothing here yet!</p>
                  <p className="text-xs mb-3" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#C0A0B0" }}>Add your first item</p>
                  <button onClick={() => setShowAddItem(true)} className="rounded-2xl px-4 py-2 text-xs font-bold" style={{ background: "#FF1493", color: "#fff", fontFamily: "'ZT Bros Oskon 90s', sans-serif" }}>
                    <Plus size={12} className="inline mr-1" />Add item
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {activeList.items.map(item => (
                    <ItemCard
                      key={item.id} item={item} isSelected={selectedItem?.id === item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      onDelete={() => deleteItem(item.id)}
                      onChangePhoto={img => changePhoto(item.id, img)}
                    />
                  ))}
                  {/* Add tile */}
                  <button onClick={() => setShowAddItem(true)} className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all" style={{ border: "2.5px dashed #FFB6D9", background: "#fff5fb" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#FFE8F5" }}><Plus size={15} color="#FF1493" /></div>
                    <span className="text-xs font-bold" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#FF1493" }}>Add</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: item detail panel */}
          <div className="flex-1 flex flex-col min-w-0 rounded-[1.5rem] m-3 overflow-hidden" style={{ background: "#fff" }}>
            {selectedItem ? (
              <>
                {/* Big image */}
                <div className="relative flex-shrink-0" style={{ height: "260px", background: "#FFE8F5" }}>
                  <img src={selectedItem.selectedImage} alt={selectedItem.title} className="w-full h-full object-cover" />
                  {selectedItem.onSale && (
                    <div className="absolute top-4 left-4"><SaleBadge pct={selectedItem.salePercent!} /></div>
                  )}
                  {/* Quick actions */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => setShowPhotoPicker(true)} className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-bold backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.9)", color: "#FF1493", fontFamily: "'ZT Bros Oskon 90s', sans-serif", border: "2px solid #FFD6F0" }}>
                      <Search size={11} />Photos
                    </button>
                    <button onClick={() => deleteItem(selectedItem.id)} className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.9)", border: "2px solid #FFD6F0" }}>
                      <Trash2 size={13} color="#FF1493" />
                    </button>
                  </div>
                  {/* list name + rename/delete */}
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <button onClick={() => { setEditingListId(activeListId); setEditingName(activeList.name); }} className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.85)", color: "#7A5E8A", fontFamily: "'ZT Bros Oskon 90s', sans-serif" }}>
                      <Edit3 size={10} />{activeList.name}
                    </button>
                    {lists.length > 1 && (
                      <button onClick={() => deleteList(activeListId)} className="w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.85)" }}>
                        <Trash2 size={11} color="#C0A0B0" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Detail */}
                <div className="flex-1 overflow-y-auto p-5">
                  <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: "'Crazy Curlz', cursive", color: "#12002A" }}>{selectedItem.title}</h2>
                  <p className="text-sm mb-3 leading-relaxed" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#7A5E8A" }}>{selectedItem.description}</p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-baseline gap-2">
                      {selectedItem.price !== null && <span className="text-2xl font-bold" style={{ fontFamily: "'DM Mono', monospace", color: "#FF1493" }}>{fmt(selectedItem.price)}</span>}
                      {selectedItem.onSale && selectedItem.originalPrice && selectedItem.originalPrice !== selectedItem.price && (
                        <span className="text-sm line-through" style={{ fontFamily: "'DM Mono', monospace", color: "#C0A0B0" }}>{fmt(selectedItem.originalPrice)}</span>
                      )}
                    </div>
                    <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-bold transition-all" style={{ background: "linear-gradient(135deg, #42FAE1, #00D4B8)", color: "#003D35", fontFamily: "'ZT Bros Oskon 90s', sans-serif" }}>
                      Visit {selectedItem.store} <ExternalLink size={13} />
                    </a>
                  </div>

                  {selectedItem.onSale && (
                    <div className="flex items-center gap-2 rounded-2xl p-3 text-sm" style={{ background: "#E8FDF9", border: "2px solid #42FAE1" }}>
                      <AlertCircle size={15} color="#006B5E" />
                      <span className="font-bold" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#006B5E" }}>
                        This item is on sale! Save {fmt(selectedItem.originalPrice! - selectedItem.price!)} today.
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom: add item */}
                <div className="flex-shrink-0 px-5 pb-5">
                  <button onClick={() => setShowAddItem(true)} className="w-full rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all" style={{ background: "linear-gradient(135deg, #FF1493, #FF69B4)", color: "#fff", fontFamily: "'ZT Bros Oskon 90s', sans-serif" }}>
                    <Plus size={16} />Add another item
                  </button>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, #FFE8F5, #E8FDF9)" }}>
                  <Heart size={36} fill="#FF1493" color="#FF1493" />
                </div>
                <h3 className="text-2xl font-semibold mb-2" style={{ fontFamily: "'Crazy Curlz', cursive", color: "#FF1493" }}>Start your wishlist!</h3>
                <p className="text-sm mb-6" style={{ fontFamily: "'ZT Bros Oskon 90s', sans-serif", color: "#C0A0B0", maxWidth: "220px" }}>
                  Paste any product link and we will find photos and prices for you.
                </p>
                <button onClick={() => setShowAddItem(true)} className="rounded-2xl px-6 py-3 text-sm font-bold flex items-center gap-2" style={{ background: "linear-gradient(135deg, #FF1493, #FF69B4)", color: "#fff", fontFamily: "'ZT Bros Oskon 90s', sans-serif" }}>
                  <Sparkles size={15} />Add your first item
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddItem && <AddItemModal onClose={() => setShowAddItem(false)} onAdd={addItem} />}
      {showShare && activeList && <ShareModal list={activeList} onClose={() => setShowShare(false)} />}
      {showPhotoPicker && selectedItem && (
        <PhotoPickerModal
          images={selectedItem.availableImages}
          selected={selectedItem.selectedImage}
          onSelect={img => changePhoto(selectedItem.id, img)}
          onClose={() => setShowPhotoPicker(false)}
        />
      )}
    </div>
  );
}
