import React, { useEffect, useState } from 'react'
import { apiClient } from '../utils/apiClient'
import type { Item, Tag } from '../utils/durability'
import { recommendOutfit } from '../utils/harmony'

import { ItemCard } from '../components/ItemCard'
import { Search, Tag as TagIcon, Layers, Sparkles, Trash2, ShieldAlert, RefreshCw, Save } from 'lucide-react'

interface WardrobeProps {
  onInspectItem: (item: Item) => void
  onDelete: (id: string) => void
  onBuy?: (item: Item) => void
  refreshTrigger: number
}

interface SavedOutfit {
  id: string
  name: string
  created_at: string
  items: Item[]
}

export const Wardrobe: React.FC<WardrobeProps> = ({ onInspectItem, onDelete, onBuy, refreshTrigger }) => {
  // 1. Navigation Tab
  const [activeTab, setActiveTab] = useState<'vault' | 'ootd'>('vault')

  // 2. Data States
  const [items, setItems] = useState<Item[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([])
  const [loading, setLoading] = useState(true)
  const [outfitsLoading, setOutfitsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 3. Vault Filter States
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'All' | 'Owned' | 'Wishlist'>('All')

  // 4. OOTD Lab Canvas States
  const [selectedTop, setSelectedTop] = useState<Item | null>(null)
  const [selectedBottom, setSelectedBottom] = useState<Item | null>(null)
  const [selectedOuter, setSelectedOuter] = useState<Item | null>(null)
  const [selectedShoes, setSelectedShoes] = useState<Item | null>(null)
  
  const [matchReason, setMatchReason] = useState<string | null>(null)
  const [outfitName, setOutfitName] = useState('')
  const [savingOutfit, setSavingOutfit] = useState(false)
  const [outfitError, setOutfitError] = useState<string | null>(null)

  // 5. Item Selector Modal States
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [selectorClass, setSelectorClass] = useState<'Top' | 'Bottom' | 'Outer' | 'Shoes'>('Top')

  // Fetch all initial data
  useEffect(() => {
    fetchData()
    if (activeTab === 'ootd') {
      fetchOutfits()
    }
  }, [refreshTrigger, activeTab])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [itemsData, tagsData] = await Promise.all([
        apiClient.get<Item[]>('/items?category=Wardrobe'),
        apiClient.get<Tag[]>('/tags'),
      ])
      setItems(itemsData)
      setTags(tagsData)
    } catch (err: any) {
      console.error('Failed to fetch wardrobe data:', err)
      setError(err.message || 'Failed to sync with the pocket dimension.')
    } finally {
      setLoading(false)
    }
  }

  const fetchOutfits = async () => {
    setOutfitsLoading(true)
    setError(null)
    try {
      const outfitsData = await apiClient.get<SavedOutfit[]>('/outfits')
      setSavedOutfits(outfitsData)
    } catch (err: any) {
      console.error('Failed to fetch saved outfits:', err)
      setError(err.message || 'Failed to sync with the pocket dimension.')
    } finally {
      setOutfitsLoading(false)
    }
  }

  // Smart Auto-Armor Recommendation Trigger
  const handleAutoRecommend = () => {
    const recommendation = recommendOutfit(items)
    
    if (recommendation.top || recommendation.bottom) {
      setSelectedTop(recommendation.top || null)
      setSelectedBottom(recommendation.bottom || null)
      setSelectedOuter(recommendation.outer || null)
      setSelectedShoes(recommendation.shoes || null)
      setMatchReason(recommendation.matchReason || 'Optimal matching based on style alignment.')
    } else {
      setMatchReason(recommendation.matchReason || 'Armor slots could not be populated.')
    }
  }

  // Save Outfit
  const handleSaveOutfit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!outfitName.trim()) return
    
    const ids: string[] = []
    if (selectedTop) ids.push(selectedTop.id)
    if (selectedBottom) ids.push(selectedBottom.id)
    if (selectedOuter) ids.push(selectedOuter.id)
    if (selectedShoes) ids.push(selectedShoes.id)

    if (ids.length === 0) {
      setOutfitError('Cannot save empty loadout. Equip at least 1 piece.')
      return
    }

    setSavingOutfit(true)
    setOutfitError(null)

    try {
      await apiClient.post('/outfits', {
        name: outfitName.trim(),
        item_ids: ids
      })
      setOutfitName('')
      setMatchReason(null)
      fetchOutfits()
    } catch (err: any) {
      setOutfitError(err.message || 'Failed to save outfit setup.')
    } finally {
      setSavingOutfit(false)
    }
  }

  // Delete Outfit
  const handleDeleteOutfit = async (id: string) => {
    if (!window.confirm('Delete outfit setup?')) return
    try {
      await apiClient.delete(`/outfits/${id}`)
      fetchOutfits()
    } catch (err) {
      console.error('Failed to delete outfit:', err)
    }
  }

  // Open item selector modal for a slot
  const openSelector = (slotClass: 'Top' | 'Bottom' | 'Outer' | 'Shoes') => {
    setSelectorClass(slotClass)
    setIsSelectorOpen(true)
  }

  // Select item for slot
  const selectItemForSlot = (item: Item | null) => {
    if (selectorClass === 'Top') setSelectedTop(item)
    if (selectorClass === 'Bottom') setSelectedBottom(item)
    if (selectorClass === 'Outer') setSelectedOuter(item)
    if (selectorClass === 'Shoes') setSelectedShoes(item)
    
    setMatchReason(null) // Reset smart match reason as they are manually customizing
    setIsSelectorOpen(false)
  }

  // Filter items based on Search, Selected Tag, and Status Filter (for inventory tab)
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' ? true : item.status === statusFilter
    const matchesTag = selectedTag
      ? item.tags.some((t) => t.name.toLowerCase() === selectedTag.toLowerCase())
      : true

    return matchesSearch && matchesStatus && matchesTag
  })

  // Get options for the selector modal based on category/class and owned status
  const selectorOptions = items.filter(
    (item) => item.status === 'Owned' && item.wardrobe_class === selectorClass
  )

  return (
    <div className="p-6 space-y-6 animate-hud-fade font-hud">
      
      {error && (
        <div className="hud-corner-box bg-neon-red-dim border border-neon-red p-4 rounded text-neon-red font-mono text-xs relative my-2">
          <div className="hud-corner-bottom" />
          <span className="font-bold block mb-1">[SYSTEM ALERT: LINK FAILURE]</span>
          <p className="mb-3">{error}</p>
          <button
            type="button"
            onClick={() => {
              fetchData()
              if (activeTab === 'ootd') {
                fetchOutfits()
              }
            }}
            className="px-3 py-1.5 rounded bg-neon-red text-hud-bg font-bold uppercase tracking-wider text-[10px] hover:bg-hud-text-bright hover:text-neon-red transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}
      
      {/* 1. Header with Stats & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-hud-border pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-2">
            <Sparkles className="text-neon-purple w-5 h-5" />
            Wardrobe Sector (Armor)
          </h2>
          <p className="text-[9px] text-hud-text-muted uppercase tracking-widest mt-1">
            Capsule Wardrobe & OOTD Lab Canvas
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-hud-panel p-1 rounded border border-hud-border self-start">
          <button
            onClick={() => setActiveTab('vault')}
            className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === 'vault'
                ? 'bg-neon-purple-dim text-neon-purple border border-neon-purple/30'
                : 'text-hud-text-muted hover:text-hud-text-bright'
            }`}
          >
            Armor Vault
          </button>
          <button
            onClick={() => setActiveTab('ootd')}
            className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === 'ootd'
                ? 'bg-neon-purple-dim text-neon-purple border border-neon-purple/30'
                : 'text-hud-text-muted hover:text-hud-text-bright'
            }`}
          >
            OOTD Combos Lab
          </button>
        </div>
      </div>

      {/* TAB A: ARMOR VAULT */}
      {activeTab === 'vault' && (
        <>
          {/* 2. Controls: Search and Status Tabs */}
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-hud-text-muted" />
              <input
                type="text"
                placeholder="search wardrobe items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-hud-panel border border-hud-border rounded pl-10 pr-4 py-2.5 text-sm text-hud-text-bright placeholder-hud-text-muted/50 focus:outline-none focus:border-neon-purple transition-colors font-sans"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex bg-hud-panel p-1 rounded border border-hud-border">
              {(['All', 'Owned', 'Wishlist'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer text-center ${
                    statusFilter === status
                      ? 'bg-neon-purple-dim text-neon-purple border border-neon-purple/30'
                      : 'text-hud-text-muted hover:text-hud-text-bright'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Faceted Tag Filters (Flat Classification) */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-hud-text-muted flex items-center gap-1 font-mono">
                <TagIcon className="w-3 h-3" />
                Elemental Filters (Tags)
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all duration-300 cursor-pointer ${
                    selectedTag === null
                      ? 'bg-neon-purple-dim text-neon-purple border-neon-purple'
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
                          ? 'bg-neon-purple-dim text-neon-purple border-neon-purple'
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
              Downloading wardrobe grid assets...
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
              <Layers className="w-8 h-8 opacity-40 text-neon-purple" />
              <span className="text-xs font-medium">No wardrobe assets matching filters found in vault.</span>
            </div>
          )}
        </>
      )}

      {/* TAB B: OOTD COMBOS LAB */}
      {activeTab === 'ootd' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Mixer Canvas (8 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="hud-corner-box bg-hud-panel border-hud-border p-5 rounded relative">
              <div className="hud-corner-bottom" />
              
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-hud-border/50">
                <span className="text-[10px] uppercase font-bold text-neon-purple tracking-widest flex items-center gap-1.5 font-mono">
                  <RefreshCw className="w-3.5 h-3.5" />
                  OOTD Mixer HUD
                </span>
                <button
                  onClick={handleAutoRecommend}
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neon-cyan bg-neon-cyan-dim border border-neon-cyan/40 rounded hover:bg-neon-cyan hover:text-hud-bg transition-all flex items-center gap-1 cursor-pointer font-mono"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-Armor Recommended
                </button>
              </div>

              {/* Recommendation Reason Bar */}
              {matchReason && (
                <div className="bg-neon-cyan-dim/10 border border-neon-cyan/35 text-neon-cyan text-[10px] p-2.5 rounded mb-4 font-mono flex gap-1.5 items-start">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>[Mixer AI Log]: {matchReason}</span>
                </div>
              )}

              {/* Slots Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* 1. TOP SLOT */}
                <div 
                  onClick={() => openSelector('Top')}
                  className={`border rounded p-3 h-28 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:border-neon-purple bg-hud-bg/40 relative ${
                    selectedTop ? 'border-neon-purple/60' : 'border-dashed border-hud-border/60'
                  }`}
                >
                  <span className="text-[8px] uppercase tracking-widest text-hud-text-muted font-mono absolute top-2 left-3">Armor [Top]</span>
                  <div className="flex flex-col items-center justify-center h-full mt-2">
                    {selectedTop ? (
                      <>
                        <span className="text-xs font-bold text-hud-text-bright text-center line-clamp-2 px-2">{selectedTop.name}</span>
                        {selectedTop.dominant_color && (
                          <div className="w-4 h-4 rounded-full border border-hud-panel mt-1" style={{ backgroundColor: selectedTop.dominant_color }} />
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-hud-text-muted font-mono uppercase tracking-wider">Empty Slot</span>
                    )}
                  </div>
                </div>

                {/* 2. BOTTOM SLOT */}
                <div 
                  onClick={() => openSelector('Bottom')}
                  className={`border rounded p-3 h-28 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:border-neon-purple bg-hud-bg/40 relative ${
                    selectedBottom ? 'border-neon-purple/60' : 'border-dashed border-hud-border/60'
                  }`}
                >
                  <span className="text-[8px] uppercase tracking-widest text-hud-text-muted font-mono absolute top-2 left-3">Armor [Bottom]</span>
                  <div className="flex flex-col items-center justify-center h-full mt-2">
                    {selectedBottom ? (
                      <>
                        <span className="text-xs font-bold text-hud-text-bright text-center line-clamp-2 px-2">{selectedBottom.name}</span>
                        {selectedBottom.dominant_color && (
                          <div className="w-4 h-4 rounded-full border border-hud-panel mt-1" style={{ backgroundColor: selectedBottom.dominant_color }} />
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-hud-text-muted font-mono uppercase tracking-wider">Empty Slot</span>
                    )}
                  </div>
                </div>

                {/* 3. OUTER SLOT */}
                <div 
                  onClick={() => openSelector('Outer')}
                  className={`border rounded p-3 h-28 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:border-neon-purple bg-hud-bg/40 relative ${
                    selectedOuter ? 'border-neon-purple/60' : 'border-dashed border-hud-border/60'
                  }`}
                >
                  <span className="text-[8px] uppercase tracking-widest text-hud-text-muted font-mono absolute top-2 left-3">Armor [Outer]</span>
                  <div className="flex flex-col items-center justify-center h-full mt-2">
                    {selectedOuter ? (
                      <>
                        <span className="text-xs font-bold text-hud-text-bright text-center line-clamp-2 px-2">{selectedOuter.name}</span>
                        {selectedOuter.dominant_color && (
                          <div className="w-4 h-4 rounded-full border border-hud-panel mt-1" style={{ backgroundColor: selectedOuter.dominant_color }} />
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-hud-text-muted font-mono uppercase tracking-wider">Empty Slot</span>
                    )}
                  </div>
                </div>

                {/* 4. SHOES SLOT */}
                <div 
                  onClick={() => openSelector('Shoes')}
                  className={`border rounded p-3 h-28 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:border-neon-purple bg-hud-bg/40 relative ${
                    selectedShoes ? 'border-neon-purple/60' : 'border-dashed border-hud-border/60'
                  }`}
                >
                  <span className="text-[8px] uppercase tracking-widest text-hud-text-muted font-mono absolute top-2 left-3">Armor [Shoes]</span>
                  <div className="flex flex-col items-center justify-center h-full mt-2">
                    {selectedShoes ? (
                      <>
                        <span className="text-xs font-bold text-hud-text-bright text-center line-clamp-2 px-2">{selectedShoes.name}</span>
                        {selectedShoes.dominant_color && (
                          <div className="w-4 h-4 rounded-full border border-hud-panel mt-1" style={{ backgroundColor: selectedShoes.dominant_color }} />
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-hud-text-muted font-mono uppercase tracking-wider">Empty Slot</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTop(null)
                    setSelectedBottom(null)
                    setSelectedOuter(null)
                    setSelectedShoes(null)
                    setMatchReason(null)
                  }}
                  className="text-[10px] font-mono uppercase text-hud-text-muted hover:text-neon-red transition-colors cursor-pointer"
                >
                  [Reset Canvas]
                </button>
              </div>
            </div>

            {/* Save Loadout Form */}
            <div className="hud-corner-box bg-hud-panel border-hud-border p-4 rounded relative">
              <div className="hud-corner-bottom" />
              
              <form onSubmit={handleSaveOutfit} className="space-y-3">
                <label className="block text-[10px] uppercase tracking-wider text-hud-text-muted font-mono">
                  Register Loadout Blueprint (Outfit Name)
                </label>
                
                {outfitError && (
                  <span className="block text-[10px] font-mono text-neon-red">[Alert]: {outfitError}</span>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Urban Techwear Explorer..."
                    value={outfitName}
                    onChange={(e) => setOutfitName(e.target.value)}
                    className="flex-1 bg-hud-bg border border-hud-border rounded px-3 py-2 text-xs text-hud-text-bright placeholder-hud-text-muted/40 focus:outline-none focus:border-neon-purple transition-colors font-sans"
                  />
                  <button
                    type="submit"
                    disabled={savingOutfit}
                    className="bg-neon-purple-dim border border-neon-purple text-neon-purple hover:bg-neon-purple hover:text-hud-bg transition-all px-4 py-2 text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingOutfit ? 'Syncing...' : 'Save Blueprint'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Saved Blueprint Setups (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs uppercase tracking-widest text-hud-text-muted font-mono flex items-center gap-1 border-b border-hud-border/40 pb-2">
              <Layers className="w-4 h-4" />
              Registered Blueprints ({savedOutfits.length})
            </h3>

            {outfitsLoading ? (
              <div className="text-center py-10 text-[10px] text-hud-text-muted font-mono animate-pulse">
                Decrypting loadout databases...
              </div>
            ) : savedOutfits.length > 0 ? (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {savedOutfits.map((outfit) => (
                  <div 
                    key={outfit.id} 
                    className="border border-hud-border bg-hud-panel/40 p-3 rounded hover:border-neon-purple/40 transition-colors relative group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-hud-text-bright tracking-wide mb-1.5">{outfit.name}</h4>
                        <span className="text-[8px] font-mono text-hud-text-muted">
                          Registered: {new Date(outfit.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {/* Delete Outfit Button */}
                      <button
                        onClick={() => handleDeleteOutfit(outfit.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-neon-red-dim hover:text-neon-red text-hud-text-muted cursor-pointer"
                        title="Delete Blueprint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Miniature Item Icons List */}
                    <div className="flex flex-wrap gap-1.5 mt-3 border-t border-hud-border/20 pt-2">
                      {outfit.items.map((item) => (
                        <span 
                          key={item.id} 
                          className="inline-flex items-center gap-1 text-[9px] font-mono text-hud-text-muted bg-hud-bg/80 border border-hud-border/50 px-1.5 py-0.5 rounded"
                          title={`${item.wardrobe_class}: ${item.name}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.dominant_color || '#cccccc' }} />
                          {item.name.substring(0, 15)}...
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-hud-border/45 rounded flex flex-col items-center gap-1.5 text-hud-text-muted">
                <Layers className="w-6 h-6 opacity-30 text-neon-purple" />
                <span className="text-[10px] font-mono">No loadout blueprints registered in sector.</span>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 5. ITEM SELECTOR POPUP MODAL */}
      {isSelectorOpen && (
        <div className="fixed inset-0 z-[100] bg-hud-bg/85 backdrop-blur-sm flex items-center justify-center p-4 font-hud">
          <div className="w-full max-w-md hud-corner-box bg-hud-panel border-hud-border p-5 rounded relative shadow-2xl max-h-[80vh] flex flex-col">
            <div className="hud-corner-bottom" />
            
            <div className="mb-4 border-b border-hud-border pb-2 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-hud-text-bright tracking-wider uppercase">
                  Select {selectorClass} Armor Piece
                </h4>
                <p className="text-[8px] text-hud-text-muted uppercase tracking-widest mt-0.5">
                  Loadout Sector Selector Protocol
                </p>
              </div>
              <button 
                onClick={() => setIsSelectorOpen(false)}
                className="text-hud-text-muted hover:text-neon-red text-xs uppercase font-mono cursor-pointer"
              >
                [ESC]
              </button>
            </div>

            {/* Selector Options list */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1 max-h-[280px]">
              {/* Option to clear slot */}
              <div 
                onClick={() => selectItemForSlot(null)}
                className="p-2.5 border border-dashed border-hud-border hover:border-neon-purple bg-hud-bg/30 rounded cursor-pointer transition-colors text-center text-xs font-mono uppercase text-hud-text-muted hover:text-hud-text"
              >
                [ Equip Nothing / Clear Slot ]
              </div>

              {selectorOptions.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => selectItemForSlot(item)}
                  className="p-2.5 border border-hud-border bg-hud-bg/10 rounded hover:border-neon-purple cursor-pointer transition-all flex justify-between items-center group"
                >
                  <div>
                    <h5 className="text-xs font-bold text-hud-text-bright group-hover:text-neon-purple transition-colors">
                      {item.name}
                    </h5>
                    {item.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {item.tags.map(t => (
                          <span key={t.id} className="text-[8px] font-mono text-neon-cyan bg-neon-cyan-dim/20 px-1 rounded">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {item.dominant_color && (
                      <div className="w-3.5 h-3.5 rounded-full border border-hud-panel" style={{ backgroundColor: item.dominant_color }} />
                    )}
                    <span className="text-[9px] font-mono text-hud-text-muted">
                      {item.rating_worth ? '⭐'.repeat(item.rating_worth) : ''}
                    </span>
                  </div>
                </div>
              ))}

              {selectorOptions.length === 0 && (
                <div className="text-center py-8 border border-dashed border-hud-border/40 rounded flex flex-col items-center gap-1 text-hud-text-muted">
                  <ShieldAlert className="w-5 h-5 text-neon-purple opacity-55" />
                  <span className="text-[10px] font-mono">No owned {selectorClass} armor in vault.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
