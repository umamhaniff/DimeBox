import React, { useEffect, useState } from 'react'
import { apiClient } from '../utils/apiClient'
import type { Item, Tag } from '../utils/durability'
import { calculateDurability } from '../utils/durability'
import { useAuth } from '../context/AuthContext'
import { Star, Tag as TagIcon, Trash2, Award, Sparkles, Layers, Plus } from 'lucide-react'

interface ProfileProps {
  refreshTrigger: number
  onInspectItem: (item: Item) => void
}

export const Profile: React.FC<ProfileProps> = ({ refreshTrigger, onInspectItem }) => {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null)

  // Cosmetic interactive stat points (Solo Leveling style)
  const [statPoints, setStatPoints] = useState(5)
  const [allocatedStats, setAllocatedStats] = useState({
    STR: 0,
    AGI: 0,
    VIT: 0,
    INT: 0,
    SEN: 0
  })
  const [systemMessage, setSystemMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [refreshTrigger])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [itemsData, tagsData] = await Promise.all([
        apiClient.get<Item[]>('/items'),
        apiClient.get<Tag[]>('/tags'),
      ])
      setItems(itemsData)
      setTags(tagsData)
    } catch (err: any) {
      console.error('Failed to fetch profile data:', err)
      setError(err.message || 'Failed to sync with the pocket dimension.')
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
  const wardrobeCount = items.filter((item) => item.status === 'Owned' && item.category === 'Wardrobe').length

  // Calculate average durability
  const totalDurability = items
    .filter((item) => item.status === 'Owned')
    .reduce((sum, item) => {
      const { percentage } = calculateDurability(item)
      return sum + percentage
    }, 0)
  const averageDurability = ownedCount > 0 ? Math.round(totalDurability / ownedCount) : 100

  // Calculate depleted / warning items for Fatigue
  const depletedCount = items.filter((item) => {
    if (item.status !== 'Owned') return false
    const { status } = calculateDurability(item)
    return status === 'warning' || status === 'depleted'
  }).length

  const fatigue = ownedCount > 0 ? Math.round((depletedCount / ownedCount) * 100) : 0

  // Calculate Bounty Gold Required: sum of prices of all wishlist items (cheapest link)
  const bountyGoldRequired = items
    .filter((item) => item.status === 'Wishlist')
    .reduce((sum, item) => {
      const cheapestLink = item.wishlist_links?.find((l) => l.is_cheapest) || item.wishlist_links?.[0]
      return sum + (cheapestLink?.price || 0)
    }, 0)

  // RPG Level calculation based on owned items
  const calculateRpgLevel = (count: number) => {
    if (count === 0) return { level: 1, title: 'Novice Nomad' }
    if (count < 5) return { level: 2, title: 'E-Rank Explorer' }
    if (count < 15) return { level: 3, title: 'C-Rank Hunter' }
    if (count < 30) return { level: 4, title: 'A-Rank Monarch' }
    return { level: 5, title: 'S-Rank Shadow Monarch' }
  }

  const rpgStats = calculateRpgLevel(ownedCount)

  // Core Stats
  const baseSTR = ownedCount * 2
  const baseAGI = wardrobeCount * 2
  const baseVIT = averageDurability
  const baseINT = legendaryItems.length * 5
  const baseSEN = wishlistCount * 3

  const handleAllocateStat = (stat: 'STR' | 'AGI' | 'VIT' | 'INT' | 'SEN') => {
    if (statPoints > 0) {
      setStatPoints((prev) => prev - 1)
      setAllocatedStats((prev) => ({ ...prev, [stat]: prev[stat] + 1 }))
      
      const statNames = { STR: 'Strength', AGI: 'Agility', VIT: 'Vitality', INT: 'Intelligence', SEN: 'Sense' }
      setSystemMessage(`[SYSTEM: ${statNames[stat]} increased by 1]`)
      setTimeout(() => setSystemMessage(null), 2000)
    }
  }

  const handleResetStats = () => {
    const totalAllocated = Object.values(allocatedStats).reduce((sum, val) => sum + val, 0)
    setStatPoints((prev) => prev + totalAllocated)
    setAllocatedStats({ STR: 0, AGI: 0, VIT: 0, INT: 0, SEN: 0 })
    setSystemMessage('[SYSTEM: Stat points have been reset]')
    setTimeout(() => setSystemMessage(null), 2000)
  }

  return (
    <div className="p-6 space-y-6 animate-hud-fade font-hud">
      
      {error && (
        <div className="hud-corner-box bg-neon-red-dim border border-neon-red p-4 rounded text-neon-red font-mono text-xs relative my-2">
          <div className="hud-corner-bottom" />
          <span className="font-bold block mb-1">[SYSTEM ALERT: LINK FAILURE]</span>
          <p className="mb-3">{error}</p>
          <button
            type="button"
            onClick={() => fetchData()}
            className="px-3 py-1.5 rounded bg-neon-red text-hud-bg font-bold uppercase tracking-wider text-[10px] hover:bg-hud-text-bright hover:text-neon-red transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Floating System Messages */}
      {systemMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-hud-panel/90 border border-neon-cyan px-4 py-2 rounded shadow-lg glow-cyan text-[10px] font-bold text-neon-cyan uppercase tracking-widest animate-bounce">
          {systemMessage}
        </div>
      )}

      {/* Responsive layout wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Column: Solo Leveling Status Screen */}
        <div className="space-y-6">
          
          {/* 1. Solo Leveling System Status Board */}
          <div className="hud-corner-box bg-hud-panel/85 border-hud-border p-5 rounded relative overflow-hidden group hover:border-neon-purple transition-all duration-300">
            <div className="hud-corner-bottom" />
            <div className="absolute -right-20 -top-20 w-48 h-48 bg-neon-purple/5 rounded-full blur-3xl" />
            
            {/* Header */}
            <div className="flex justify-between items-center mb-5 border-b border-hud-border/50 pb-3">
              <span className="text-[10px] text-neon-purple font-bold tracking-widest uppercase">STATUS WINDOW</span>
              <span className="text-[9px] text-hud-text-muted font-mono uppercase tracking-widest font-bold">SYSTEM INTERFACE</span>
            </div>

            {/* Character Info */}
            <div className="grid grid-cols-2 gap-4 mb-5 font-mono">
              <div className="space-y-1">
                <span className="text-[10px] text-hud-text-muted uppercase">NAME:</span>
                <span className="text-sm font-bold text-hud-text-bright block truncate uppercase">
                  {user?.email?.split('@')[0] ?? 'HUNTER'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-hud-text-muted uppercase">TITLE:</span>
                <span className="text-sm font-bold text-neon-cyan glow-text-cyan block uppercase">
                  {rpgStats.title}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-hud-text-muted uppercase">LEVEL:</span>
                <span className="text-lg font-black text-neon-purple glow-text-purple block">
                  {rpgStats.level}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-hud-text-muted uppercase">FATIGUE:</span>
                <span className={`text-lg font-black block ${fatigue > 50 ? 'text-neon-red' : 'text-neon-green'}`}>
                  {fatigue}
                </span>
              </div>
            </div>

            {/* Core Stats Table */}
            <div className="border-t border-hud-border/40 pt-4 space-y-3 font-mono">
              <div className="flex justify-between items-center text-xs">
                <span className="text-hud-text-muted uppercase tracking-wider">Strength (STR)</span>
                <div className="flex items-center gap-3">
                  <span className="text-hud-text-bright font-bold">{baseSTR + allocatedStats.STR}</span>
                  <button 
                    disabled={statPoints === 0}
                    onClick={() => handleAllocateStat('STR')}
                    className="p-1 rounded border border-neon-cyan/30 bg-neon-cyan-dim/10 text-neon-cyan hover:bg-neon-cyan hover:text-hud-bg transition-all disabled:opacity-20 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-hud-text-muted uppercase tracking-wider">Agility (AGI)</span>
                <div className="flex items-center gap-3">
                  <span className="text-hud-text-bright font-bold">{baseAGI + allocatedStats.AGI}</span>
                  <button 
                    disabled={statPoints === 0}
                    onClick={() => handleAllocateStat('AGI')}
                    className="p-1 rounded border border-neon-cyan/30 bg-neon-cyan-dim/10 text-neon-cyan hover:bg-neon-cyan hover:text-hud-bg transition-all disabled:opacity-20 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-hud-text-muted uppercase tracking-wider">Vitality (VIT)</span>
                <div className="flex items-center gap-3">
                  <span className="text-hud-text-bright font-bold">{baseVIT + allocatedStats.VIT}</span>
                  <button 
                    disabled={statPoints === 0}
                    onClick={() => handleAllocateStat('VIT')}
                    className="p-1 rounded border border-neon-cyan/30 bg-neon-cyan-dim/10 text-neon-cyan hover:bg-neon-cyan hover:text-hud-bg transition-all disabled:opacity-20 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-hud-text-muted uppercase tracking-wider">Intelligence (INT)</span>
                <div className="flex items-center gap-3">
                  <span className="text-hud-text-bright font-bold">{baseINT + allocatedStats.INT}</span>
                  <button 
                    disabled={statPoints === 0}
                    onClick={() => handleAllocateStat('INT')}
                    className="p-1 rounded border border-neon-cyan/30 bg-neon-cyan-dim/10 text-neon-cyan hover:bg-neon-cyan hover:text-hud-bg transition-all disabled:opacity-20 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-hud-text-muted uppercase tracking-wider">Sense (SEN)</span>
                <div className="flex items-center gap-3">
                  <span className="text-hud-text-bright font-bold">{baseSEN + allocatedStats.SEN}</span>
                  <button 
                    disabled={statPoints === 0}
                    onClick={() => handleAllocateStat('SEN')}
                    className="p-1 rounded border border-neon-cyan/30 bg-neon-cyan-dim/10 text-neon-cyan hover:bg-neon-cyan hover:text-hud-bg transition-all disabled:opacity-20 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Stat Points Allocation HUD */}
            <div className="border-t border-hud-border/40 mt-5 pt-4 flex justify-between items-center">
              <div className="font-mono text-xs text-neon-yellow">
                Remaining Points: <span className="font-bold">{statPoints}</span>
              </div>
              <button
                onClick={handleResetStats}
                className="text-[9px] font-mono uppercase text-hud-text-muted hover:text-neon-red cursor-pointer border border-hud-border hover:border-neon-red px-2.5 py-1 rounded bg-hud-bg/50 transition-all"
              >
                Reset Points
              </button>
            </div>
          </div>

          {/* 2. Global Tag Classification */}
          <div className="hud-corner-box bg-hud-panel border-hud-border p-5 rounded relative">
            <div className="hud-corner-bottom" />
            <div className="flex justify-between items-center mb-4 border-b border-hud-border pb-2.5">
              <h3 className="text-xs font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-1.5 font-hud">
                <TagIcon className="w-4 h-4 text-neon-cyan animate-pulse" />
                Global Tag Classification
              </h3>
              <span className="text-[9px] text-hud-text-muted font-mono uppercase tracking-widest font-bold">ELEMENTS</span>
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
                    className="bg-hud-bg/50 border border-hud-border px-3 py-2 rounded flex justify-between items-center text-xs font-mono hover:border-neon-cyan transition-colors"
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
                <span className="text-xs font-medium font-sans">No custom tags defined yet.</span>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Treasury & S-Class items */}
        <div className="space-y-6">
          
          {/* 3. Treasury & Bounty Analytics */}
          <div className="hud-corner-box bg-hud-panel border-hud-border p-5 rounded relative overflow-hidden">
            <div className="hud-corner-bottom" />
            <div className="flex justify-between items-center mb-4 border-b border-hud-border pb-2.5">
              <h3 className="text-xs font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-1.5 font-hud">
                <Award className="w-4 h-4 text-neon-yellow animate-pulse" />
                Treasury & Bounty Analytics
              </h3>
              <span className="text-[9px] text-hud-text-muted font-mono uppercase tracking-widest font-bold">GOLD SUPPLY</span>
            </div>

            <div className="space-y-4">
              {/* Bounty Gold Required */}
              <div className="bg-hud-bg/50 border border-hud-border p-3.5 rounded flex justify-between items-center gap-4 hover:border-neon-yellow/30 transition-colors">
                <div>
                  <span className="text-[9px] text-hud-text-muted uppercase tracking-wider block font-mono">Bounty Gold Required (Target Dana)</span>
                  <span className="text-base font-bold text-neon-yellow font-mono mt-0.5 block glow-text-yellow">
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
              <div className="bg-hud-bg/50 border border-hud-border p-3.5 rounded hover:border-neon-green/30 transition-colors">
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
                <div className="w-full bg-hud-bg h-1.5 rounded-full overflow-hidden border border-hud-border">
                  <div 
                    className="bg-neon-green h-full rounded-full transition-all duration-500" 
                    style={{ width: `${ownedCount > 0 ? (legendaryItems.length / ownedCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Legendary Investment Matrix (Rating 5 items) */}
          <div className="hud-corner-box bg-hud-panel border-hud-border p-5 rounded relative overflow-hidden">
            <div className="hud-corner-bottom" />
            <div className="flex justify-between items-center mb-4 border-b border-hud-border pb-2.5">
              <h3 className="text-xs font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-1.5 font-hud">
                <Sparkles className="w-4 h-4 text-neon-yellow animate-pulse" />
                Legendary S-Class Inventory
              </h3>
              <span className="text-[9px] text-hud-text-muted font-mono uppercase tracking-widest">S-CLASS</span>
            </div>

            {loading ? (
              <div className="text-center py-6 text-xs text-hud-text-muted animate-pulse font-mono">
                Scanning S-Class database...
              </div>
            ) : legendaryItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {legendaryItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onInspectItem(item)}
                    className="bg-hud-bg/40 border border-hud-border hover:border-neon-yellow p-3 rounded flex justify-between items-center cursor-pointer transition-all group hover:scale-[1.01]"
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-hud-text-bright block group-hover:text-neon-yellow transition-colors truncate max-w-[200px]">
                        {item.name}
                      </span>
                      <span className="text-[9px] uppercase font-mono text-hud-text-muted">
                        Class: {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="flex text-neon-yellow">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-neon-yellow text-neon-yellow" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-hud-border/40 rounded flex flex-col items-center gap-2 text-hud-text-muted font-sans">
                <Layers className="w-7 h-7 opacity-30 text-neon-yellow" />
                <span className="text-xs font-medium">No S-Class (5-Star Worth) assets registered in vault.</span>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  )
}
