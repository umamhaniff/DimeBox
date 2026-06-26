import React, { useEffect, useState } from 'react'
import { apiClient } from '../utils/apiClient'
import type { Item } from '../utils/durability'
import { ItemCard } from '../components/ItemCard'
import { Heart, Layers } from 'lucide-react'


interface WishlistProps {
  onInspectItem: (item: Item) => void
  onDelete: (id: string) => void
  onBuy: (item: Item) => void
  refreshTrigger: number
}

export const Wishlist: React.FC<WishlistProps> = ({ onInspectItem, onDelete, onBuy, refreshTrigger }) => {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWishlist()
  }, [refreshTrigger])

  const fetchWishlist = async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<Item[]>('/items?status_filter=Wishlist')
      setItems(data)
    } catch (err) {
      console.error('Failed to fetch wishlist items:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 animate-hud-fade font-hud">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-hud-border pb-3">
        <div>
          <h2 className="text-xl font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-2">
            <Heart className="w-5 h-5 text-neon-yellow" />
            Bounty Radar (Wishlist)
          </h2>
          <p className="text-[9px] text-hud-text-muted uppercase tracking-widest mt-1">
            Target Items & Gear Hunting Radar
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-neon-yellow bg-neon-yellow-dim border border-neon-yellow/20 px-2.5 py-1 rounded">
          {items.length} Target
        </span>
      </div>

      {/* Info Panel */}
      <div className="hud-corner-box bg-hud-panel border-hud-border p-4 rounded relative text-xs text-hud-text-muted">
        <div className="hud-corner-bottom" />
        <span className="text-neon-yellow font-bold uppercase block mb-1 font-mono">[Bounty radar active]</span>
        Klik tombol <strong className="text-neon-green">Saya Beli</strong> untuk memicu form konversi kepemilikan barang (*Owned*), mengunggah foto fisik asli, dan memasukkan rating investasi barang.
      </div>

      {/* Grid Display */}
      {loading ? (
        <div className="text-center py-20 text-xs text-hud-text-muted animate-pulse font-mono">
          Scanning target bounties...
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={onInspectItem}
              onDelete={onDelete}
              onBuy={onBuy}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 border border-dashed border-hud-border/40 rounded flex flex-col items-center gap-2 text-hud-text-muted">
          <Layers className="w-8 h-8 opacity-40 text-neon-yellow" />
          <span className="text-xs font-medium">No active targets in bounty radar.</span>
        </div>
      )}

    </div>
  )
}
