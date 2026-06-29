import React, { useState, useEffect, useRef } from 'react'
import type { Item, Tag } from '../utils/durability'
import { apiClient } from '../utils/apiClient'

import { X, Plus, Tag as TagIcon, Sparkles, Camera, RefreshCw, Upload } from 'lucide-react'

// Client-side image compression using HTML5 Canvas (zero-dependency)
const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 800
        const MAX_HEIGHT = 600
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Canvas compression failed'))
          },
          'image/jpeg',
          0.7
        )
      }
    }
    reader.onerror = (err) => reject(err)
  })
}

// Upload to Cloudinary using unsigned upload preset
const uploadToCloudinary = async (blob: Blob): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary credentials are not configured in environment')
  }

  const formData = new FormData()
  formData.append('file', blob, 'scan.jpg')
  formData.append('upload_preset', uploadPreset)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to upload image to Cloudinary')
  }

  const data = await response.json()
  return data.secure_url
}

// Web Audio API synth beep for camera shutter sound
const playCaptureSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.15)
    
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15)
    
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    
    oscillator.start()
    oscillator.stop(audioCtx.currentTime + 0.15)
  } catch (e) {
    console.warn('Web Audio API not supported or blocked by autoplay policy:', e)
  }
}

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
  
  // Wishlist details
  const [wishlistUrl, setWishlistUrl] = useState('')
  const [wishlistPrice, setWishlistPrice] = useState<number | string>('')
  const [wishlistNote, setWishlistNote] = useState('')
  
  // Upload states
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  
  // Tag management
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [tagLoading, setTagLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Camera states
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [flashActive, setFlashActive] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-stop camera on unmount or when modal closes
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [cameraStream])

  useEffect(() => {
    if (!isOpen && cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
      setIsCameraActive(false)
    }
  }, [isOpen, cameraStream])

  const startCamera = async (mode = facingMode) => {
    setError(null)
    
    // Check if WebRTC is supported and we are in a secure context (HTTPS or localhost)
    const isSecureContext = window.isSecureContext
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

    if (!isSecureContext || !hasGetUserMedia) {
      console.warn('WebRTC camera not supported in insecure context or not available. Falling back to native device camera.')
      if (cameraInputRef.current) {
        cameraInputRef.current.click()
      } else {
        setError('Camera access not supported on this device/browser.')
      }
      return
    }

    setIsCameraActive(true)
    
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err: any) {
      console.warn('Failed to access camera with facingMode constraint, trying generic video...', err)
      try {
        // Fallback 1: Try getting any available camera without facingMode or resolution constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
        setCameraStream(stream)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (fallbackErr: any) {
        console.error('All WebRTC camera attempts failed:', fallbackErr)
        // Fallback 2: Fallback to native device camera app via HTML5 file input
        if (cameraInputRef.current) {
          console.log('Falling back to native HTML5 camera capture')
          cameraInputRef.current.click()
        } else {
          setError('Failed to access camera. Please check camera permissions.')
        }
        setIsCameraActive(false)
      }
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    setIsCameraActive(false)
  }

  const toggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    startCamera(nextMode)
  }

  const handleCapture = async () => {
    if (!videoRef.current) return

    setUploading(true)
    setUploadProgress('Capturing scan...')
    playCaptureSound()
    setFlashActive(true)
    setTimeout(() => setFlashActive(false), 150)

    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0)
          ctx.scale(-1, 1)
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      }

      setUploadProgress('Compressing physical asset...')
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b)
            else reject(new Error('Failed to capture frame'))
          },
          'image/jpeg',
          0.7
        )
      })

      setUploadProgress('Uploading to pocket dimension...')
      const uploadedUrl = await uploadToCloudinary(blob)
      setImageUrl(uploadedUrl)
      setUploadProgress('Scan complete!')
      stopCamera()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to capture and upload image.')
      setUploadProgress(null)
    } finally {
      setUploading(false)
    }
  }

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
      
      // Populate wishlist link data if present
      if (itemToEdit.wishlist_links && itemToEdit.wishlist_links.length > 0) {
        setWishlistUrl(itemToEdit.wishlist_links[0].url_link)
        setWishlistPrice(itemToEdit.wishlist_links[0].price)
        setWishlistNote(itemToEdit.wishlist_links[0].spec_note ?? '')
      } else {
        setWishlistUrl('')
        setWishlistPrice('')
        setWishlistNote('')
      }
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
      setWishlistUrl('')
      setWishlistPrice('')
      setWishlistNote('')
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress('Compressing physical asset...')
    setError(null)

    try {
      // 1. Compress image
      const compressedBlob = await compressImage(file)
      
      // 2. Upload to Cloudinary
      setUploadProgress('Uploading to pocket dimension...')
      const uploadedUrl = await uploadToCloudinary(compressedBlob)
      
      // 3. Set image URL state
      setImageUrl(uploadedUrl)
      setUploadProgress('Scan complete!')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to process and upload image. Please verify environment configurations.')
      setUploadProgress(null)
    } finally {
      setUploading(false)
    }
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
      wishlist_links: status === 'Wishlist' && wishlistUrl ? [
        {
          url_link: wishlistUrl.trim(),
          price: wishlistPrice !== '' ? Number(wishlistPrice) : 0,
          spec_note: wishlistNote.trim() || null
        }
      ] : status === 'Wishlist' ? [] : null,
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

          {/* Image Upload / Scan */}
          <div className="space-y-2">
            <label className="block text-[11px] uppercase tracking-wider text-hud-text-muted">
              Visual Scan (Equipment Image)
            </label>
            
            {/* Active Camera Viewport */}
            {isCameraActive ? (
              <div className="relative w-full aspect-[4/3] bg-black border border-hud-border rounded overflow-hidden flex flex-col items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
                
                {/* Cybernetic HUD Overlay */}
                <div className="absolute inset-0 pointer-events-none border-2 border-neon-cyan/30 m-3 flex flex-col justify-between p-2">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-cyan" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-cyan" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-cyan" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-cyan" />
                  
                  {/* Scanning lines / grid */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,240,255,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none animate-scanline" />
                  
                  {/* Scanner status */}
                  <div className="flex justify-between items-start w-full">
                    <span className="text-[9px] bg-neon-cyan/20 text-neon-cyan px-1.5 py-0.5 font-mono tracking-widest uppercase animate-pulse">
                      ● SCANNER ACTIVE
                    </span>
                    <span className="text-[9px] text-hud-text-muted font-mono">
                      FACING: {facingMode.toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Center crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border border-dashed border-neon-cyan/40 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-neon-cyan rounded-full animate-ping" />
                    </div>
                  </div>

                  <div className="w-full text-center">
                    <span className="text-[8px] text-neon-cyan/70 font-mono tracking-wider uppercase">
                      [Align physical asset in target area]
                    </span>
                  </div>
                </div>

                {/* Flash overlay */}
                <div
                  className={`absolute inset-0 bg-white transition-opacity duration-150 pointer-events-none ${
                    flashActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />

                {/* Camera Controls */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4 px-4 pointer-events-auto">
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className="p-2 rounded-full bg-hud-panel/80 border border-hud-border text-hud-text-bright hover:text-neon-cyan hover:border-neon-cyan transition-all cursor-pointer pointer-events-auto"
                    title="Switch Camera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={uploading}
                    className="w-12 h-12 rounded-full bg-neon-cyan border-4 border-neon-cyan-dim flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg shadow-neon-cyan/20 pointer-events-auto"
                    title="Capture Scan"
                  >
                    <div className="w-4 h-4 bg-hud-bg rounded-full" />
                  </button>

                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-2 rounded-full bg-hud-panel/80 border border-hud-border text-neon-red hover:bg-neon-red/20 hover:border-neon-red transition-all cursor-pointer pointer-events-auto"
                    title="Close Camera"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Scanner trigger button if online */}
                {isOnline ? (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="w-full mb-2 py-2 rounded bg-neon-cyan-dim/10 border border-neon-cyan/30 text-neon-cyan text-xs font-bold uppercase tracking-wider hover:bg-neon-cyan-dim/20 hover:border-neon-cyan transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Initiate Live Scanner
                  </button>
                ) : (
                  <div className="w-full mb-2 py-2 rounded bg-neon-yellow-dim/10 border border-neon-yellow/30 text-neon-yellow text-[10px] font-mono uppercase tracking-wider text-center">
                    [SYSTEM ALERT: Scanner offline. Reconnect to sync physical assets]
                  </div>
                )}

                {/* Hidden native camera capture fallback input */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* File upload container */}
                <div className="border border-dashed border-hud-border rounded p-4 bg-hud-bg/20 transition-all text-center relative flex flex-col items-center justify-center min-h-[100px]">
                  {uploading ? (
                    <span className="text-xs font-bold text-neon-cyan block font-hud animate-pulse">
                      {uploadProgress}
                    </span>
                  ) : imageUrl ? (
                    <div className="space-y-2 z-10 w-full">
                      <span className="text-xs font-bold text-neon-green block font-hud">
                        📁 Visual Scan Linked
                      </span>
                      <div className="flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-3 py-1.5 rounded bg-hud-bg border border-hud-border text-neon-cyan text-[10px] font-bold uppercase tracking-wider hover:border-neon-cyan transition-colors cursor-pointer"
                        >
                          Retake Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded bg-hud-bg border border-hud-border text-hud-text-bright text-[10px] font-bold uppercase tracking-wider hover:border-neon-cyan transition-colors cursor-pointer"
                        >
                          Choose File
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 z-10 w-full">
                      <span className="text-xs font-bold text-hud-text-bright block font-hud">
                        📷 Link Physical Scan
                      </span>
                      <div className="flex gap-3 justify-center">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="flex-1 py-2 px-3 rounded bg-neon-cyan-dim/10 border border-neon-cyan/30 text-neon-cyan text-[10px] font-bold uppercase tracking-wider hover:bg-neon-cyan-dim/20 hover:border-neon-cyan transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Take Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 py-2 px-3 rounded bg-hud-bg border border-hud-border text-hud-text-bright text-[10px] font-bold uppercase tracking-wider hover:border-neon-cyan transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Choose File
                        </button>
                      </div>
                      <span className="text-[8px] text-hud-text-muted block uppercase tracking-wider">
                        Auto client-compressed to &lt; 100KB
                      </span>
                    </div>
                  )}
                  
                  {/* Hidden standard file input */}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                  />
                </div>
              </>
            )}

            {/* Manual URL fallback */}
            <div className="space-y-1 mt-2">
              <label className="block text-[9px] uppercase tracking-wider text-hud-text-muted">
                Or Manual Scan URL (Photo Link)
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/... (optional)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-hud-bg border border-hud-border rounded px-3 py-2 text-xs text-hud-text-bright placeholder-hud-text-muted/30 focus:outline-none focus:border-neon-cyan transition-colors font-sans"
              />
              {!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && (
                <span className="text-[8px] text-hud-text-muted block mt-1 leading-normal font-sans">
                  💡 Cloudinary upload is inactive. Add <code className="text-neon-yellow">VITE_CLOUDINARY_CLOUD_NAME</code> & <code className="text-neon-yellow">VITE_CLOUDINARY_UPLOAD_PRESET</code> in <code className="text-hud-text-bright">.env</code> to enable automatic physical photo uploads.
                </span>
              )}
            </div>
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

          {/* Conditionally Render: Wishlist Details */}
          {status === 'Wishlist' && (
            <div className="border border-hud-border bg-hud-bg/30 p-3 rounded space-y-3">
              <span className="text-[10px] uppercase font-bold text-neon-yellow tracking-wider block border-b border-hud-border pb-1 font-hud">
                Bounty Radar Parameters
              </span>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Target Price */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-hud-text-muted">
                    Target Price (Gold / IDR)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="e.g. 1500000"
                    value={wishlistPrice}
                    onChange={(e) => setWishlistPrice(e.target.value)}
                    className="w-full bg-hud-bg border border-hud-border rounded px-3 py-1.5 text-sm text-hud-text-bright focus:outline-none focus:border-neon-cyan transition-colors font-mono"
                  />
                </div>

                {/* Target Spec Note */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-hud-text-muted">
                    Target Spec / Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Size M, Black"
                    value={wishlistNote}
                    onChange={(e) => setWishlistNote(e.target.value)}
                    className="w-full bg-hud-bg border border-hud-border rounded px-3 py-1.5 text-sm text-hud-text-bright focus:outline-none focus:border-neon-cyan transition-colors font-sans"
                  />
                </div>
              </div>

              {/* Target Shop Link */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-hud-text-muted">
                  Target Shop / Source URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://tokopedia.com/... or https://..."
                  value={wishlistUrl}
                  onChange={(e) => setWishlistUrl(e.target.value)}
                  className="w-full bg-hud-bg border border-hud-border rounded px-3 py-1.5 text-xs text-hud-text-bright placeholder-hud-text-muted/30 focus:outline-none focus:border-neon-cyan transition-colors font-sans"
                />
              </div>
            </div>
          )}

          {/* Aesthetic Grid: Color Selector */}
          {category === 'Wardrobe' && (
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
          )}

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
