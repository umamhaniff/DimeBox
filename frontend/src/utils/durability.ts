export interface Tag {
  id: string
  name: string
}

export interface WishlistLink {
  id: string
  item_id: string
  url_link: string
  price: number
  is_cheapest: boolean
  spec_note?: string
  created_at: string
}

export interface Item {
  id: string
  name: string
  category: 'Wardrobe' | 'Gear' | 'Toiletries'
  status: 'Owned' | 'Wishlist'
  image_url?: string
  purchase_date?: string
  rating_worth?: number
  review?: string
  dominant_color?: string
  expiry_reminder_months?: number
  wardrobe_class?: 'Top' | 'Bottom' | 'Outer' | 'Shoes'
  created_at: string
  tags: Tag[]
  wishlist_links?: WishlistLink[]
}


export interface DurabilityInfo {
  percentage: number
  status: 'optimal' | 'warning' | 'depleted'
  label: string
}

export function calculateDurability(item: Item): DurabilityInfo {
  if (item.status === 'Wishlist') {
    return { percentage: 100, status: 'optimal', label: 'Wishlist (Locked)' }
  }

  if (item.category === 'Toiletries' && item.expiry_reminder_months && item.purchase_date) {
    const purchaseDate = new Date(item.purchase_date)
    if (isNaN(purchaseDate.getTime())) {
      return { percentage: 100, status: 'optimal', label: '100% Durability (New)' }
    }
    const now = new Date()
    
    const diffTime = Math.abs(now.getTime() - purchaseDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diffMonths = diffDays / 30.4
    
    const lifespan = item.expiry_reminder_months
    const percentage = Math.max(0, Math.min(100, Math.round(((lifespan - diffMonths) / lifespan) * 100)))
    
    let status: 'optimal' | 'warning' | 'depleted' = 'optimal'
    let label = `${percentage}% Durability`
    
    if (percentage <= 0) {
      status = 'depleted'
      label = 'Depleted (Lifespan Exceeded)'
    } else if (percentage < 50) {
      status = 'warning'
      const monthsLeft = Math.max(0, Math.round(lifespan - diffMonths))
      label = `Low Durability (${monthsLeft}m left)`
    }
    
    return { percentage, status, label }
  }
  
  // For Gear/Wardrobe, durability is based on how long the item has been owned.
  // Each year of ownership reduces durability by 10% for Gear, 15% for Wardrobe.
  if (item.purchase_date) {
    const purchaseDate = new Date(item.purchase_date)
    if (isNaN(purchaseDate.getTime())) {
      return { percentage: 100, status: 'optimal', label: '100% Durability (New)' }
    }
    const now = new Date()
    const diffTime = now.getTime() - purchaseDate.getTime()
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25)
    
    const lossRate = item.category === 'Gear' ? 10 : 15
    const percentage = Math.max(30, Math.min(100, Math.round(100 - (diffYears * lossRate))))
    
    let status: 'optimal' | 'warning' | 'depleted' = 'optimal'
    if (percentage < 50) {
      status = 'warning'
    }
    
    const monthsOwned = Math.round(diffYears * 12)
    return { 
      percentage, 
      status, 
      label: `${percentage}% Durability (${monthsOwned}m owned)` 
    }
  }

  return { percentage: 100, status: 'optimal', label: '100% Durability (New)' }
}
