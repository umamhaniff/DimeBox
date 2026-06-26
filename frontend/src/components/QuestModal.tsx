import React, { useState, useEffect } from 'react'
import { apiClient } from '../utils/apiClient'
import type { Item } from '../utils/durability'
import { X, Plus, Trash2, CheckSquare, Square, Package, ShieldAlert, Sparkles } from 'lucide-react'

export interface TripItem {
  is_packed: boolean
  item: Item
}

export interface Trip {
  id: string
  trip_name: string
  created_at: string
  trip_items: TripItem[]
}

interface QuestModalProps {
  isOpen: boolean
  onClose: () => void
  trip: Trip | null // If null, we are in "Create" mode
  onSave: () => void
  allItems: Item[]
}

export const QuestModal: React.FC<QuestModalProps> = ({ isOpen, onClose, trip, onSave, allItems }) => {
  // Common states
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 1. Create Mode States
  const [tripName, setTripName] = useState('')
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

  // 2. View/Checklist Mode States
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null)
  const [isAddingEquipment, setIsAddingEquipment] = useState(false)

  // Only get owned items for quest packing
  const ownedItems = allItems.filter(item => item.status === 'Owned')

  // Sync active trip when prop changes
  useEffect(() => {
    if (isOpen) {
      setError(null)
      if (trip) {
        setActiveTrip(trip)
        setIsAddingEquipment(false)
      } else {
        setActiveTrip(null)
        setTripName('')
        setSelectedItemIds([])
      }
    }
  }, [trip, isOpen])

  if (!isOpen) return null

  // Calculate packing stats for active trip
  const totalItems = activeTrip?.trip_items.length ?? 0
  const packedItems = activeTrip?.trip_items.filter((ti) => ti.is_packed).length ?? 0
  const percent = totalItems === 0 ? 0 : Math.round((packedItems / totalItems) * 100)

  // Handler: Create Trip
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tripName.trim()) return

    setLoading(true)
    setError(null)

    try {
      await apiClient.post('/trips', {
        trip_name: tripName.trim(),
        item_ids: selectedItemIds,
      })
      onSave()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to initialize quest.')
    } finally {
      setLoading(false)
    }
  }

  // Handler: Toggle Packing Status
  const handleTogglePacked = async (itemId: string, currentPacked: boolean) => {
    if (!activeTrip) return

    try {
      const updatedTrip = await apiClient.patch<Trip>(
        `/trips/${activeTrip.id}/items/${itemId}`,
        { is_packed: !currentPacked }
      )
      setActiveTrip(updatedTrip)
      onSave() // Update parent list too
    } catch (err: any) {
      setError(err.message || 'Failed to update packing status.')
    }
  }

  // Handler: Remove Item from Trip
  const handleRemoveItem = async (itemId: string) => {
    if (!activeTrip) return

    try {
      const updatedTrip = await apiClient.delete<Trip>(
        `/trips/${activeTrip.id}/items/${itemId}`
      )
      setActiveTrip(updatedTrip)
      onSave()
    } catch (err: any) {
      setError(err.message || 'Failed to remove item.')
    }
  }

  // Handler: Add Items to Trip
  const handleAddItems = async (itemIds: string[]) => {
    if (!activeTrip || itemIds.length === 0) return

    setLoading(true)
    try {
      const updatedTrip = await apiClient.post<Trip>(
        `/trips/${activeTrip.id}/items`,
        itemIds
      )
      setActiveTrip(updatedTrip)
      setIsAddingEquipment(false)
      onSave()
    } catch (err: any) {
      setError(err.message || 'Failed to add equipment.')
    } finally {
      setLoading(false)
    }
  }

  // Handler: Abandon/Delete Trip
  const handleAbandonTrip = async () => {
    if (!activeTrip) return
    if (!window.confirm('Abandon this quest? All packing logs for this trip will be wiped.')) return

    setLoading(true)
    try {
      await apiClient.delete(`/trips/${activeTrip.id}`)
      onSave()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to delete quest.')
    } finally {
      setLoading(false)
    }
  }

  // Toggle item selection in Create Mode
  const handleToggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  // Items currently not in the active trip (for dynamic adding)
  const existingItemIds = new Set(activeTrip?.trip_items.map((ti) => ti.item.id) ?? [])
  const addableItems = ownedItems.filter((item) => !existingItemIds.has(item.id))

  return (
    <div className="fixed inset-0 z-50 bg-hud-bg/85 backdrop-blur-sm flex items-center justify-center p-4 font-hud overflow-y-auto">
      <div className="w-full max-w-lg hud-corner-box bg-hud-panel border-hud-border p-6 rounded relative my-8 shadow-2xl animate-hud-fade max-h-[90vh] flex flex-col">
        <div className="hud-corner-bottom" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-hud-text-muted hover:text-neon-cyan transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* MODE A: CREATE QUEST */}
        {!activeTrip ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="mb-4 border-b border-hud-border pb-3">
              <h2 className="text-lg font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-neon-cyan" />
                Initialize Quest List
              </h2>
              <p className="text-[9px] text-hud-text-muted uppercase tracking-widest mt-1">
                Pocket Dimension Quest Scaffolding Protocol
              </p>
            </div>

            {error && (
              <div className="bg-neon-red-dim border border-neon-red text-neon-red text-[10px] p-2.5 rounded mb-4 font-mono">
                [System Alert]: {error}
              </div>
            )}

            <form onSubmit={handleCreateTrip} className="space-y-4 flex-1 flex flex-col overflow-hidden">
              {/* Quest Name */}
              <div className="space-y-1 shrink-0">
                <label className="block text-[10px] uppercase tracking-wider text-hud-text-muted">
                  Quest / Trip Designation (Name)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mount Rinjani Summit Quest"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="w-full bg-hud-bg border border-hud-border rounded px-3 py-2 text-xs text-hud-text-bright placeholder-hud-text-muted/50 focus:outline-none focus:border-neon-cyan transition-colors font-sans"
                />
              </div>

              {/* Select Initial Items */}
              <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
                <label className="block text-[10px] uppercase tracking-wider text-hud-text-muted shrink-0">
                  Equip Inventory Assets to Quest
                </label>
                
                <div className="flex-1 overflow-y-auto border border-hud-border/30 rounded bg-hud-bg/10 p-2 space-y-3 pr-1">
                  {['Wardrobe', 'Gear', 'Toiletries'].map((cat) => {
                    const catItems = ownedItems.filter((i) => i.category === cat)
                    if (catItems.length === 0) return null
                    
                    return (
                      <div key={cat} className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-neon-cyan tracking-widest block border-b border-hud-border/25 pb-0.5">
                          {cat} Assets
                        </span>
                        <div className="space-y-1">
                          {catItems.map((item) => {
                            const isSelected = selectedItemIds.includes(item.id)
                            return (
                              <div
                                key={item.id}
                                onClick={() => handleToggleItemSelection(item.id)}
                                className={`p-2 border rounded text-xs transition-all duration-300 cursor-pointer flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-neon-cyan-dim border-neon-cyan text-neon-cyan'
                                    : 'bg-hud-bg/40 border-hud-border/60 text-hud-text-muted hover:border-hud-text-bright hover:text-hud-text-bright'
                                }`}
                              >
                                <span>{item.name} {item.wardrobe_class ? `[${item.wardrobe_class}]` : ''}</span>
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 shrink-0" />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {ownedItems.length === 0 && (
                    <div className="text-center py-10 text-[10px] text-hud-text-muted font-mono">
                      No owned assets available in pocket dimension inventory.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 border-t border-hud-border pt-4 mt-auto shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 rounded bg-hud-bg border border-hud-border text-hud-text-muted text-xs font-bold uppercase tracking-wider hover:text-hud-text-bright hover:border-hud-text-bright transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !tripName.trim()}
                  className="flex-1 py-2 rounded bg-neon-cyan-dim border border-neon-cyan text-neon-cyan text-xs font-bold uppercase tracking-wider hover:bg-neon-cyan hover:text-hud-bg transition-all glow-cyan cursor-pointer text-center"
                >
                  {loading ? 'Launching...' : 'Launch Quest'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* MODE B: VIEW QUEST / CHECKLIST */
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Header with progress bar */}
            <div className="mb-4 border-b border-hud-border pb-3 shrink-0">
              <h2 className="text-lg font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-2">
                <Package className="w-5 h-5 text-neon-cyan" />
                {activeTrip.trip_name}
              </h2>
              
              {/* Progress HUD */}
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-hud-text-muted uppercase tracking-wider">Quest Packing Progress</span>
                  <span className="text-neon-cyan font-bold">{percent}% ({packedItems}/{totalItems} packed)</span>
                </div>
                <div className="w-full bg-hud-bg h-2 rounded-full overflow-hidden border border-hud-border/50">
                  <div 
                    className="bg-neon-cyan h-full rounded-full transition-all duration-500" 
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-neon-red-dim border border-neon-red text-neon-red text-[10px] p-2.5 rounded mb-3 font-mono shrink-0">
                [System Alert]: {error}
              </div>
            )}

            {/* Checklist items list */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {!isAddingEquipment ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center border-b border-hud-border/30 pb-1">
                      <span className="text-[10px] uppercase font-bold text-hud-text-muted tracking-widest">
                        Equipment Checklist
                      </span>
                      <button
                        onClick={() => setIsAddingEquipment(true)}
                        className="text-[9px] font-mono uppercase text-neon-cyan hover:underline cursor-pointer"
                      >
                        [+ Add Equipment]
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {activeTrip.trip_items.map((ti) => (
                        <div 
                          key={ti.item.id}
                          className={`p-2.5 border rounded flex justify-between items-center transition-colors ${
                            ti.is_packed 
                              ? 'bg-neon-cyan-dim/5 border-neon-cyan/40 text-neon-cyan/80' 
                              : 'bg-hud-bg/30 border-hud-border text-hud-text-bright'
                          }`}
                        >
                          <div 
                            onClick={() => handleTogglePacked(ti.item.id, ti.is_packed)}
                            className="flex items-center gap-2.5 cursor-pointer flex-1"
                          >
                            {ti.is_packed ? (
                              <CheckSquare className="w-4 h-4 text-neon-cyan shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-hud-text-muted shrink-0" />
                            )}
                            <div className="space-y-0.5">
                              <span className={`text-xs font-medium block ${ti.is_packed ? 'line-through opacity-60' : ''}`}>
                                {ti.item.name}
                              </span>
                              <span className="text-[8px] uppercase font-mono text-hud-text-muted">
                                Slot: {ti.item.wardrobe_class || ti.item.category}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveItem(ti.item.id)}
                            className="p-1 text-hud-text-muted hover:text-neon-red rounded cursor-pointer ml-2"
                            title="Remove equipment slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {totalItems === 0 && (
                        <div className="text-center py-12 border border-dashed border-hud-border/30 rounded flex flex-col items-center gap-1 text-hud-text-muted">
                          <ShieldAlert className="w-5 h-5 text-neon-yellow opacity-55" />
                          <span className="text-[10px] font-mono">No equipment mapped to this quest.</span>
                          <button
                            onClick={() => setIsAddingEquipment(true)}
                            className="text-[9px] font-mono uppercase text-neon-cyan mt-1 border border-neon-cyan/20 px-2 py-0.5 rounded bg-neon-cyan-dim hover:bg-neon-cyan hover:text-hud-bg transition-colors"
                          >
                            Map Equipment Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Abandon Quest button */}
                  <div className="pt-2 flex justify-start">
                    <button
                      onClick={handleAbandonTrip}
                      disabled={loading}
                      className="text-[9px] font-mono uppercase text-neon-red hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      [Abandon / Wipe Quest]
                    </button>
                  </div>
                </>
              ) : (
                /* Dynamic Sub-View: Add Equipment to Trip */
                <div className="space-y-3 animate-hud-fade">
                  <div className="flex justify-between items-center border-b border-hud-border/30 pb-1">
                    <span className="text-[10px] uppercase font-bold text-neon-cyan tracking-widest font-mono">
                      Add Vault Equipment to Checklist
                    </span>
                    <button
                      onClick={() => setIsAddingEquipment(false)}
                      className="text-[9px] font-mono uppercase text-hud-text-muted hover:text-hud-text cursor-pointer"
                    >
                      [Cancel]
                    </button>
                  </div>

                  <div className="max-h-[250px] overflow-y-auto border border-hud-border/30 rounded bg-hud-bg/10 p-2 space-y-3">
                    {['Wardrobe', 'Gear', 'Toiletries'].map((cat) => {
                      const catItems = addableItems.filter((i) => i.category === cat)
                      if (catItems.length === 0) return null
                      
                      return (
                        <div key={cat} className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-hud-text-muted tracking-widest block border-b border-hud-border/20 pb-0.5">
                            {cat} Sector
                          </span>
                          <div className="space-y-1">
                            {catItems.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleAddItems([item.id])}
                                className="p-2 border border-hud-border/50 bg-hud-bg/30 rounded text-xs text-hud-text-bright hover:border-neon-cyan cursor-pointer flex items-center justify-between transition-colors"
                              >
                                <span>{item.name} {item.wardrobe_class ? `[${item.wardrobe_class}]` : ''}</span>
                                <Plus className="w-3.5 h-3.5 text-neon-cyan shrink-0" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {addableItems.length === 0 && (
                      <div className="text-center py-10 text-[10px] text-hud-text-muted font-mono">
                        All owned assets already mapped to this quest.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom complete action */}
            <div className="flex border-t border-hud-border pt-4 mt-4 shrink-0">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded bg-neon-cyan-dim border border-neon-cyan text-neon-cyan text-xs font-bold uppercase tracking-wider hover:bg-neon-cyan hover:text-hud-bg transition-all glow-cyan cursor-pointer text-center"
              >
                Close Checklist HUD
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
