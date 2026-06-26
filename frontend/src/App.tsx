import React, { useState, useEffect } from 'react'
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

import { Loader2, Home, Shirt, Package, Heart, User, LogOut } from 'lucide-react'

// RPG Level calculation helper
const calculateRpgLevel = (count: number) => {
  if (count === 0) return { level: 1, title: 'Novice Nomad' }
  if (count < 5) return { level: 2, title: 'Minimalist Explorer' }
  if (count < 15) return { level: 3, title: 'Vault Keeper' }
  if (count < 30) return { level: 4, title: 'Dimension Hoarder' }
  return { level: 5, title: 'Infinite Master Collector' }
}

const MainApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [ownedItemsCount, setOwnedItemsCount] = useState<number>(0)
  const { user, signOut } = useAuth()

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  // Fetch owned items count for the desktop sidebar RPG profile card
  useEffect(() => {
    if (user) {
      apiClient.get<Item[]>('/items')
        .then((items) => {
          const owned = items.filter((item) => item.status === 'Owned').length
          setOwnedItemsCount(owned)
        })
        .catch((err) => console.error('Failed to fetch items in App:', err))
    }
  }, [user, refreshTrigger])

  const handleAddItem = () => {
    setItemToEdit(null)
    setIsModalOpen(true)
  }

  const handleInspectItem = (item: Item) => {
    setItemToEdit(item)
    setIsModalOpen(true)
  }

  const handleBuyWishlistItem = (item: Item) => {
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

  const rpgStats = calculateRpgLevel(ownedItemsCount)

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'wardrobe', label: 'Wardrobe', icon: Shirt },
    { id: 'gear', label: 'Gear', icon: Package },
    { id: 'wishlist', label: 'Bounty', icon: Heart },
    { id: 'profile', label: 'Status', icon: User },
  ]

  return (
    <div className="min-h-screen bg-hud-bg font-sans relative hud-scanline-container md:flex md:items-start md:justify-center md:p-8">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,240,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,240,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
      
      {/* Outer Wrapper for responsive alignment */}
      <div className="w-full max-w-lg md:max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-start relative z-10">
        
        {/* Desktop Sidebar (visible on md+) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 bg-hud-panel border border-hud-border rounded-2xl p-6 relative hud-corner-box">
          <div className="hud-corner-bottom" />
          
          {/* Brand Logo */}
          <div className="mb-6 border-b border-hud-border pb-5">
            <h1 className="text-2xl font-bold text-hud-text-bright tracking-widest font-hud glow-text-cyan m-0">
              DIMEBOX
            </h1>
            <p className="text-[10px] text-hud-text-muted uppercase tracking-widest mt-1 m-0">
              Pocket Dimension HUD
            </p>
          </div>

          {/* User RPG Card */}
          <div className="mb-6 p-4 bg-hud-bg/60 border border-hud-border/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse animate-duration-2000" />
              <span className="text-xs font-mono text-hud-text-bright uppercase tracking-wider truncate" title={user?.email}>
                {user?.email?.split('@')[0] ?? 'ANON_USER'}
              </span>
            </div>
            <div className="text-[10px] text-hud-text-muted uppercase tracking-wider">
              Class: <span className="text-neon-cyan font-bold block mt-0.5">{rpgStats.title}</span>
            </div>
            <div className="mt-3 flex justify-between text-[9px] font-mono">
              <span>LVL {rpgStats.level}</span>
              <span>{ownedItemsCount} / {rpgStats.level * 15} items</span>
            </div>
            <div className="w-full bg-hud-bg h-1 rounded-full overflow-hidden border border-hud-border mt-1">
              <div 
                className="bg-neon-cyan h-full rounded-full" 
                style={{ width: `${Math.min(100, (ownedItemsCount / (rpgStats.level * 15)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs uppercase tracking-wider font-hud transition-all duration-300 border cursor-pointer ${
                    isActive
                      ? 'bg-neon-cyan-dim border-neon-cyan/40 text-neon-cyan glow-cyan font-bold'
                      : 'bg-transparent border-transparent text-hud-text-muted hover:border-hud-border hover:text-hud-text-bright hover:bg-hud-bg/30'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Sign Out Button at bottom */}
          <div className="pt-5 border-t border-hud-border mt-6">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs uppercase tracking-wider font-hud text-hud-text-muted hover:text-neon-red hover:border-neon-red/30 border border-transparent transition-all duration-300 cursor-pointer"
            >
              <LogOut className="w-4.5 h-4.5" />
              Exit Session
            </button>
          </div>
        </aside>
        
        {/* Mobile Header (hidden on md+) */}
        <header className="w-full sticky top-0 z-40 bg-hud-bg/85 backdrop-blur-md border-b border-hud-border px-6 py-4 flex justify-between items-center md:hidden">
          <div>
            <h1 className="text-lg font-bold text-hud-text-bright tracking-widest font-hud glow-text-cyan m-0">
              DIMEBOX
            </h1>
            <p className="text-[9px] text-hud-text-muted uppercase tracking-widest mt-0.5 m-0">
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

        {/* Main Application Container */}
        <main className="w-full flex-1 pb-24 md:pb-0 bg-transparent md:bg-hud-panel md:border md:border-hud-border md:rounded-2xl md:shadow-2xl md:p-6 md:min-h-[750px] relative md:hud-corner-box">
          <div className="hidden md:block hud-corner-bottom" />
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation (hidden on md+) */}
      <div className="md:hidden">
        <Navbar currentTab={currentTab} setTab={setCurrentTab} />
      </div>

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

