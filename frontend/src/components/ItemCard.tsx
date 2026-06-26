import React from 'react'
import type { Item } from '../utils/durability'
import { calculateDurability } from '../utils/durability'
import { Star, ShieldAlert, Tag, Layers } from 'lucide-react'


interface ItemCardProps {
  item: Item
  onEdit: (item: Item) => void
  onDelete: (id: string) => void
  onBuy?: (item: Item) => void
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onEdit, onDelete, onBuy }) => {
  const { percentage, status, label } = calculateDurability(item)

  const getStatusColor = () => {
    switch (status) {
      case 'depleted':
        return 'bg-neon-red text-neon-red'
      case 'warning':
        return 'bg-neon-yellow text-neon-yellow'
      default:
        return 'bg-neon-green text-neon-green'
    }
  }

  const getStatusBorderColor = () => {
    switch (status) {
      case 'depleted':
        return 'border-neon-red-dim'
      case 'warning':
        return 'border-neon-yellow-dim'
      default:
        return 'border-neon-green-dim'
    }
  }

  const getStatusBgColor = () => {
    switch (status) {
      case 'depleted':
        return 'bg-neon-red-dim'
      case 'warning':
        return 'bg-neon-yellow-dim'
      default:
        return 'bg-neon-green-dim'
    }
  }

  return (
    <div className="hud-corner-box bg-hud-panel border-hud-border p-4 rounded relative hover:border-neon-cyan transition-all duration-300 group flex flex-col justify-between">
      <div className="hud-corner-bottom" />
      
      {/* Top Section: Category & Status */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[9px] uppercase tracking-widest text-hud-text-muted font-mono bg-hud-bg px-1.5 py-0.5 rounded border border-hud-border">
          {item.category}{item.category === 'Wardrobe' && item.wardrobe_class ? ` :: ${item.wardrobe_class}` : ''}
        </span>
        <span
          className={`text-[9px] uppercase tracking-widest font-bold font-mono px-1.5 py-0.5 rounded border ${
            item.status === 'Owned'
              ? 'bg-neon-green-dim text-neon-green border-neon-green/30'
              : 'bg-neon-yellow-dim text-neon-yellow border-neon-yellow/30'
          }`}
        >
          {item.status}
        </span>
      </div>

      {/* Image / Thumbnail placeholder */}
      <div className="aspect-video w-full bg-hud-bg border border-hud-border rounded overflow-hidden mb-3 relative flex items-center justify-center">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="text-hud-text-muted flex flex-col items-center gap-1">
            <Layers className="w-8 h-8 opacity-40" />
            <span className="text-[9px] uppercase tracking-widest">No Physical Scan</span>
          </div>
        )}
        
        {/* Dominant color dot */}
        {item.dominant_color && (
          <div 
            className="absolute top-2 right-2 w-3 h-3 rounded-full border border-hud-panel shadow"
            style={{ backgroundColor: item.dominant_color }}
            title={`Dominant Color: ${item.dominant_color}`}
          />
        )}
      </div>

      {/* Item Title */}
      <h3 className="text-sm font-bold text-hud-text-bright tracking-wide mb-1 group-hover:text-neon-cyan transition-colors">
        {item.name}
      </h3>

      {/* Durability HUD Bar */}
      {item.status === 'Owned' && (
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-hud-text-muted uppercase tracking-wider">Durability</span>
            <span className={status === 'optimal' ? 'text-hud-text' : getStatusColor().split(' ')[1]}>
              {percentage}%
            </span>
          </div>
          <div className="w-full bg-hud-bg h-1.5 rounded-full overflow-hidden border border-hud-border/50">
            <div
              className={`h-full rounded-full ${getStatusColor().split(' ')[0]}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          {status !== 'optimal' && (
            <div className={`text-[9px] px-1.5 py-0.5 rounded border ${getStatusBgColor()} ${getStatusBorderColor()} flex items-center gap-1 mt-1 font-mono`}>
              <ShieldAlert className="w-3 h-3 shrink-0" />
              <span>{label}</span>
            </div>
          )}
        </div>
      )}

      {/* Target Price & Shop Link for Wishlist */}
      {item.status === 'Wishlist' && item.wishlist_links && item.wishlist_links.length > 0 && (
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-hud-text-muted uppercase tracking-wider">Target Price</span>
            <span className="text-neon-yellow font-bold">
              💰 Rp {item.wishlist_links[0].price.toLocaleString('id-ID')}
            </span>
          </div>
          {item.wishlist_links[0].spec_note && (
            <div className="text-[9px] text-hud-text-muted font-mono italic truncate">
              Note: {item.wishlist_links[0].spec_note}
            </div>
          )}
          {item.wishlist_links[0].url_link && (
            <a
              href={item.wishlist_links[0].url_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] text-neon-cyan hover:bg-neon-cyan hover:text-hud-bg font-bold uppercase tracking-wider truncate block font-mono mt-1.5 border border-neon-cyan/30 rounded bg-neon-cyan-dim/5 py-1 text-center transition-all cursor-pointer"
            >
              View Shop Link ↗
            </a>
          )}
        </div>
      )}

      {/* Worth Rating (Stars) */}
      {item.status === 'Owned' && item.rating_worth && (
        <div className="flex items-center gap-0.5 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < (item.rating_worth ?? 0)
                  ? 'text-neon-yellow fill-neon-yellow/30'
                  : 'text-hud-text-muted opacity-30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Tags section */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {item.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-0.5 text-[9px] font-mono text-neon-cyan bg-neon-cyan-dim border border-neon-cyan/20 px-1.5 py-0.5 rounded"
            >
              <Tag className="w-2.5 h-2.5" />
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-hud-border/55 mt-auto">
        {item.status === 'Wishlist' && onBuy && (
          <button
            onClick={() => onBuy(item)}
            className="flex-1 py-1.5 rounded bg-neon-green-dim text-neon-green border border-neon-green/45 text-[10px] font-bold uppercase tracking-wider hover:bg-neon-green hover:text-hud-bg transition-all cursor-pointer text-center"
          >
            Saya Beli
          </button>
        )}
        <button
          onClick={() => onEdit(item)}
          className="flex-1 py-1.5 rounded bg-hud-bg border border-hud-border text-hud-text-bright text-[10px] font-bold uppercase tracking-wider hover:border-neon-cyan hover:text-neon-cyan transition-colors cursor-pointer text-center"
        >
          Inspect
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="py-1.5 px-2.5 rounded bg-hud-bg border border-hud-border text-hud-text-muted text-[10px] font-bold uppercase hover:border-neon-red hover:text-neon-red transition-colors cursor-pointer text-center"
          title="DELETE"
        >
          DEL
        </button>
      </div>
    </div>
  )
}
