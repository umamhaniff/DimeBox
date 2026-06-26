import type { Item } from './durability'

interface HSL {
  h: number // 0-360
  s: number // 0-100
  l: number // 0-100
}

// Convert Hex color to HSL
export function hexToHsl(hex: string): HSL {
  // Normalize hex string
  let c = hex.replace(/^#/, '')
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
  }
  
  const r = parseInt(c.substring(0, 2), 16) / 255
  const g = parseInt(c.substring(2, 4), 16) / 255
  const b = parseInt(c.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

// Check if two colors clash in clothing aesthetics
export function checkColorClash(hex1: string, hex2: string): boolean {
  const hsl1 = hexToHsl(hex1)
  const hsl2 = hexToHsl(hex2)

  // 1. Neutral colors (White, Black, Grays, Beige, extremely dark navy) do not clash
  const isNeutral = (hsl: HSL) => {
    // Low saturation is gray/beige
    if (hsl.s < 15) return true
    // Very bright is white-ish
    if (hsl.l > 85) return true
    // Very dark is black-ish
    if (hsl.l < 15) return true
    return false
  }

  if (isNeutral(hsl1) || isNeutral(hsl2)) {
    return false // No clash with neutrals
  }

  // 2. High saturation clashing zone
  // Saturated colors with hues that are discordant (between 35 and 145 degrees apart)
  const hueDiff = Math.abs(hsl1.h - hsl2.h)
  const circularDiff = Math.min(hueDiff, 360 - hueDiff)

  if (circularDiff >= 35 && circularDiff <= 145) {
    // If both are quite vibrant, they clash
    if (hsl1.s > 45 && hsl2.s > 45) {
      return true
    }
  }

  return false
}

// OOTD Recommendation Engine:
// 1. Finds all Owned items.
// 2. Groups them by Top, Bottom, Outer, Shoes.
// 3. Matches Top & Bottom that share at least one tag AND do not color clash.
// 4. Optionally pairs with Outer and Shoes matching the theme tags.
export function recommendOutfit(items: Item[]): { 
  top?: Item
  bottom?: Item
  outer?: Item
  shoes?: Item
  matchReason?: string
} {
  // Filter only owned items
  const owned = items.filter(item => item.status === 'Owned')
  
  const tops = owned.filter(i => i.wardrobe_class === 'Top')
  const bottoms = owned.filter(i => i.wardrobe_class === 'Bottom')
  const outers = owned.filter(i => i.wardrobe_class === 'Outer')
  const shoesList = owned.filter(i => i.wardrobe_class === 'Shoes')

  if (tops.length === 0 || bottoms.length === 0) {
    return {
      matchReason: 'Insufficient gear: Need at least 1 Top and 1 Bottom in inventory.'
    }
  }

  let bestPair: { top: Item, bottom: Item, score: number, reason: string } | null = null

  // Score candidate pairs
  for (const top of tops) {
    for (const bottom of bottoms) {
      // Color clash check
      const color1 = top.dominant_color || '#ffffff'
      const color2 = bottom.dominant_color || '#000000'
      const clashing = checkColorClash(color1, color2)
      
      if (clashing) continue // Skip clashing pairs

      // Count shared tags
      const topTags = new Set(top.tags.map(t => t.name.toLowerCase()))
      const bottomTags = bottom.tags.map(t => t.name.toLowerCase())
      const sharedTags = bottomTags.filter(tag => topTags.has(tag))
      
      let score = sharedTags.length * 10 // Big weight for matching styles
      
      // Worth rating weight
      score += (top.rating_worth || 3) + (bottom.rating_worth || 3)

      let reason = 'Perfect style alignment.'
      if (sharedTags.length > 0) {
        reason = `Styles match: both items are tagged [${sharedTags.slice(0, 2).join(', ')}].`
      } else {
        reason = 'Aesthetic color harmony (No style tags shared).'
        score -= 5 // Slightly lower score if they don't share tags
      }

      if (!bestPair || score > bestPair.score) {
        bestPair = { top, bottom, score, reason }
      }
    }
  }

  // Fallback: If all pairs clashed or had no alignment, pick the first non-clashing or just any pair
  if (!bestPair) {
    for (const top of tops) {
      for (const bottom of bottoms) {
        const color1 = top.dominant_color || '#ffffff'
        const color2 = bottom.dominant_color || '#000000'
        if (!checkColorClash(color1, color2)) {
          bestPair = {
            top,
            bottom,
            score: 0,
            reason: 'Fallback option: Safely matched on color harmony.'
          }
          break
        }
      }
      if (bestPair) break
    }
  }

  // Absolute fallback: Just return the first top and bottom
  if (!bestPair) {
    bestPair = {
      top: tops[0],
      bottom: bottoms[0],
      score: -10,
      reason: 'Standard issue matching: Complete outfit check recommended.'
    }
  }

  const result: { top?: Item, bottom?: Item, outer?: Item, shoes?: Item, matchReason?: string } = {
    top: bestPair.top,
    bottom: bestPair.bottom,
    matchReason: bestPair.reason
  }

  // Try to match an Outer with the chosen top/bottom
  if (outers.length > 0) {
    // Find outer that doesn't clash with top or bottom, and ideally shares tags
    let bestOuter: Item | null = null
    let bestOuterScore = -100

    for (const outer of outers) {
      const topColor = result.top?.dominant_color || '#ffffff'
      const botColor = result.bottom?.dominant_color || '#000000'
      const outerColor = outer.dominant_color || '#888888'

      if (checkColorClash(outerColor, topColor) || checkColorClash(outerColor, botColor)) {
        continue
      }

      // Calculate score based on tags
      const outfitTags = new Set([
        ...(result.top?.tags.map(t => t.name.toLowerCase()) || []),
        ...(result.bottom?.tags.map(t => t.name.toLowerCase()) || [])
      ])
      const shared = outer.tags.map(t => t.name.toLowerCase()).filter(tag => outfitTags.has(tag))
      
      const score = shared.length * 5 + (outer.rating_worth || 3)
      if (score > bestOuterScore) {
        bestOuterScore = score
        bestOuter = outer
      }
    }
    
    if (bestOuter) {
      result.outer = bestOuter
    }
  }

  // Try to match Shoes with the chosen outfit
  if (shoesList.length > 0) {
    let bestShoes: Item | null = null
    let bestShoesScore = -100

    for (const shoes of shoesList) {
      const botColor = result.bottom?.dominant_color || '#000000'
      const shoesColor = shoes.dominant_color || '#555555'

      // Shoes shouldn't clash with the pants
      if (checkColorClash(shoesColor, botColor)) {
        continue
      }

      const outfitTags = new Set([
        ...(result.top?.tags.map(t => t.name.toLowerCase()) || []),
        ...(result.bottom?.tags.map(t => t.name.toLowerCase()) || [])
      ])
      const shared = shoes.tags.map(t => t.name.toLowerCase()).filter(tag => outfitTags.has(tag))
      
      const score = shared.length * 5 + (shoes.rating_worth || 3)
      if (score > bestShoesScore) {
        bestShoesScore = score
        bestShoes = shoes
      }
    }

    if (bestShoes) {
      result.shoes = bestShoes
    }
  }

  return result
}
