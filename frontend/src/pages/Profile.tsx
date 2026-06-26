import React, { useEffect, useState } from 'react'
import { apiClient } from '../utils/apiClient'
import type { Item, Tag } from '../utils/durability'
import { useAuth } from '../context/AuthContext'
import { Star, Tag as TagIcon, Trash2, Award, Sparkles, Layers } from 'lucide-react'


interface ProfileProps {
  refreshTrigger: number
  onInspectItem: (item: Item) => void
}

export const Profile: React.FC<ProfileProps> = ({ refreshTrigger, onInspectItem }) => {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [refreshTrigger])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [itemsData, tagsData] = await Promise.all([
        apiClient.get<Item[]>('/items'),
        apiClient.get<Tag[]>('/tags'),
      ])
      setItems(itemsData)
      setTags(tagsData)
    } catch (err) {
      console.error('Failed to fetch profile data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    setDeletingTagId(tagId)
    try {
      await apiClient.delete(`/tags/${tagId}`)
      setTags((prev) => prev.filter((t) => t.id !== tagId))
    } catch (err) {
      console.error('Failed to delete tag:', err)
    } finally {
      setDeletingTagId(null)
    }
  }

  // Calculate worth matrix: items with rating_worth = 5
  const legendaryItems = items.filter(
    (item) => item.status === 'Owned' && item.rating_worth === 5
  )

  const ownedCount = items.filter((item) => item.status === 'Owned').length
  const wishlistCount = items.filter((item) => item.status === 'Wishlist').length

  // Calculate Bounty Gold Required: sum of prices of all wishlist items (cheapest link)
  const bountyGoldRequired = items
    .filter((item) => item.status === 'Wishlist')
    .reduce((sum, item) => {
      const cheapestLink = item.wishlist_links?.find((l) => l.is_cheapest) || item.wishlist_links?.[0]
      return sum + (cheapestLink?.price || 0)
    }, 0)

  return (
    <div className="p-6 space-y-6 animate-hud-fade font-hud">
      
      {/* 1. Explorer Header */}
      <div className="hud-corner-box bg-hud-panel border-hud-border p-5 rounded relative flex flex-col gap-3">
        <div className="hud-corner-bottom" />
        <div className="flex items-center gap-3">
          <div className="p-3 bg-neon-cyan-dim border border-neon-cyan/20 rounded-full text-neon-cyan animate-pulse">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-hud-text-bright tracking-wider uppercase truncate max-w-[240px]">
              {user?.email?.split('@')[0] ?? 'Explorer'}
            </h2>
            <span className="text-[9px] text-hud-text-muted font-mono block tracking-widest uppercase">
              ID: {user?.id?.substring(0, 18)}...
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-hud-border/40 pt-3 mt-1 text-center">
          <div>
            <span className="text-[9px] text-hud-text-muted uppercase tracking-wider block font-mono">Owned Vault</span>
            <span className="text-lg font-bold text-neon-green font-mono">{ownedCount}</span>
          </div>
          <div>
            <span className="text-[9px] text-hud-text-muted uppercase tracking-wider block font-mono">Wishlists</span>
            <span className="text-lg font-bold text-neon-yellow font-mono">{wishlistCount}</span>
          </div>
        </div>
      </div>

      {/* 2. Treasury & Bounty Analytics */}
      <div className="hud-corner-box bg-hud-panel border-hud-border p-5 rounded relative">
        <div className="hud-corner-bottom" />
        <div className="flex justify-between items-center mb-4 border-b border-hud-border pb-2.5">
          <h3 className="text-xs font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-1.5 font-hud">
            <Award className="w-4 h-4 text-neon-cyan animate-pulse animate-duration-2000" />
            Treasury & Bounty Analytics
          </h3>
          <span className="text-[9px] text-hud-text-muted font-mono uppercase tracking-widest font-bold">Treasury HUD</span>
        </div>

        <div className="space-y-4">
          {/* Bounty Gold Required */}
          <div className="bg-hud-bg/50 border border-hud-border p-3.5 rounded flex justify-between items-center gap-4">
            <div>
              <span className="text-[9px] text-hud-text-muted uppercase tracking-wider block font-mono">Bounty Gold Required (Target Dana)</span>
              <span className="text-base font-bold text-neon-yellow font-mono mt-0.5 block">
                💰 {bountyGoldRequired.toLocaleString('id-ID')} <span className="text-[9px] text-hud-text-muted font-sans font-normal">GOLD / IDR</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-hud-text-muted uppercase tracking-wider block font-mono">Avg Target Cost</span>
              <span className="text-xs font-mono font-bold text-hud-text-bright">
                {wishlistCount > 0 ? Math.round(bountyGoldRequired / wishlistCount).toLocaleString('id-ID') : 0} / item
              </span>
            </div>
          </div>

          {/* S-Class Legendary Investment Ratio */}
          <div className="bg-hud-bg/50 border border-hud-border p-3.5 rounded">
            <div className="flex justify-between items-center mb-2">
              <div>
                <span className="text-[9px] text-hud-text-muted uppercase tracking-wider block font-mono">Legendary Worth Ratio (S-Class Assets)</span>
                <span className="text-xs font-mono font-bold text-neon-green mt-0.5 block">
                  {ownedCount > 0 ? Math.round((legendaryItems.length / ownedCount) * 100) : 0}% S-Class Asset Rate
                </span>
              </div>
              <div className="text-right font-mono text-xs text-hud-text-bright font-bold">
                {legendaryItems.length} <span className="text-hud-text-muted">/</span> {ownedCount} assets
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-hud-bg h-1 rounded-full overflow-hidden border border-hud-border">
              <div 
                className="bg-neon-green h-full rounded-full transition-all duration-500" 
                style={{ width: `${ownedCount > 0 ? (legendaryItems.length / ownedCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Legendary Investment Matrix (Rating 5 items) */}
      <div className="hud-corner-box bg-hud-panel border-hud-border p-5 rounded relative">
        <div className="hud-corner-bottom" />
        <div className="flex justify-between items-center mb-4 border-b border-hud-border pb-2.5">
          <h3 className="text-xs font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-neon-yellow" />
            Legendary Investment Matrix
          </h3>
          <span className="text-[9px] text-hud-text-muted font-mono uppercase tracking-widest">S-Class Assets</span>
        </div>

        {loading ? (
          <div className="text-center py-6 text-xs text-hud-text-muted animate-pulse font-mono">
            Scanning S-Class database...
          </div>
        ) : legendaryItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {legendaryItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onInspectItem(item)}
                className="bg-hud-bg/40 border border-hud-border hover:border-neon-cyan p-3 rounded flex justify-between items-center cursor-pointer transition-colors group"
              >
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-hud-text-bright block group-hover:text-neon-cyan transition-colors truncate max-w-[200px]">
                    {item.name}
                  </span>
                  <span className="text-[9px] uppercase font-mono text-hud-text-muted">
                    Class: {item.category}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <div className="flex text-neon-yellow">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-neon-yellow" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-hud-border/40 rounded flex flex-col items-center gap-2 text-hud-text-muted">
            <Layers className="w-7 h-7 opacity-30 text-neon-yellow" />
            <span className="text-xs font-medium">No S-Class (5-Star Worth) assets registered in vault.</span>
          </div>
        )}
      </div>

      {/* 3. Global Tag Manager */}
      <div className="hud-corner-box bg-hud-panel border-hud-border p-5 rounded relative">
        <div className="hud-corner-bottom" />
        <div className="flex justify-between items-center mb-4 border-b border-hud-border pb-2.5">
          <h3 className="text-xs font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-1.5">
            <TagIcon className="w-4 h-4 text-neon-cyan" />
            Global Tag Classification
          </h3>
          <span className="text-[9px] text-hud-text-muted font-mono uppercase tracking-widest font-bold">Elementals</span>
        </div>

        {loading ? (
          <div className="text-center py-6 text-xs text-hud-text-muted animate-pulse font-mono">
            Scanning elements...
          </div>
        ) : tags.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="bg-hud-bg/50 border border-hud-border px-3 py-2 rounded flex justify-between items-center text-xs font-mono"
              >
                <span className="text-hud-text-bright uppercase truncate max-w-[100px]">{tag.name}</span>
                <button
                  disabled={deletingTagId === tag.id}
                  onClick={() => handleDeleteTag(tag.id)}
                  className="text-hud-text-muted hover:text-neon-red p-1 transition-colors cursor-pointer"
                  title="Delete Tag"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-hud-border/40 rounded flex flex-col items-center gap-2 text-hud-text-muted">
            <TagIcon className="w-7 h-7 opacity-30 text-neon-cyan" />
            <span className="text-xs font-medium">No custom tags defined yet.</span>
          </div>
        )}
      </div>

    </div>
  )
}
