import React, { useEffect, useState } from 'react'
import { apiClient } from '../utils/apiClient'
import type { Item, Tag } from '../utils/durability'

import { ItemCard } from '../components/ItemCard'
import { Search, Tag as TagIcon, Layers, Sparkles } from 'lucide-react'

interface GearProps {
  onInspectItem: (item: Item) => void
  onDelete: (id: string) => void
  onBuy?: (item: Item) => void
  refreshTrigger: number
}

export const Gear: React.FC<GearProps> = ({ onInspectItem, onDelete, onBuy, refreshTrigger }) => {
  const [items, setItems] = useState<Item[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'All' | 'Owned' | 'Wishlist'>('All')
  const [classFilter, setClassFilter] = useState<'All' | 'Gear' | 'Toiletries'>('All')

  useEffect(() => {
    fetchData()
  }, [refreshTrigger])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch both items (all, we will filter Gear & Toiletries in frontend) and all tags
      const [itemsData, tagsData] = await Promise.all([
        apiClient.get<Item[]>('/items'),
        apiClient.get<Tag[]>('/tags'),
      ])
      
      // Filter out Wardrobe items, we only want Gear and Toiletries
      const gearAndToiletries = itemsData.filter(
        (item) => item.category === 'Gear' || item.category === 'Toiletries'
      )
      setItems(gearAndToiletries)
      setTags(tagsData)
    } catch (err) {
      console.error('Failed to fetch gear data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter items based on Search, Selected Tag, Category Class, and Status Filter
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === 'All' ? true : item.status === statusFilter
    const matchesClass =
      classFilter === 'All' ? true : item.category === classFilter
    const matchesTag = selectedTag
      ? item.tags.some((t) => t.name.toLowerCase() === selectedTag.toLowerCase())
      : true

    return matchesSearch && matchesStatus && matchesClass && matchesTag
  })

  return (
    <div className="p-6 space-y-6 animate-hud-fade font-hud">
      
      {/* 1. Header with Stats */}
      <div className="flex justify-between items-center border-b border-hud-border pb-3">
        <div>
          <h2 className="text-xl font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neon-cyan" />
            Gear & Consumables
          </h2>
          <p className="text-[9px] text-hud-text-muted uppercase tracking-widest mt-1">
            Physical Equipment, Gadgets & Toiletries
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-neon-cyan bg-neon-cyan-dim border border-neon-cyan/20 px-2.5 py-1 rounded">
          {filteredItems.length} Class Aset
        </span>
      </div>

      {/* 2. Controls: Search, Class, and Status Tabs */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-hud-text-muted" />
          <input
            type="text"
            placeholder="search equipment / toiletries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-hud-panel border border-hud-border rounded pl-10 pr-4 py-2.5 text-sm text-hud-text-bright placeholder-hud-text-muted/50 focus:outline-none focus:border-neon-cyan transition-colors font-sans"
          />
        </div>

        {/* Double-layer selection filter */}
        <div className="grid grid-cols-2 gap-3">
          {/* Status Filter */}
          <div className="flex bg-hud-panel p-0.5 rounded border border-hud-border">
            {(['All', 'Owned', 'Wishlist'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer text-center ${
                  statusFilter === status
                    ? 'bg-neon-cyan-dim text-neon-cyan border border-neon-cyan/20 rounded'
                    : 'text-hud-text-muted hover:text-hud-text-bright'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Category Class Filter */}
          <div className="flex bg-hud-panel p-0.5 rounded border border-hud-border">
            {(['All', 'Gear', 'Toiletries'] as const).map((cls) => (
              <button
                key={cls}
                onClick={() => setClassFilter(cls)}
                className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer text-center ${
                  classFilter === cls
                    ? 'bg-neon-cyan-dim text-neon-cyan border border-neon-cyan/20 rounded'
                    : 'text-hud-text-muted hover:text-hud-text-bright'
                }`}
              >
                {cls === 'Toiletries' ? 'Consum' : cls}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Faceted Tag Filters (Flat Classification) */}
      {tags.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-hud-text-muted flex items-center gap-1">
            <TagIcon className="w-3 h-3" />
            Class Filters (Tags)
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all duration-300 cursor-pointer ${
                selectedTag === null
                  ? 'bg-neon-cyan-dim text-neon-cyan border-neon-cyan'
                  : 'bg-hud-panel border-hud-border text-hud-text-muted hover:border-hud-text-bright hover:text-hud-text-bright'
              }`}
            >
              SHOW ALL
            </button>
            {tags.map((tag) => {
              const isSelected = selectedTag === tag.name
              return (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTag(isSelected ? null : tag.name)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'bg-neon-cyan-dim text-neon-cyan border-neon-cyan'
                      : 'bg-hud-panel border-hud-border text-hud-text-muted hover:border-hud-text-bright hover:text-hud-text-bright'
                  }`}
                >
                  {tag.name.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. Grid Display */}
      {loading ? (
        <div className="text-center py-20 text-xs text-hud-text-muted animate-pulse font-mono">
          Downloading gear grid assets...
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {filteredItems.map((item) => (
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
          <Layers className="w-8 h-8 opacity-40 text-neon-cyan" />
          <span className="text-xs font-medium">No gear assets matching filters found in vault.</span>
        </div>
      )}

    </div>
  )
}
