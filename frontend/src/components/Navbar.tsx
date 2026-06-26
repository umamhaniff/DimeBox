import React from 'react'
import { Home, Shirt, Package, Heart, User, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'


interface NavbarProps {
  currentTab: string
  setTab: (tab: string) => void
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setTab }) => {
  const { signOut } = useAuth()

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'wardrobe', label: 'Wardrobe', icon: Shirt },
    { id: 'gear', label: 'Gear', icon: Package },
    { id: 'wishlist', label: 'Bounty', icon: Heart },
    { id: 'profile', label: 'Status', icon: User },
  ]


  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-hud-panel/80 backdrop-blur-md border-t border-hud-border px-4 py-2 flex justify-around items-center max-w-lg mx-auto rounded-t-xl glow-cyan">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = currentTab === item.id
        
        return (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className="flex flex-col items-center justify-center py-1 px-3 rounded transition-all duration-300 relative group cursor-pointer"
          >
            {/* Active indicator bar */}
            {isActive && (
              <span className="absolute -top-[9px] w-8 h-[3px] bg-neon-cyan rounded-full glow-cyan animate-pulse" />
            )}
            
            <Icon
              className={`w-5 h-5 transition-all duration-300 ${
                isActive
                  ? 'text-neon-cyan scale-110'
                  : 'text-hud-text-muted group-hover:text-hud-text-bright'
              }`}
            />
            
            <span
              className={`text-[9px] uppercase tracking-wider mt-1 transition-all duration-300 font-hud ${
                isActive
                  ? 'text-neon-cyan font-bold'
                  : 'text-hud-text-muted group-hover:text-hud-text-bright'
              }`}
            >
              {item.label}
            </span>
          </button>
        )
      })}

      {/* Log out action in nav */}
      <button
        onClick={signOut}
        className="flex flex-col items-center justify-center py-1 px-3 rounded transition-all duration-300 hover:text-neon-red group cursor-pointer"
        title="LOG OUT SESSION"
      >
        <LogOut className="w-5 h-5 text-hud-text-muted group-hover:text-neon-red transition-colors" />
        <span className="text-[9px] uppercase tracking-wider mt-1 text-hud-text-muted group-hover:text-neon-red font-hud">
          Exit
        </span>
      </button>
    </nav>
  )
}
