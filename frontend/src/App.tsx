import React, { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Auth } from './pages/Auth'
import { Navbar } from './components/Navbar'
import { Dashboard } from './pages/Dashboard'
import { Wardrobe } from './pages/Wardrobe'
import { Gear } from './pages/Gear'
import { Wishlist } from './pages/Wishlist'
import { Profile } from './pages/Profile'
import { ItemModal } from './components/ItemModal'
import type { Item } from './utils/durability'
import { apiClient } from './utils/apiClient'

import { Loader2 } from 'lucide-react'

const MainApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { user } = useAuth()

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleAddItem = () => {
    setItemToEdit(null)
    setIsModalOpen(true)
  }

  const handleInspectItem = (item: Item) => {
    setItemToEdit(item)
    setIsModalOpen(true)
  }

  const handleBuyWishlistItem = (item: Item) => {
    // Prefecture the item with Owned status so they can input purchase logs
    const convertedItem: Item = {
      ...item,
      status: 'Owned',
      purchase_date: new Date().toISOString().split('T')[0],
    }
    setItemToEdit(convertedItem)
    setIsModalOpen(true)
  }

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this equipment from the pocket dimension?')) {
      try {
        await apiClient.delete(`/items/${id}`)
        triggerRefresh()
      } catch (err) {
        console.error('Failed to delete item:', err)
        alert('Failed to delete item from vault.')
      }
    }
  }

  const handleSaveItem = () => {
    triggerRefresh()
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard
            onAddItem={handleAddItem}
            onInspectItem={handleInspectItem}
          />
        )
      case 'wardrobe':
        return (
          <Wardrobe
            onInspectItem={handleInspectItem}
            onDelete={handleDeleteItem}
            onBuy={handleBuyWishlistItem}
            refreshTrigger={refreshTrigger}
          />
        )
      case 'gear':
        return (
          <Gear
            onInspectItem={handleInspectItem}
            onDelete={handleDeleteItem}
            onBuy={handleBuyWishlistItem}
            refreshTrigger={refreshTrigger}
          />
        )
      case 'wishlist':
        return (
          <Wishlist
            onInspectItem={handleInspectItem}
            onDelete={handleDeleteItem}
            onBuy={handleBuyWishlistItem}
            refreshTrigger={refreshTrigger}
          />
        )
      case 'profile':
        return (
          <Profile
            refreshTrigger={refreshTrigger}
            onInspectItem={handleInspectItem}
          />
        )
      default:
        return (
          <Dashboard
            onAddItem={handleAddItem}
            onInspectItem={handleInspectItem}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-hud-bg pb-24 font-sans relative hud-scanline-container">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,240,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,240,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
      
      {/* Header HUD */}
      <header className="sticky top-0 z-40 bg-hud-bg/80 backdrop-blur-md border-b border-hud-border px-6 py-4 flex justify-between items-center max-w-lg mx-auto">
        <div>
          <h1 className="text-lg font-bold text-hud-text-bright tracking-widest font-hud glow-text-cyan m-0">
            DIMEBOX
          </h1>
          <p className="text-[9px] text-hud-text-muted uppercase tracking-widest mt-0.5">
            Pocket Dimension Inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          <span className="text-[10px] font-mono text-hud-text-muted">
            {user?.email?.split('@')[0].toUpperCase() ?? 'ANON_USER'}
          </span>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-lg mx-auto">
        {renderContent()}
      </main>

      {/* Persistent Bottom Nav */}
      <Navbar currentTab={currentTab} setTab={setCurrentTab} />

      {/* Universal Item Registry Modal */}
      <ItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        itemToEdit={itemToEdit}
      />
    </div>
  )
}

const AppContent: React.FC = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-hud-bg flex flex-col items-center justify-center font-hud">
        <Loader2 className="w-10 h-10 text-neon-cyan animate-spin mb-4" />
        <span className="text-xs uppercase tracking-widest text-hud-text-muted animate-pulse">
          Synchronizing Pocket Dimension...
        </span>
      </div>
    )
  }

  return user ? <MainApp /> : <Auth />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
