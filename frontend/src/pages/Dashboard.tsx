import React, { useEffect, useState } from 'react'
import { apiClient } from '../utils/apiClient'
import type { Item } from '../utils/durability'
import { calculateDurability } from '../utils/durability'
import { QuestModal } from '../components/QuestModal'
import type { Trip } from '../components/QuestModal'

import { Layers, ShieldAlert, Sparkles, TrendingUp, Heart, ShoppingBag, Plus } from 'lucide-react'

interface DashboardProps {
  onAddItem: () => void
  onInspectItem: (item: Item) => void
}

export const Dashboard: React.FC<DashboardProps> = ({ onAddItem, onInspectItem }) => {
  const [items, setItems] = useState<Item[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [itemsData, tripsData] = await Promise.all([
        apiClient.get<Item[]>('/items'),
        apiClient.get<Trip[]>('/trips')
      ])
      setItems(itemsData)
      setTrips(tripsData)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const ownedItems = items.filter((item) => item.status === 'Owned')
  const wishlistItems = items.filter((item) => item.status === 'Wishlist')
  
  // Calculate low durability items
  const lowDurabilityItems = ownedItems.filter((item) => {
    const { status } = calculateDurability(item)
    return status === 'warning' || status === 'depleted'
  })

  // RPG Level calculation based on owned items
  const calculateRpgLevel = (count: number) => {
    if (count === 0) return { level: 1, title: 'Novice Nomad' }
    if (count < 5) return { level: 2, title: 'Minimalist Explorer' }
    if (count < 15) return { level: 3, title: 'Vault Keeper' }
    if (count < 30) return { level: 4, title: 'Dimension Hoarder' }
    return { level: 5, title: 'Infinite Master Collector' }
  }

  const rpgStats = calculateRpgLevel(ownedItems.length)

  return (
    <div className="p-6 space-y-6 animate-hud-fade font-hud">
      
      {/* 1. RPG Status Board */}
      <div className="hud-corner-box bg-hud-panel border-hud-border p-5 rounded relative flex items-center justify-between overflow-hidden">
        <div className="hud-corner-bottom" />
        {/* Glowing background accent */}
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-neon-cyan/5 rounded-full blur-2xl" />
        
        <div className="space-y-1.5 relative z-10">
          <span className="text-[10px] text-neon-cyan font-bold tracking-widest uppercase">Explorer Status Board</span>
          <h2 className="text-2xl font-bold text-hud-text-bright tracking-wide glow-text-cyan">
            LEVEL {rpgStats.level}
          </h2>
          <p className="text-xs text-hud-text-muted font-mono uppercase tracking-wider">
            Class: <span className="text-hud-text-bright">{rpgStats.title}</span>
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-hud-text-muted block uppercase tracking-widest">Experience</span>
          <span className="text-sm font-mono font-bold text-hud-text-bright">
            {ownedItems.length} <span className="text-hud-text-muted">/</span> {rpgStats.level * 15} items
          </span>
          {/* Progress bar */}
          <div className="w-24 bg-hud-bg h-1 rounded-full overflow-hidden border border-hud-border mt-1.5">
            <div 
              className="bg-neon-cyan h-full rounded-full" 
              style={{ width: `${Math.min(100, (ownedItems.length / (rpgStats.level * 15)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Grid Statistics */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Owned Card */}
        <div className="hud-corner-box bg-hud-panel border-hud-border p-4 rounded relative flex items-center gap-3">
          <div className="hud-corner-bottom" />
          <div className="p-2.5 bg-neon-green-dim border border-neon-green/20 rounded text-neon-green">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] text-hud-text-muted uppercase tracking-wider block font-mono">Owned Vault</span>
            <span className="text-xl font-bold text-hud-text-bright font-mono">
              {loading ? '...' : ownedItems.length}
            </span>
          </div>
        </div>

        {/* Total Wishlist Card */}
        <div className="hud-corner-box bg-hud-panel border-hud-border p-4 rounded relative flex items-center gap-3">
          <div className="hud-corner-bottom" />
          <div className="p-2.5 bg-neon-yellow-dim border border-neon-yellow/20 rounded text-neon-yellow">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] text-hud-text-muted uppercase tracking-wider block font-mono">Bounties</span>
            <span className="text-xl font-bold text-hud-text-bright font-mono">
              {loading ? '...' : wishlistItems.length}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Action Hub */}
      <div className="flex gap-4">
        <button
          onClick={onAddItem}
          className="flex-1 py-3 px-4 rounded bg-neon-cyan-dim border border-neon-cyan text-neon-cyan font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-neon-cyan hover:text-hud-bg transition-all glow-cyan cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Register New Asset
        </button>
      </div>

      {/* 4. Durability Alert Center */}
      <div className="hud-corner-box bg-hud-panel border-hud-border p-5 rounded relative">
        <div className="hud-corner-bottom" />
        
        <div className="flex justify-between items-center mb-4 border-b border-hud-border pb-2.5">
          <h3 className="text-xs font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-neon-yellow" />
            Integrity Alerts ({lowDurabilityItems.length})
          </h3>
          <span className="text-[9px] text-hud-text-muted font-mono uppercase tracking-widest">System Warning</span>
        </div>

        {loading ? (
          <div className="text-center py-4 text-xs text-hud-text-muted animate-pulse font-mono">
            Scanning item integrity...
          </div>
        ) : lowDurabilityItems.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {lowDurabilityItems.map((item) => {
              const { percentage, status } = calculateDurability(item)
              return (
                <div
                  key={item.id}
                  onClick={() => onInspectItem(item)}
                  className="bg-hud-bg/50 border border-hud-border hover:border-neon-cyan p-2.5 rounded flex justify-between items-center cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-hud-text-bright block truncate max-w-[200px]">
                      {item.name}
                    </span>
                    <span className="text-[9px] uppercase font-mono text-hud-text-muted">
                      Class: {item.category}
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    <span
                      className={`text-xs font-bold ${
                        status === 'depleted' ? 'text-neon-red' : 'text-neon-yellow'
                      }`}
                    >
                      {percentage}%
                    </span>
                    <span className="block text-[9px] text-hud-text-muted uppercase tracking-wider">
                      {status === 'depleted' ? 'Replace' : 'Inspect'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-hud-border/40 rounded flex flex-col items-center gap-1.5 text-hud-text-muted">
            <Sparkles className="w-6 h-6 text-neon-green opacity-40" />
            <span className="text-xs font-medium">All systems at 100% integrity. No decay detected.</span>
          </div>
        )}
      </div>

      {/* 5. Quest Log (Packing Checklists) */}
      <div className="hud-corner-box bg-hud-panel border-hud-border p-5 rounded relative">
        <div className="hud-corner-bottom" />
        
        <div className="flex justify-between items-center mb-4 border-b border-hud-border pb-2.5">
          <h3 className="text-xs font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-1.5 font-hud">
            <TrendingUp className="w-4 h-4 text-neon-cyan animate-pulse" />
            Active Quest Logs ({trips.length})
          </h3>
          <button
            onClick={() => {
              setSelectedTrip(null)
              setIsQuestModalOpen(true)
            }}
            className="text-[9px] font-mono uppercase text-neon-cyan hover:underline cursor-pointer border border-neon-cyan/20 px-2 py-0.5 rounded bg-neon-cyan-dim/10"
          >
            [+ New Quest]
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4 text-xs text-hud-text-muted animate-pulse font-mono">
            Scanning active quest logs...
          </div>
        ) : trips.length > 0 ? (
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {trips.map((trip) => {
              const total = trip.trip_items.length
              const packed = trip.trip_items.filter((ti: any) => ti.is_packed).length
              const percent = total === 0 ? 0 : Math.round((packed / total) * 100)

              return (
                <div
                  key={trip.id}
                  onClick={() => {
                    setSelectedTrip(trip)
                    setIsQuestModalOpen(true)
                  }}
                  className="bg-hud-bg/50 border border-hud-border hover:border-neon-cyan p-3 rounded cursor-pointer transition-colors space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-hud-text-bright block truncate max-w-[200px]">
                      {trip.trip_name}
                    </span>
                    <span className="text-[9px] font-mono text-neon-cyan font-bold">
                      {percent}% ({packed}/{total})
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-hud-bg h-1.5 rounded-full overflow-hidden border border-hud-border/50">
                    <div
                      className="bg-neon-cyan h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-hud-border/40 rounded flex flex-col items-center gap-1.5 text-hud-text-muted">
            <Layers className="w-6 h-6 text-neon-cyan opacity-40" />
            <span className="text-xs font-medium">No active quest logs detected in sector.</span>
            <button
              onClick={() => {
                setSelectedTrip(null)
                setIsQuestModalOpen(true)
              }}
              className="text-[9px] font-mono uppercase text-neon-cyan mt-1 border border-neon-cyan/20 px-2 py-0.5 rounded bg-neon-cyan-dim/10 hover:bg-neon-cyan hover:text-hud-bg transition-colors"
            >
              Launch New Quest
            </button>
          </div>
        )}
      </div>

      {/* Quest Details & Creation Modal */}
      <QuestModal
        isOpen={isQuestModalOpen}
        onClose={() => setIsQuestModalOpen(false)}
        trip={selectedTrip}
        onSave={fetchDashboardData}
        allItems={items}
      />

    </div>
  )
}
