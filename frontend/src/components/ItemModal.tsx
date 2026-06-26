import React, { useState, useEffect } from 'react'
import type { Item, Tag } from '../utils/durability'
import { apiClient } from '../utils/apiClient'

import { X, Plus, Tag as TagIcon, Sparkles } from 'lucide-react'

interface ItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  itemToEdit?: Item | null
}

export const ItemModal: React.FC<ItemModalProps> = ({ isOpen, onClose, onSave, itemToEdit }) => {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<'Wardrobe' | 'Gear' | 'Toiletries'>('Wardrobe')
  const [status, setStatus] = useState<'Owned' | 'Wishlist'>('Owned')
  const [imageUrl, setImageUrl] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [ratingWorth, setRatingWorth] = useState<number>(3)
  const [review, setReview] = useState('')
  const [dominantColor, setDominantColor] = useState('#000000')
  const [expiryReminderMonths, setExpiryReminderMonths] = useState<number>(12)
  const [wardrobeClass, setWardrobeClass] = useState<'Top' | 'Bottom' | 'Outer' | 'Shoes'>('Top')
  
  // Tag management
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [tagLoading, setTagLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1. Fetch tags belonging to the user
  useEffect(() => {
    if (isOpen) {
      fetchTags()
    }
  }, [isOpen])

  // 2. Set form values when editing
  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name)
      setCategory(itemToEdit.category)
      setStatus(itemToEdit.status)
      setImageUrl(itemToEdit.image_url ?? '')
      setPurchaseDate(itemToEdit.purchase_date ?? '')
      setRatingWorth(itemToEdit.rating_worth ?? 3)
      setReview(itemToEdit.review ?? '')
      setDominantColor(itemToEdit.dominant_color ?? '#000000')
      setExpiryReminderMonths(itemToEdit.expiry_reminder_months ?? 12)
      setWardrobeClass(itemToEdit.wardrobe_class ?? 'Top')
      setSelectedTagIds(itemToEdit.tags.map((t) => t.id))
    } else {
      // Reset form
      setName('')
      setCategory('Wardrobe')
      setStatus('Owned')
      setImageUrl('')
      setPurchaseDate(new Date().toISOString().split('T')[0])
      setRatingWorth(3)
      setReview('')
      setDominantColor('#00f0ff')
      setExpiryReminderMonths(12)
      setWardrobeClass('Top')
      setSelectedTagIds([])
    }
    setError(null)
  }, [itemToEdit, isOpen])

  const fetchTags = async () => {
    try {
      const tags = await apiClient.get<Tag[]>('/tags')
      setAllTags(tags)
    } catch (err) {
      console.error('Failed to fetch tags:', err)
    }
  }

  const handleCreateTag = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) return
    setTagLoading(true)
    setError(null)
    
    try {
      const newTag = await apiClient.post<Tag>('/tags', { name: newTagName.trim() })
      setAllTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedTagIds((prev) => [...prev, newTag.id])
      setNewTagName('')
    } catch (err: any) {
      setError(err.message || 'Failed to create tag.')
    } finally {
      setTagLoading(false)
    }
  }

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveLoading(true)
    setError(null)

    const payload = {
      name: name.trim(),
      category,
      status,
      image_url: imageUrl.trim() || null,
      purchase_date: status === 'Owned' ? purchaseDate || null : null,
      rating_worth: status === 'Owned' ? ratingWorth : null,
      review: status === 'Owned' ? review.trim() || null : null,
      dominant_color: dominantColor || null,
      expiry_reminder_months: category === 'Toiletries' ? expiryReminderMonths : null,
      wardrobe_class: category === 'Wardrobe' ? wardrobeClass : null,
      tag_ids: selectedTagIds,
    }

    try {
      if (itemToEdit) {
        await apiClient.patch(`/items/${itemToEdit.id}`, payload)
      } else {
        await apiClient.post('/items', payload)
      }
      onSave()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save item.')
    } finally {
      setSaveLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-hud-bg/80 backdrop-blur-sm flex items-center justify-center p-4 font-hud overflow-y-auto">
      {/* Container Box */}
      <div className="w-full max-w-lg hud-corner-box bg-hud-panel border-hud-border p-6 rounded relative my-8 shadow-2xl animate-hud-fade">
        <div className="hud-corner-bottom" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-hud-text-muted hover:text-neon-cyan transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="mb-6 border-b border-hud-border pb-3">
          <h2 className="text-lg font-bold text-hud-text-bright tracking-wider uppercase flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neon-cyan" />
            {itemToEdit ? 'Inspect & Edit Equipment' : 'Register New Equipment'}
          </h2>
          <p className="text-[10px] text-hud-text-muted uppercase tracking-widest mt-1">
            DimeBox Vault Registry Protocol
          </p>
        </div>

        {error && (
          <div className="bg-neon-red-dim border border-neon-red text-neon-red text-xs p-3 rounded mb-5 font-mono">
            [System Alert]: {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Item Name */}
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-hud-text-muted">
              Equipment Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Arc'teryx Beta LT Jacket"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-hud-bg border border-hud-border rounded px-3 py-2 text-sm text-hud-text-bright placeholder-hud-text-muted/50 focus:outline-none focus:border-neon-cyan transition-colors font-sans"
            />
          </div>

          {/* Category and Status Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-hud-text-muted">
                Category Class
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-hud-bg border border-hud-border rounded px-3 py-2 text-sm text-hud-text-bright focus:outline-none focus:border-neon-cyan transition-colors"
              >
                <option value="Wardrobe">Wardrobe (Armor)</option>
                <option value="Gear">Gear (Equipment)</option>
                <option value="Toiletries">Toiletries (Consumable)</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-hud-text-muted">
                Dimension Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-hud-bg border border-hud-border rounded px-3 py-2 text-sm text-hud-text-bright focus:outline-none focus:border-neon-cyan transition-colors"
              >
                <option value="Owned">Owned (In-Inventory)</option>
                <option value="Wishlist">Wishlist (Locked)</option>
              </select>
            </div>
          </div>

          {/* Conditionally Render: Wardrobe Class */}
          {category === 'Wardrobe' && (
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-hud-text-muted">
                Wardrobe Type (Armor Slot)
              </label>
              <select
                value={wardrobeClass}
                onChange={(e) => setWardrobeClass(e.target.value as any)}
                className="w-full bg-hud-bg border border-hud-border rounded px-3 py-2 text-sm text-hud-text-bright focus:outline-none focus:border-neon-cyan transition-colors"
              >
                <option value="Top">Top (Atasan)</option>
                <option value="Bottom">Bottom (Bawahan)</option>
                <option value="Outer">Outer (Luaran)</option>
                <option value="Shoes">Shoes (Alas Kaki)</option>
              </select>
            </div>
          )}

          {/* Image URL */}
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-hud-text-muted">
              Visual Scan URL (Photo Link)
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/... (optional)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-hud-bg border border-hud-border rounded px-3 py-2 text-sm text-hud-text-bright placeholder-hud-text-muted/30 focus:outline-none focus:border-neon-cyan transition-colors font-sans"
            />
          </div>

          {/* Conditionally Render: Toiletries Lifespan */}
          {category === 'Toiletries' && (
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-hud-text-muted">
                Expiry Lifespan (Months)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                required
                value={expiryReminderMonths}
                onChange={(e) => setExpiryReminderMonths(parseInt(e.target.value))}
                className="w-full bg-hud-bg border border-hud-border rounded px-3 py-2 text-sm text-hud-text-bright focus:outline-none focus:border-neon-cyan transition-colors font-mono"
              />
            </div>
          )}

          {/* Conditionally Render: Owned Details */}
          {status === 'Owned' && (
            <div className="border border-hud-border bg-hud-bg/30 p-3 rounded space-y-3">
              <span className="text-[10px] uppercase font-bold text-neon-cyan tracking-wider block border-b border-hud-border pb-1">
                Acquisition logs
              </span>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Purchase Date */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-hud-text-muted">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-hud-bg border border-hud-border rounded px-3 py-1.5 text-sm text-hud-text-bright focus:outline-none focus:border-neon-cyan transition-colors font-sans"
                  />
                </div>

                {/* Rating Worth */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-hud-text-muted">
                    Worth Rating (1-5)
                  </label>
                  <select
                    value={ratingWorth}
                    onChange={(e) => setRatingWorth(parseInt(e.target.value))}
                    className="w-full bg-hud-bg border border-hud-border rounded px-3 py-1.5 text-sm text-hud-text-bright focus:outline-none focus:border-neon-cyan transition-colors font-mono"
                  >
                    <option value="1">⭐ (Common / Low value)</option>
                    <option value="2">⭐⭐ (Uncommon)</option>
                    <option value="3">⭐⭐⭐ (Rare / Worth-it)</option>
                    <option value="4">⭐⭐⭐⭐ (Epic / High Value)</option>
                    <option value="5">⭐⭐⭐⭐⭐ (Legendary Invest)</option>
                  </select>
                </div>
              </div>

              {/* Review */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-hud-text-muted">
                  Performance Review
                </label>
                <textarea
                  placeholder="brief review of item performance after usage..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="w-full bg-hud-bg border border-hud-border rounded px-3 py-2 text-xs text-hud-text-bright placeholder-hud-text-muted/30 focus:outline-none focus:border-neon-cyan transition-colors font-sans h-16 resize-none"
                />
              </div>
            </div>
          )}

          {/* Aesthetic Grid: Color Selector */}
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-hud-text-muted">
              Dominant Color Accent (For OOTD Matching)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={dominantColor}
                onChange={(e) => setDominantColor(e.target.value)}
                className="w-10 h-10 bg-hud-bg border border-hud-border rounded p-1 cursor-pointer"
              />
              <input
                type="text"
                value={dominantColor}
                onChange={(e) => setDominantColor(e.target.value)}
                placeholder="#00f0ff"
                className="bg-hud-bg border border-hud-border rounded px-3 py-2 text-sm text-hud-text-bright focus:outline-none focus:border-neon-cyan transition-colors font-mono w-32"
              />
            </div>
          </div>

          {/* Tagging HUD Section */}
          <div className="space-y-2 border-t border-hud-border pt-3">
            <label className="block text-[11px] uppercase tracking-wider text-hud-text-muted flex items-center gap-1">
              <TagIcon className="w-3.5 h-3.5" />
              Elemental Tags
            </label>

            {/* Existing Tags Grid */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-hud-border/30 rounded bg-hud-bg/10">
              {allTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id)
                return (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    className={`px-2 py-1 rounded text-[10px] font-mono border transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'bg-neon-cyan-dim text-neon-cyan border-neon-cyan'
                        : 'bg-hud-bg border-hud-border text-hud-text-muted hover:border-hud-text-bright hover:text-hud-text-bright'
                    }`}
                  >
                    {tag.name}
                  </button>
                )
              })}
              {allTags.length === 0 && (
                <span className="text-[10px] text-hud-text-muted p-1 italic">No tags in sector vault</span>
              )}
            </div>

            {/* Create New Tag */}
            <div className="flex gap-2 items-center mt-2">
              <input
                type="text"
                placeholder="add new tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="bg-hud-bg border border-hud-border rounded px-2.5 py-1 text-xs text-hud-text-bright placeholder-hud-text-muted/40 focus:outline-none focus:border-neon-cyan transition-colors font-mono flex-1"
              />
              <button
                type="button"
                disabled={tagLoading}
                onClick={handleCreateTag}
                className="bg-neon-cyan-dim border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-hud-bg transition-colors px-3 py-1 text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 border-t border-hud-border pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded bg-hud-bg border border-hud-border text-hud-text-muted text-xs font-bold uppercase tracking-wider hover:text-hud-text-bright hover:border-hud-text-bright transition-colors cursor-pointer text-center"
            >
              Abrot Protocol
            </button>
            
            <button
              type="submit"
              disabled={saveLoading}
              className="flex-1 py-2.5 rounded bg-neon-cyan-dim border border-neon-cyan text-neon-cyan text-xs font-bold uppercase tracking-wider hover:bg-neon-cyan hover:text-hud-bg transition-all glow-cyan cursor-pointer text-center"
            >
              {saveLoading ? 'Syncing...' : 'Confirm Sync'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
