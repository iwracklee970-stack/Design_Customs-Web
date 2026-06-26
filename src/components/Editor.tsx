import React, { useState, useRef, useCallback } from 'react';
import { 
  Shirt, 
  Layers, 
  Scissors, 
  Upload, 
  Trash2, 
  RotateCw, 
  Sliders, 
  Type, 
  Sparkles, 
  X,
  FileImage,
  Info,
  Sun,
  Moon,
  Printer,
  ShoppingCart,
  Download,
  Copy
} from 'lucide-react';
import { 
  ApparelType, 
  ViewSide, 
  PatternType, 
  FilterType 
} from '../types';
import type {
  CanvasState, 
  VectorOverlay, 
  ImageOverlay,
  CartItem
} from '../types';
import { ClothingPreview } from './ClothingPreview';
import { PRESET_VECTORS } from './VectorAssets';
import { PrintTab } from './PrintTab';
import { CartOverlay } from './CartOverlay';
import type { Theme } from '../utils/theme';

interface EditorProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export const Editor: React.FC<EditorProps> = ({ theme, onToggleTheme }) => {
  // 1. MAIN CANVAS & OVERLAYS STATE
  const [canvasState, setCanvasState] = useState<CanvasState>({
    apparelType: ApparelType.T_SHIRT,
    viewSide: ViewSide.FRONT,
    baseColor: '#ffffff',
    patterns: [],
    vectors: [],
    images: [],
    selectedElementId: null,
    selectedElementType: null
  });

  // Active sub-tab state on the left panel
  const [activeTab, setActiveTab] = useState<'apparel' | 'pattern' | 'graphics' | 'uploads' | 'print'>('apparel');

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // 2. STITCHING HIGHLIGHTS STATE (snapped to sleeves/collar/hems)
  const [stitchingConfig, setStitchingConfig] = useState({
    collar: { enabled: true, color: '#ff00ff' },
    sleeve: { enabled: true, color: '#00ffff' },
    hem: { enabled: true, color: '#ffff00' }
  });

  // 3. UPLOAD INTERSTITIAL MODAL STATE
  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    fileName: string;
    aspectRatio: number;
  }>({
    isOpen: false,
    imageUrl: '',
    fileName: '',
    aspectRatio: 1
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const elementIdCounter = useRef(0);

  // Ref to the SVG canvas element — populated by ClothingPreview via onSvgRef
  const previewSvgRef = useRef<SVGSVGElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Download the current mockup as a high-quality transparent PNG
  const downloadMockup = useCallback(() => {
    const svg = previewSvgRef.current;
    if (!svg) return;

    setIsDownloading(true);

    // We export at 3x the native viewBox size for high quality (1500×1500)
    const EXPORT_SIZE = 1500;

    // Serialize the full SVG DOM to a string
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svg);

    // Inject explicit width/height so the browser knows the raster size
    svgString = svgString.replace(
      /(<svg[^>]*?)\s*width="[^"]*"/,
      `$1 width="${EXPORT_SIZE}"`
    ).replace(
      /(<svg[^>]*?)\s*height="[^"]*"/,
      `$1 height="${EXPORT_SIZE}"`
    );
    // If no explicit w/h attributes existed add them
    if (!svgString.includes(`width="${EXPORT_SIZE}"`)) {
      svgString = svgString.replace('<svg', `<svg width="${EXPORT_SIZE}" height="${EXPORT_SIZE}"`);
    }

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const ctx = canvas.getContext('2d')!;
      // Keep transparent background — do NOT fill before drawing
      ctx.drawImage(img, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
      // toDataURL is more reliable than toBlob for triggering named downloads on Windows —
      // data URLs are embedded base64 so the browser always honours a.download filename
      const side = canvasState.viewSide.toLowerCase();
      const type = canvasState.apparelType.toLowerCase().replace('_', '-');
      const filename = `mockup-${type}-${side}.png`;

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = filename;
      a.href = dataUrl;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
      setIsDownloading(false);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setIsDownloading(false); };
    img.src = url;
  }, [canvasState.viewSide, canvasState.apparelType]);

  // 4. DRAG-TO-REORDER state for layer panels
  const [patternDragIdx, setPatternDragIdx] = useState<number | null>(null);
  const [patternDragOverIdx, setPatternDragOverIdx] = useState<number | null>(null);
  // Vector drag uses IDs (not indices) so it works across mixed front/back arrays
  const [vectorDragId, setVectorDragId] = useState<string | null>(null);
  const [vectorDragOverId, setVectorDragOverId] = useState<string | null>(null);

  // Reorder helpers
  const reorderPatterns = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setCanvasState(prev => {
      const arr = [...prev.patterns];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return { ...prev, patterns: arr };
    });
  };
  // Reorder vectors by ID — only swaps within same viewSide group
  const reorderVectorsById = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setCanvasState(prev => {
      const fromVec = prev.vectors.find(v => v.id === fromId);
      const toVec = prev.vectors.find(v => v.id === toId);
      // Only allow reorder within the same view side
      if (!fromVec || !toVec || fromVec.viewSide !== toVec.viewSide) return prev;
      const arr = [...prev.vectors];
      const fromIdx = arr.findIndex(v => v.id === fromId);
      const toIdx = arr.findIndex(v => v.id === toId);
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return { ...prev, vectors: arr };
    });
  };

  // Helper to trigger select file dialog
  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Handle uploaded file -> open interstitial modal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      
      // Calculate aspect ratio
      const img = new Image();
      img.onload = () => {
        setUploadModal({
          isOpen: true,
          imageUrl: url,
          fileName: file.name,
          aspectRatio: img.width / img.height
        });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
    
    // Reset file input value to allow uploading same file again
    e.target.value = '';
  };

  // Confirm Import as Overlay from Interstitial Modal
  const handleImportOverlay = () => {
    elementIdCounter.current += 1;
    const newImage: ImageOverlay = {
      id: `img_${elementIdCounter.current}`,
      url: uploadModal.imageUrl,
      name: uploadModal.fileName,
      x: 250, // Center on canvas
      y: 250,
      scale: 1,
      rotation: 0,
      opacity: 1,
      tintColor: '#ffffff', // Default white (no tint)
      filterType: FilterType.ORIGINAL,
      aspectRatio: uploadModal.aspectRatio,
      viewSide: canvasState.viewSide
    };

    setCanvasState(prev => ({
      ...prev,
      images: [...prev.images, newImage],
      selectedElementId: newImage.id,
      selectedElementType: 'image'
    }));

    setUploadModal(prev => ({ ...prev, isOpen: false }));
  };

  // Add Custom Vector overlay
  const handleAddVector = (type: VectorOverlay['type']) => {
    elementIdCounter.current += 1;
    const newVector: VectorOverlay = {
      id: `vec_${elementIdCounter.current}`,
      type,
      x: 250,
      y: 220,
      scale: 1,
      rotation: 0,
      color: '#ffffff',
      textContent: type === 'text' ? 'DESIGN' : undefined,
      viewSide: canvasState.viewSide
    };

    setCanvasState(prev => ({
      ...prev,
      vectors: [...prev.vectors, newVector],
      selectedElementId: newVector.id,
      selectedElementType: 'vector'
    }));
  };

  // Delete currently selected element
  const handleDeleteSelected = () => {
    if (!canvasState.selectedElementId) return;

    if (canvasState.selectedElementType === 'vector') {
      setCanvasState(prev => ({
        ...prev,
        vectors: prev.vectors.filter(v => v.id !== prev.selectedElementId),
        selectedElementId: null,
        selectedElementType: null
      }));
    } else if (canvasState.selectedElementType === 'image') {
      setCanvasState(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== prev.selectedElementId),
        selectedElementId: null,
        selectedElementType: null
      }));
    } else if (canvasState.selectedElementType === 'pattern') {
      setCanvasState(prev => ({
        ...prev,
        patterns: prev.patterns.filter(p => p.id !== prev.selectedElementId),
        selectedElementId: null,
        selectedElementType: null
      }));
    }
  };

  // Duplicate currently selected element with its parameters
  const handleDuplicateSelected = () => {
    if (!canvasState.selectedElementId || !canvasState.selectedElementType) return;

    if (canvasState.selectedElementType === 'vector') {
      const original = canvasState.vectors.find(v => v.id === canvasState.selectedElementId);
      if (!original) return;
      elementIdCounter.current += 1;
      const newVector: VectorOverlay = {
        ...original,
        id: `vec_${elementIdCounter.current}`,
        x: Math.min(450, Math.max(50, original.x + 20)),
        y: Math.min(450, Math.max(50, original.y + 20))
      };
      setCanvasState(prev => ({
        ...prev,
        vectors: [...prev.vectors, newVector],
        selectedElementId: newVector.id,
        selectedElementType: 'vector'
      }));
    } else if (canvasState.selectedElementType === 'image') {
      const original = canvasState.images.find(img => img.id === canvasState.selectedElementId);
      if (!original) return;
      elementIdCounter.current += 1;
      const newImage: ImageOverlay = {
        ...original,
        id: `img_${elementIdCounter.current}`,
        x: Math.min(450, Math.max(50, original.x + 20)),
        y: Math.min(450, Math.max(50, original.y + 20))
      };
      setCanvasState(prev => ({
        ...prev,
        images: [...prev.images, newImage],
        selectedElementId: newImage.id,
        selectedElementType: 'image'
      }));
    } else if (canvasState.selectedElementType === 'pattern') {
      const original = canvasState.patterns.find(p => p.id === canvasState.selectedElementId);
      if (!original) return;
      elementIdCounter.current += 1;
      const newPattern = {
        ...original,
        id: `pat_${elementIdCounter.current}`
      };
      setCanvasState(prev => ({
        ...prev,
        patterns: [...prev.patterns, newPattern],
        selectedElementId: newPattern.id,
        selectedElementType: 'pattern'
      }));
    }
  };

  // Update specific selected element property
  const handleUpdateSelected = (key: string, value: string | number) => {
    if (!canvasState.selectedElementId) return;

    if (canvasState.selectedElementType === 'vector') {
      setCanvasState(prev => ({
        ...prev,
        vectors: prev.vectors.map(v => 
          v.id === prev.selectedElementId ? { ...v, [key]: value } : v
        )
      }));
    } else if (canvasState.selectedElementType === 'image') {
      setCanvasState(prev => ({
        ...prev,
        images: prev.images.map(img => 
          img.id === prev.selectedElementId ? { ...img, [key]: value } : img
        )
      }));
    } else if (canvasState.selectedElementType === 'pattern') {
      setCanvasState(prev => ({
        ...prev,
        patterns: prev.patterns.map(p => 
          p.id === prev.selectedElementId ? { ...p, [key]: value } : p
        )
      }));
    }
  };

  // Retrieve currently selected element
  const getSelectedElement = () => {
    if (!canvasState.selectedElementId) return null;
    if (canvasState.selectedElementType === 'vector') {
      return canvasState.vectors.find(v => v.id === canvasState.selectedElementId);
    }
    if (canvasState.selectedElementType === 'image') {
      return canvasState.images.find(img => img.id === canvasState.selectedElementId);
    }
    if (canvasState.selectedElementType === 'pattern') {
      return canvasState.patterns.find(p => p.id === canvasState.selectedElementId);
    }
    return null;
  };

  const selectedItem = getSelectedElement();

  // Helper for quick apparel base color presets (Swiss CMYK + neutrals)
  const baseColorPresets = [
    { name: 'WHT', value: '#ffffff' },
    { name: 'BLK', value: '#121315' },
    { name: 'CYN', value: '#00ffff' },
    { name: 'MAG', value: '#ff00ff' },
    { name: 'YLW', value: '#ffff00' },
  ];

  return (
    <div className="studio-container">
      {/* HEADER SECTION */}
      <header className="studio-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Logo Icon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            backgroundColor: 'var(--text-main)',
            color: 'var(--bg-studio)',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            fontSize: '1rem',
            border: '1.5px solid var(--cmyk-magenta)'
          }}>
            DC
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Design Customs</h2>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>STYLING ENGINE / V1.0</span>
          </div>
        </div>

        {/* Info panel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={onToggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              borderRadius: '2px',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--text-main)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
            }}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          
          {/* Cart Button */}
          <button
            onClick={() => setCartOpen(true)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              borderRadius: '2px',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--text-main)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
            }}
            title="Cart"
          >
            <ShoppingCart size={14} />
            {cartItems.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                backgroundColor: '#ff6b35',
                color: '#fff',
                fontSize: '0.55rem',
                fontWeight: 800,
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>CONNECTED / AG_PRINT_OK</span>
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE CONTENT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* TAB NAVIGATION SIDEBAR */}
        <div className="studio-left-bar">
          <button 
            onClick={() => setActiveTab('apparel')}
            style={{
              width: '56px',
              height: '56px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.65rem',
              fontWeight: 500,
              color: activeTab === 'apparel' ? 'var(--cmyk-cyan)' : 'var(--text-muted)',
              border: activeTab === 'apparel' ? '1px solid var(--cmyk-cyan)' : '1px solid transparent',
              borderRadius: '3px',
              backgroundColor: activeTab === 'apparel' ? 'var(--bg-hover)' : 'transparent'
            }}
          >
            <Shirt size={20} />
            Apparel
          </button>
          
          <button 
            onClick={() => setActiveTab('pattern')}
            style={{
              width: '56px',
              height: '56px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.65rem',
              fontWeight: 500,
              color: activeTab === 'pattern' ? 'var(--cmyk-magenta)' : 'var(--text-muted)',
              border: activeTab === 'pattern' ? '1px solid var(--cmyk-magenta)' : '1px solid transparent',
              borderRadius: '3px',
              backgroundColor: activeTab === 'pattern' ? 'var(--bg-hover)' : 'transparent'
            }}
          >
            <Layers size={20} />
            Pattern
          </button>

          <button 
            onClick={() => setActiveTab('graphics')}
            style={{
              width: '56px',
              height: '56px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.65rem',
              fontWeight: 500,
              color: activeTab === 'graphics' ? 'var(--cmyk-yellow)' : 'var(--text-muted)',
              border: activeTab === 'graphics' ? '1px solid var(--cmyk-yellow)' : '1px solid transparent',
              borderRadius: '3px',
              backgroundColor: activeTab === 'graphics' ? 'var(--bg-hover)' : 'transparent'
            }}
          >
            <Scissors size={20} />
            Graphics
          </button>

          <button 
            onClick={() => setActiveTab('uploads')}
            style={{
              width: '56px',
              height: '56px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.65rem',
              fontWeight: 500,
              color: activeTab === 'uploads' ? '#ffffff' : 'var(--text-muted)',
              border: activeTab === 'uploads' ? '1px solid #ffffff' : '1px solid transparent',
              borderRadius: '3px',
              backgroundColor: activeTab === 'uploads' ? 'var(--bg-hover)' : 'transparent'
            }}
          >
            <Upload size={20} />
            Uploads
          </button>
          
          <div style={{ height: '1px', backgroundColor: 'var(--border-strong)', margin: '4px 8px' }} />

          <button 
            onClick={() => setActiveTab('print')}
            style={{
              width: '56px',
              height: '56px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.65rem',
              fontWeight: 500,
              color: activeTab === 'print' ? '#ff6b35' : 'var(--text-muted)',
              border: activeTab === 'print' ? '1px solid #ff6b35' : '1px solid transparent',
              borderRadius: '3px',
              backgroundColor: activeTab === 'print' ? 'rgba(255, 107, 53, 0.1)' : 'transparent'
            }}
          >
            <Printer size={20} />
            Print
          </button>
        </div>

        {/* LEFT TAB EDITING PANEL */}
        <div className="studio-sidebar" style={{ borderRight: '1px solid var(--border-muted)', borderLeft: 'none' }}>
          
          {/* APPAREL CONFIG SEGMENT */}
          {activeTab === 'apparel' && (
            <>
              <div className="control-segment">
                <span className="segment-title">
                  <Shirt size={14} style={{ color: 'var(--cmyk-cyan)' }} />
                  Template Blueprint
                </span>
                
                {/* Mock templates selectors */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(Object.keys(ApparelType) as Array<keyof typeof ApparelType>).map((type) => (
                    <button
                      key={type}
                      onClick={() => setCanvasState(prev => ({ ...prev, apparelType: ApparelType[type] }))}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid',
                        borderColor: canvasState.apparelType === ApparelType[type] ? 'var(--cmyk-cyan)' : 'var(--border-strong)',
                        textAlign: 'left',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        backgroundColor: canvasState.apparelType === ApparelType[type] ? 'rgba(0,255,255,0.03)' : 'var(--bg-input)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>{type.replace('_', ' ')}</span>
                      <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        {ApparelType[type] === ApparelType.T_SHIRT ? 'BP-TS01' : 
                         ApparelType[type] === ApparelType.HOODIE ? 'BP-HD02' : 
                         ApparelType[type] === ApparelType.LONG_SLEEVE ? 'BP-LS03' :
                         ApparelType[type] === ApparelType.SWEATER ? 'BP-SW04' : 'BP-TT05'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-segment">
                <span className="segment-title">
                  <RotateCw size={14} style={{ color: 'var(--cmyk-cyan)' }} />
                  Active Camera View
                </span>
                
                {/* Front / Back views */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    onClick={() => setCanvasState(prev => ({ ...prev, viewSide: ViewSide.FRONT }))}
                    style={{
                      height: '42px',
                      border: '1px solid',
                      borderColor: canvasState.viewSide === ViewSide.FRONT ? '#ffffff' : 'var(--border-strong)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      backgroundColor: canvasState.viewSide === ViewSide.FRONT ? 'var(--bg-hover)' : 'transparent'
                    }}
                  >
                    Front View
                  </button>
                  <button
                    onClick={() => setCanvasState(prev => ({ ...prev, viewSide: ViewSide.BACK }))}
                    style={{
                      height: '42px',
                      border: '1px solid',
                      borderColor: canvasState.viewSide === ViewSide.BACK ? '#ffffff' : 'var(--border-strong)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      backgroundColor: canvasState.viewSide === ViewSide.BACK ? 'var(--bg-hover)' : 'transparent'
                    }}
                  >
                    Back View
                  </button>
                </div>
              </div>

              <div className="control-segment">
                <span className="segment-title">
                  <Sliders size={14} style={{ color: 'var(--cmyk-cyan)' }} />
                  Apparel Fabric Base Color
                </span>
                
                {/* Hex input & system color picker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div className="color-picker-trigger" style={{ backgroundColor: canvasState.baseColor, width: '38px', height: '38px' }}>
                    <input 
                      type="color" 
                      value={canvasState.baseColor} 
                      onChange={(e) => setCanvasState(prev => ({ ...prev, baseColor: e.target.value }))}
                    />
                  </div>
                  <input
                    type="text"
                    value={canvasState.baseColor.toUpperCase()}
                    onChange={(e) => setCanvasState(prev => ({ ...prev, baseColor: e.target.value }))}
                    className="font-mono"
                    style={{
                      flex: 1,
                      height: '38px',
                      padding: '0 12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: '2px'
                    }}
                  />
                </div>

                {/* Quick Presets */}
                <div className="cmyk-presets">
                  {baseColorPresets.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => setCanvasState(prev => ({ ...prev, baseColor: preset.value }))}
                      className={`preset-btn ${canvasState.baseColor === preset.value ? 'active' : ''}`}
                      style={{ 
                        borderLeft: preset.value === '#00ffff' ? '3px solid var(--cmyk-cyan)' :
                                    preset.value === '#ff00ff' ? '3px solid var(--cmyk-magenta)' :
                                    preset.value === '#ffff00' ? '3px solid var(--cmyk-yellow)' : '1px solid var(--border-strong)'
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* PATTERN / SURFACE CONFIG SEGMENT */}
          {activeTab === 'pattern' && (
            <>
              {/* 1. Add Pattern Grid */}
              <div className="control-segment">
                <span className="segment-title">
                  <Layers size={14} style={{ color: 'var(--cmyk-magenta)' }} />
                  Add Pattern Layer
                </span>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '8px' }}>
                  {(Object.keys(PatternType) as Array<keyof typeof PatternType>).map((type) => (
                    type !== PatternType.NONE && (
                      <button
                        key={type}
                        onClick={() => {
                          if (canvasState.patterns.length >= 50) return;
                          elementIdCounter.current += 1;
                          const newPattern = {
                            id: `pat_${elementIdCounter.current}`,
                            type: PatternType[type as keyof typeof PatternType],
                            scale: 40,
                            rotation: 0,
                            opacity: 0.5,
                            color: '#ff00ff'
                          };
                          setCanvasState(prev => ({
                            ...prev,
                            patterns: [...prev.patterns, newPattern],
                            selectedElementId: newPattern.id,
                            selectedElementType: 'pattern'
                          }));
                        }}
                        style={{
                          padding: '10px 8px',
                          border: '1px solid var(--border-strong)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 'var(--bg-input)',
                          textTransform: 'uppercase',
                          cursor: canvasState.patterns.length >= 50 ? 'not-allowed' : 'pointer',
                          opacity: canvasState.patterns.length >= 50 ? 0.5 : 1
                        }}
                      >
                        + {type.replace('_', ' ')}
                      </button>
                    )
                  ))}
                </div>
                {canvasState.patterns.length >= 50 && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--cmyk-magenta)', textAlign: 'center' }}>
                    Maximum 50 layers reached.
                  </div>
                )}
              </div>

              {/* 2. Active Pattern Stack (drag-to-reorder) */}
              <div className="control-segment">
                <span className="segment-title">
                  <Layers size={14} style={{ color: 'var(--cmyk-magenta)' }} />
                  Active Layers ({canvasState.patterns.length}/50)
                </span>
                {canvasState.patterns.length > 1 && (
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
                    ⠿ DRAG LAYERS TO REORDER STACKING
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {canvasState.patterns.map((pat, index) => {
                    const isSelected = canvasState.selectedElementId === pat.id;
                    const isDragOver = patternDragOverIdx === index && patternDragIdx !== index;
                    return (
                      <div
                        key={pat.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          setPatternDragOverIdx(index);
                        }}
                        onDragLeave={() => setPatternDragOverIdx(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (patternDragIdx !== null) reorderPatterns(patternDragIdx, index);
                          setPatternDragIdx(null);
                          setPatternDragOverIdx(null);
                        }}
                        style={{
                          border: '1px solid',
                          borderColor: isDragOver ? 'var(--cmyk-magenta)' : isSelected ? 'var(--cmyk-magenta)' : 'var(--border-strong)',
                          backgroundColor: isDragOver ? 'rgba(255,0,255,0.09)' : isSelected ? 'rgba(255,0,255,0.03)' : 'var(--bg-input)',
                          opacity: patternDragIdx === index ? 0.4 : 1,
                          transition: 'border-color 0.15s, background-color 0.15s, opacity 0.15s',
                          boxShadow: isDragOver ? '0 0 0 1px var(--cmyk-magenta) inset' : 'none',
                        }}
                      >
                        {/* Header row — ONLY this part is draggable */}
                        <div
                          draggable
                          onDragStart={(e) => {
                            setPatternDragIdx(index);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setPatternDragIdx(null);
                            setPatternDragOverIdx(null);
                          }}
                          onClick={() => setCanvasState(prev => ({ ...prev, selectedElementId: pat.id, selectedElementType: 'pattern' }))}
                          style={{
                            padding: '10px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'grab',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Drag grip icon */}
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1 }} title="Drag to reorder">⠿</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                              {String(index + 1).padStart(2, '0')}  {pat.type}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '14px', height: '14px', backgroundColor: pat.color, border: '1px solid var(--border-muted)', borderRadius: '2px' }} />
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                              {Math.round(pat.opacity * 100)}%
                            </span>
                          </div>
                        </div>

                        {/* Modifiers — NOT draggable */}
                        {isSelected && (
                          <div draggable={false} style={{ padding: '0 12px 16px 12px', borderTop: '1px solid var(--border-muted)', paddingTop: '14px' }}>
                            {/* Pattern color */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                              <div className="color-picker-trigger" style={{ backgroundColor: pat.color }}>
                                <input
                                  type="color"
                                  value={pat.color}
                                  onChange={(e) => handleUpdateSelected('color', e.target.value)}
                                />
                              </div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ink Tint</span>
                            </div>

                            {/* Pattern Scale */}
                            <div className="slider-group">
                              <div className="slider-label">
                                <span>Scale</span>
                                <span className="slider-val">{pat.scale}%</span>
                              </div>
                              <input
                                type="range"
                                min="5"
                                max="200"
                                value={pat.scale}
                                onChange={(e) => handleUpdateSelected('scale', parseInt(e.target.value))}
                              />
                            </div>

                            {/* Pattern Rotation */}
                            <div className="slider-group">
                              <div className="slider-label">
                                <span>Rotation</span>
                                <span className="slider-val">{pat.rotation}°</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="360"
                                value={pat.rotation}
                                onChange={(e) => handleUpdateSelected('rotation', parseInt(e.target.value))}
                              />
                            </div>

                            {/* Pattern Opacity */}
                            <div className="slider-group">
                              <div className="slider-label">
                                <span>Opacity</span>
                                <span className="slider-val">{pat.opacity.toFixed(2)}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={pat.opacity * 100}
                                onChange={(e) => handleUpdateSelected('opacity', parseInt(e.target.value) / 100)}
                              />
                            </div>

                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSelected(); }}
                              style={{
                                marginTop: '16px',
                                width: '100%',
                                padding: '8px',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--border-strong)',
                                color: '#ff4444',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                            >
                              <Trash2 size={14} />
                              DELETE LAYER
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {canvasState.patterns.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-strong)' }}>
                      No patterns added. Select a pattern above to start stacking.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* EMBLEMS & STITCHINGS CONFIG SEGMENT */}
          {activeTab === 'graphics' && (
            <>
              {/* VIEW SWITCHER */}
              <div className="control-segment" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-muted)', marginBottom: '16px' }}>
                <span className="segment-title">
                  <RotateCw size={14} style={{ color: 'var(--cmyk-yellow)' }} />
                  Editable View Side
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCanvasState(prev => ({ ...prev, viewSide: ViewSide.FRONT }))}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: canvasState.viewSide === ViewSide.FRONT ? 'rgba(0, 255, 255, 0.1)' : 'var(--bg-input)',
                      border: `1px solid ${canvasState.viewSide === ViewSide.FRONT ? 'var(--cmyk-cyan)' : 'var(--border-strong)'}`,
                      color: canvasState.viewSide === ViewSide.FRONT ? 'var(--cmyk-cyan)' : 'var(--text-main)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    FRONT VIEW
                  </button>
                  <button
                    onClick={() => setCanvasState(prev => ({ ...prev, viewSide: ViewSide.BACK }))}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: canvasState.viewSide === ViewSide.BACK ? 'rgba(255, 0, 255, 0.1)' : 'var(--bg-input)',
                      border: `1px solid ${canvasState.viewSide === ViewSide.BACK ? 'var(--cmyk-magenta)' : 'var(--border-strong)'}`,
                      color: canvasState.viewSide === ViewSide.BACK ? 'var(--cmyk-magenta)' : 'var(--text-main)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    BACK VIEW
                  </button>
                </div>
              </div>

              <div className="control-segment">
                <span className="segment-title">
                  <Scissors size={14} style={{ color: 'var(--cmyk-yellow)' }} />
                  Seam Stitch Highlights
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                  Enable high-precision layout seams and style their thread color manually.
                </p>

                {/* Stitch collar config */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Collar Stitch */}
                  <div className="toggle-row">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                      <input 
                        type="checkbox"
                        checked={stitchingConfig.collar.enabled}
                        onChange={(e) => setStitchingConfig(prev => ({
                          ...prev,
                          collar: { ...prev.collar, enabled: e.target.checked }
                        }))}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--cmyk-yellow)' }}
                      />
                      Collar Stitching
                    </label>
                    
                    {stitchingConfig.collar.enabled && (
                      <div className="color-picker-trigger" style={{ backgroundColor: stitchingConfig.collar.color }}>
                        <input 
                          type="color"
                          value={stitchingConfig.collar.color}
                          onChange={(e) => setStitchingConfig(prev => ({
                            ...prev,
                            collar: { ...prev.collar, color: e.target.value }
                          }))}
                        />
                      </div>
                    )}
                  </div>

                  {/* Sleeve Stitch */}
                  <div className="toggle-row">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                      <input 
                        type="checkbox"
                        checked={stitchingConfig.sleeve.enabled}
                        onChange={(e) => setStitchingConfig(prev => ({
                          ...prev,
                          sleeve: { ...prev.sleeve, enabled: e.target.checked }
                        }))}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--cmyk-yellow)' }}
                      />
                      Sleeve Seams
                    </label>
                    
                    {stitchingConfig.sleeve.enabled && (
                      <div className="color-picker-trigger" style={{ backgroundColor: stitchingConfig.sleeve.color }}>
                        <input 
                          type="color"
                          value={stitchingConfig.sleeve.color}
                          onChange={(e) => setStitchingConfig(prev => ({
                            ...prev,
                            sleeve: { ...prev.sleeve, color: e.target.value }
                          }))}
                        />
                      </div>
                    )}
                  </div>

                  {/* Hem Stitch */}
                  <div className="toggle-row">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                      <input 
                        type="checkbox"
                        checked={stitchingConfig.hem.enabled}
                        onChange={(e) => setStitchingConfig(prev => ({
                          ...prev,
                          hem: { ...prev.hem, enabled: e.target.checked }
                        }))}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--cmyk-yellow)' }}
                      />
                      Bottom Hemline
                    </label>
                    
                    {stitchingConfig.hem.enabled && (
                      <div className="color-picker-trigger" style={{ backgroundColor: stitchingConfig.hem.color }}>
                        <input 
                          type="color"
                          value={stitchingConfig.hem.color}
                          onChange={(e) => setStitchingConfig(prev => ({
                            ...prev,
                            hem: { ...prev.hem, color: e.target.value }
                          }))}
                        />
                      </div>
                    )}
                  </div>

                </div>
              </div>

              <div className="control-segment">
                <span className="segment-title">
                  <Sparkles size={14} style={{ color: 'var(--cmyk-yellow)' }} />
                  Vector Emblem Presets
                </span>

                {/* Preset Vector Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {Object.entries(PRESET_VECTORS).map(([key, data]) => (
                    <button
                      key={key}
                      onClick={() => handleAddVector(key)}
                      style={{
                        padding: '10px',
                        border: '1px solid var(--border-strong)',
                        backgroundColor: 'var(--bg-input)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--cmyk-yellow)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                    >
                      <span style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: 'var(--cmyk-yellow)',
                        display: 'inline-block'
                      }} />
                      {data.name}
                    </button>
                  ))}
                </div>

                {/* Text Add Button */}
                <button
                  onClick={() => handleAddVector('text')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px dashed var(--cmyk-yellow)',
                    backgroundColor: 'rgba(255,255,0,0.03)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,0,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,0,0.03)'}
                >
                  <Type size={16} style={{ color: 'var(--cmyk-yellow)' }} />
                  Add Custom Text Overlay
                </button>
              </div>

              {/* Active Graphics / Vector Layer Stack — grouped by view side */}
              {canvasState.vectors.length > 0 && (() => {
                const frontVecs = canvasState.vectors.filter(v => v.viewSide === ViewSide.FRONT);
                const backVecs  = canvasState.vectors.filter(v => v.viewSide === ViewSide.BACK);

                const renderVecGroup = (groupVecs: typeof canvasState.vectors, label: string, accentColor: string) => {
                  if (groupVecs.length === 0) return null;
                  return (
                    <div style={{ marginBottom: '12px' }}>
                      {/* Group header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 8px',
                        marginBottom: '6px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${accentColor}`,
                        borderRadius: '2px'
                      }}>
                        <span style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: accentColor,
                          letterSpacing: '0.08em'
                        }}>{label} VIEW — {groupVecs.length} LAYER{groupVecs.length !== 1 ? 'S' : ''}</span>
                      </div>

                      {groupVecs.length > 1 && (
                        <p style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginBottom: '6px', fontFamily: 'var(--font-mono)', paddingLeft: '4px' }}>
                          ⠿ DRAG TO REORDER
                        </p>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {groupVecs.map((vec, groupIdx) => {
                          const isSelected = canvasState.selectedElementId === vec.id;
                          const isDragOver = vectorDragOverId === vec.id && vectorDragId !== vec.id;
                          const isFront = vec.viewSide === ViewSide.FRONT;
                          return (
                            <div
                              key={vec.id}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                setVectorDragOverId(vec.id);
                              }}
                              onDragLeave={() => setVectorDragOverId(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (vectorDragId !== null) reorderVectorsById(vectorDragId, vec.id);
                                setVectorDragId(null);
                                setVectorDragOverId(null);
                              }}
                              onClick={() => setCanvasState(prev => ({ ...prev, selectedElementId: vec.id, selectedElementType: 'vector' }))}
                              style={{
                                border: '1px solid',
                                borderColor: isDragOver ? accentColor : isSelected ? accentColor : 'var(--border-strong)',
                                backgroundColor: isDragOver ? `${accentColor}15` : isSelected ? `${accentColor}08` : 'var(--bg-input)',
                                opacity: vectorDragId === vec.id ? 0.4 : 1,
                                transition: 'border-color 0.15s, background-color 0.15s, opacity 0.15s',
                                boxShadow: isDragOver ? `0 0 0 1px ${accentColor} inset` : 'none',
                              }}
                            >
                              {/* Header row — ONLY this part is draggable */}
                              <div
                                draggable
                                onDragStart={(e) => {
                                  setVectorDragId(vec.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragEnd={() => {
                                  setVectorDragId(null);
                                  setVectorDragOverId(null);
                                }}
                                style={{
                                  padding: '9px 10px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  cursor: 'grab',
                                  userSelect: 'none',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                  <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1 }} title="Drag to reorder">⠿</span>
                                  {/* View badge */}
                                  <span style={{
                                    fontSize: '0.55rem',
                                    fontWeight: 800,
                                    fontFamily: 'var(--font-mono)',
                                    color: isFront ? '#000' : '#000',
                                    backgroundColor: accentColor,
                                    padding: '1px 4px',
                                    borderRadius: '2px',
                                    letterSpacing: '0.05em',
                                    flexShrink: 0
                                  }}>
                                    {isFront ? 'F' : 'B'}
                                  </span>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                                    {String(groupIdx + 1).padStart(2, '0')}  {vec.type === 'text' ? `TEXT: ${vec.textContent?.slice(0, 8) ?? ''}` : vec.type.toUpperCase()}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                  <div style={{ width: '11px', height: '11px', backgroundColor: vec.color, border: '1px solid var(--border-muted)', borderRadius: '2px' }} />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      elementIdCounter.current += 1;
                                      const newVector: VectorOverlay = {
                                        ...vec,
                                        id: `vec_${elementIdCounter.current}`,
                                        x: Math.min(450, Math.max(50, vec.x + 20)),
                                        y: Math.min(450, Math.max(50, vec.y + 20))
                                      };
                                      setCanvasState(prev => ({
                                        ...prev,
                                        vectors: [...prev.vectors, newVector],
                                        selectedElementId: newVector.id,
                                        selectedElementType: 'vector'
                                      }));
                                    }}
                                    style={{
                                      padding: '2px 4px',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      color: 'var(--text-dim)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    title="Duplicate graphic"
                                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cmyk-cyan)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                                  >
                                    <Copy size={11} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCanvasState(prev => ({
                                        ...prev,
                                        vectors: prev.vectors.filter(v => v.id !== vec.id),
                                        selectedElementId: prev.selectedElementId === vec.id ? null : prev.selectedElementId,
                                        selectedElementType: prev.selectedElementId === vec.id ? null : prev.selectedElementType,
                                      }));
                                    }}
                                    style={{
                                      padding: '2px 4px',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      color: 'var(--text-dim)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    title="Delete graphic"
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4444')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="control-segment">
                    <span className="segment-title">
                      <Layers size={14} style={{ color: 'var(--cmyk-yellow)' }} />
                      Active Graphics ({canvasState.vectors.length})
                    </span>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '12px', lineHeight: 1.4 }}>
                      Patterns are shared across views. Graphics are view-specific.
                    </p>
                    {renderVecGroup(frontVecs, 'FRONT', 'var(--cmyk-cyan)')}
                    {renderVecGroup(backVecs,  'BACK',  'var(--cmyk-magenta)')}
                  </div>
                );
              })()}
            </>
          )}

          {/* IMAGE UPLOAD SEGMENT */}
          {activeTab === 'uploads' && (
            <div className="control-segment">
              <span className="segment-title">
                <Upload size={14} />
                Image Overlay Engine
              </span>

              {/* Upload Drop Zone */}
              <div 
                onClick={handleTriggerUpload}
                style={{
                  border: '2px dashed var(--border-strong)',
                  borderRadius: '4px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-input)',
                  transition: 'border-color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
              >
                <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Upload Image</h4>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  PNG, JPG (transparent recommended)
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>

              {/* Uploaded overlays stack list */}
              {canvasState.images.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <span className="segment-title" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Active Overlay Stack</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {canvasState.images.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => setCanvasState(prev => ({ 
                          ...prev, 
                          selectedElementId: img.id, 
                          selectedElementType: 'image' 
                        }))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px',
                          border: '1px solid',
                          borderColor: canvasState.selectedElementId === img.id ? 'var(--cmyk-cyan)' : 'var(--border-muted)',
                          backgroundColor: 'var(--bg-input)',
                          cursor: 'pointer'
                        }}
                      >
                        <FileImage size={18} style={{ color: 'var(--cmyk-cyan)' }} />
                        <span style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {img.name}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          {img.viewSide}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* PRINT & CART SECTION */}
          {activeTab === 'print' && (
            <PrintTab 
              canvasState={canvasState} 
              onAddToCart={(item) => {
                setCartItems(prev => [...prev, { ...item, id: Math.random().toString(36).substr(2, 9) }]);
                setCartOpen(true);
              }} 
            />
          )}

        </div>

        {/* CENTER VIEWPORT PREVIEW CANVAS */}
        <main className="studio-viewport">
          {/* Download Mockup button — top right of canvas */}
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
          }}>
            <button
              id="download-mockup-btn"
              onClick={downloadMockup}
              disabled={isDownloading}
              title={`Download ${canvasState.viewSide} view as PNG`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 14px',
                backgroundColor: isDownloading ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '5px',
                color: isDownloading ? 'var(--text-dim)' : '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: isDownloading ? 'not-allowed' : 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!isDownloading) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,107,53,0.85)';
                  e.currentTarget.style.borderColor = '#ff6b35';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,107,53,0.35)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDownloading) {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.55)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.4)';
                }
              }}
            >
              <Download size={13} style={{ flexShrink: 0, opacity: isDownloading ? 0.4 : 1 }} />
              {isDownloading ? 'Exporting…' : 'Download Mockup'}
            </button>
          </div>

          {/* Active Blueprint specs watermarks */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            lineHeight: '1.5',
            zIndex: 1,
            pointerEvents: 'none'
          }}>
            <div>CANVAS: 500 x 500 PX</div>
            <div>BLUEPRINT: {canvasState.apparelType}</div>
            <div>SIDE: {canvasState.viewSide}</div>
            <div>LAYERS: {canvasState.vectors.length + canvasState.images.length} ACTIVE</div>
          </div>

          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            zIndex: 1,
            pointerEvents: 'none'
          }}>
            DESIGN CUSTOMS ENGINE // PRINTIFY-DEV
          </div>

          {/* The Apparel Preview SVG Canvas */}
          <ClothingPreview
            canvasState={canvasState}
            onChangeCanvasState={setCanvasState}
            stitchingConfig={stitchingConfig}
            onSvgRef={(el) => { previewSvgRef.current = el; }}
          />
        </main>

        {/* RIGHT SIDE DETAIL EDITOR PANEL */}
        <div className="studio-sidebar" style={{ borderLeft: '1px solid var(--border-muted)', width: '380px' }}>
          
          {selectedItem ? (
            <>
              {/* HEADER INFO */}
              <div className="control-segment" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="segment-title" style={{ marginBottom: '2px' }}>Selected Element</span>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    {canvasState.selectedElementType === 'vector' 
                      ? `Vector Emblem (${(selectedItem as VectorOverlay).type.toUpperCase()})` 
                      : canvasState.selectedElementType === 'pattern'
                      ? `Pattern Layer (${(selectedItem as import('../types').PatternSettings).type})`
                      : 'Uploaded Image Overlay'}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleDuplicateSelected}
                    style={{
                      padding: '8px',
                      color: 'var(--cmyk-cyan)',
                      border: '1px solid rgba(0,255,255,0.15)',
                      backgroundColor: 'rgba(0,255,255,0.03)',
                      cursor: 'pointer'
                    }}
                    title="Duplicate Element"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,255,255,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,255,255,0.03)'}
                  >
                    <Copy size={16} />
                  </button>
                  <button 
                    onClick={handleDeleteSelected}
                    style={{
                      padding: '8px',
                      color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.15)',
                      backgroundColor: 'rgba(239,68,68,0.03)',
                      cursor: 'pointer'
                    }}
                    title="Delete Element"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.03)'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* COORD LABELS IN MONOSPACE — hidden for patterns which have no x/y */}
              {canvasState.selectedElementType !== 'pattern' && (
                <div className="control-segment">
                  <span className="segment-title">
                    <Info size={14} style={{ color: 'var(--cmyk-cyan)' }} />
                    Vector Space Coordinates
                  </span>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    padding: '12px',
                    border: '1px solid var(--border-muted)',
                    borderRadius: '2px'
                  }}>
                    <div>X-COORD: <span style={{ color: 'var(--cmyk-cyan)' }}>{(selectedItem as VectorOverlay).x.toFixed(1)}</span></div>
                    <div>Y-COORD: <span style={{ color: 'var(--cmyk-cyan)' }}>{(selectedItem as VectorOverlay).y.toFixed(1)}</span></div>
                    <div>SCALE: <span style={{ color: 'var(--cmyk-magenta)' }}>{selectedItem.scale.toFixed(2)}</span></div>
                    <div>ROTATION: <span style={{ color: 'var(--cmyk-yellow)' }}>{selectedItem.rotation.toFixed(0)}°</span></div>
                    {canvasState.selectedElementType === 'image' && (
                      <div style={{ gridColumn: 'span 2', marginTop: '6px', borderTop: '1px solid var(--border-muted)', paddingTop: '6px' }}>
                        OPACITY: <span style={{ color: 'var(--text-main)' }}>{(selectedItem as ImageOverlay).opacity.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SLIDERS FOR POSITION, SCALE, ROTATION — layout differs by element type */}
              <div className="control-segment">
                <span className="segment-title">
                  <Sliders size={14} />
                  Precision Transform Controls
                </span>

                {/* Position X/Y sliders — only for vector and image (patterns are full-coverage) */}
                {canvasState.selectedElementType !== 'pattern' && (
                  <>
                    <div className="slider-group">
                      <div className="slider-label">
                        <span>X Position</span>
                        <span className="slider-val">{(selectedItem as VectorOverlay).x.toFixed(0)} px</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="450"
                        value={(selectedItem as VectorOverlay).x}
                        onChange={(e) => handleUpdateSelected('x', parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="slider-group">
                      <div className="slider-label">
                        <span>Y Position</span>
                        <span className="slider-val">{(selectedItem as VectorOverlay).y.toFixed(0)} px</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="450"
                        value={(selectedItem as VectorOverlay).y}
                        onChange={(e) => handleUpdateSelected('y', parseFloat(e.target.value))}
                      />
                    </div>
                  </>
                )}

                {/* Scale Slider — patterns use raw 5–200, vectors/images use 0.1–3 */}
                <div className="slider-group">
                  <div className="slider-label">
                    <span>Scale Modifier</span>
                    <span className="slider-val">
                      {canvasState.selectedElementType === 'pattern'
                        ? `${selectedItem.scale}%`
                        : `${(selectedItem.scale * 100).toFixed(0)}%`}
                    </span>
                  </div>
                  {canvasState.selectedElementType === 'pattern' ? (
                    <input
                      type="range"
                      min="5"
                      max="200"
                      value={selectedItem.scale}
                      onChange={(e) => handleUpdateSelected('scale', parseInt(e.target.value))}
                    />
                  ) : (
                    <input
                      type="range"
                      min="10"
                      max="300"
                      value={selectedItem.scale * 100}
                      onChange={(e) => handleUpdateSelected('scale', parseFloat(e.target.value) / 100)}
                    />
                  )}
                </div>

                {/* Rotation Slider */}
                <div className="slider-group">
                  <div className="slider-label">
                    <span>Rotation Angle</span>
                    <span className="slider-val">{selectedItem.rotation.toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={selectedItem.rotation}
                    onChange={(e) => handleUpdateSelected('rotation', parseFloat(e.target.value))}
                  />
                </div>

                {/* Opacity Slider for Image */}
                {canvasState.selectedElementType === 'image' && (
                  <div className="slider-group">
                    <div className="slider-label">
                      <span>Opacity</span>
                      <span className="slider-val">{((selectedItem as ImageOverlay).opacity * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(selectedItem as ImageOverlay).opacity * 100}
                      onChange={(e) => handleUpdateSelected('opacity', parseFloat(e.target.value) / 100)}
                    />
                  </div>
                )}

                {/* Opacity Slider for Pattern */}
                {canvasState.selectedElementType === 'pattern' && (
                  <div className="slider-group">
                    <div className="slider-label">
                      <span>Opacity</span>
                      <span className="slider-val">{((selectedItem as import('../types').PatternSettings).opacity * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(selectedItem as import('../types').PatternSettings).opacity * 100}
                      onChange={(e) => handleUpdateSelected('opacity', parseFloat(e.target.value) / 100)}
                    />
                  </div>
                )}
              </div>

              {/* VECTOR EMBLEM COLOR / TEXT STRING CONTROLS */}
              {canvasState.selectedElementType === 'vector' && (
                <div className="control-segment">
                  <span className="segment-title">Vector Fill Style</span>
                  
                  {/* If text, show text editor */}
                  {(selectedItem as VectorOverlay).type === 'text' && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Text String</label>
                      <input
                        type="text"
                        value={(selectedItem as VectorOverlay).textContent || ''}
                        onChange={(e) => handleUpdateSelected('textContent', e.target.value)}
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 10px',
                          fontSize: '0.8rem',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-strong)'
                        }}
                      />
                    </div>
                  )}

                  {/* Vector Color Picker */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="color-picker-trigger" style={{ backgroundColor: (selectedItem as VectorOverlay).color }}>
                      <input
                        type="color"
                        value={(selectedItem as VectorOverlay).color}
                        onChange={(e) => handleUpdateSelected('color', e.target.value)}
                      />
                    </div>
                    <span style={{ fontSize: '0.8rem' }}>Ink Color</span>
                    <span className="font-mono" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                      {(selectedItem as VectorOverlay).color.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {/* ADVANCED IMAGE OVERLAY ENGINE: COLOR-TINT & SVG FILTERS */}
              {canvasState.selectedElementType === 'image' && (
                <div className="control-segment">
                  <span className="segment-title">
                    <Sparkles size={14} style={{ color: 'var(--cmyk-cyan)' }} />
                    Color-Tint Filters (SVG Filters)
                  </span>

                  {/* Filter Type Toggle */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '16px' }}>
                    {(Object.keys(FilterType) as Array<keyof typeof FilterType>).map((f) => (
                      <button
                        key={f}
                        onClick={() => handleUpdateSelected('filterType', FilterType[f])}
                        style={{
                          padding: '8px 4px',
                          border: '1px solid',
                          borderColor: (selectedItem as ImageOverlay).filterType === FilterType[f] ? 'var(--cmyk-cyan)' : 'var(--border-strong)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: (selectedItem as ImageOverlay).filterType === FilterType[f] ? 'rgba(0,255,255,0.03)' : 'var(--bg-input)',
                          textTransform: 'uppercase'
                        }}
                      >
                        {f.toLowerCase()}
                      </button>
                    ))}
                  </div>

                  {/* Recolor controls only if not Original filter */}
                  {(selectedItem as ImageOverlay).filterType !== FilterType.ORIGINAL && (
                    <>
                      {/* Spectrum Picker Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                        <div className="color-picker-trigger" style={{ backgroundColor: (selectedItem as ImageOverlay).tintColor }}>
                          <input 
                            type="color" 
                            value={(selectedItem as ImageOverlay).tintColor} 
                            onChange={(e) => handleUpdateSelected('tintColor', e.target.value)}
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Custom spectrum picker</span>
                        <span className="font-mono" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                          {(selectedItem as ImageOverlay).tintColor.toUpperCase()}
                        </span>
                      </div>

                      {/* Quick CMYK Presets */}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>Quick Tint Presets</span>
                      <div className="cmyk-presets">
                        <button 
                          onClick={() => handleUpdateSelected('tintColor', '#000000')}
                          className="preset-btn" style={{ backgroundColor: '#000000', color: '#fff', borderColor: '#333' }}>
                          K
                        </button>
                        <button 
                          onClick={() => handleUpdateSelected('tintColor', '#ffff00')}
                          className="preset-btn" style={{ backgroundColor: '#ffff00', color: '#000', borderColor: '#dd0' }}>
                          Y
                        </button>
                        <button 
                          onClick={() => handleUpdateSelected('tintColor', '#ff00ff')}
                          className="preset-btn" style={{ backgroundColor: '#ff00ff', color: '#fff', borderColor: '#d0d' }}>
                          M
                        </button>
                        <button 
                          onClick={() => handleUpdateSelected('tintColor', '#00ffff')}
                          className="preset-btn" style={{ backgroundColor: '#00ffff', color: '#000', borderColor: '#0dd' }}>
                          C
                        </button>
                        <button 
                          onClick={() => {
                            handleUpdateSelected('tintColor', '#ffffff');
                            handleUpdateSelected('filterType', FilterType.ORIGINAL);
                          }}
                          className="preset-btn" style={{ backgroundColor: '#ffffff', color: '#000', borderColor: '#eee' }}>
                          RST
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
              padding: '40px',
              color: 'var(--text-dim)',
              textAlign: 'center',
              gap: '12px'
            }}>
              <Sliders size={36} strokeWidth={1} />
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>No Element Selected</h4>
                <p style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                  Tap any logo vector or uploaded image on the canvas to configure position, scale, opacity, and SVG ink-recolors.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* UPLOAD INTERSTITIAL PREVIEW MODAL */}
      {uploadModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} style={{ color: 'var(--cmyk-magenta)' }} />
                Preview Imported Asset
              </h3>
              <button 
                onClick={() => setUploadModal(prev => ({ ...prev, isOpen: false }))}
                style={{ color: 'var(--text-dim)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body">
              {/* Balanced Backdrop Frame */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '240px',
                backgroundColor: 'var(--bg-studio)',
                backgroundImage: 'var(--studio-grid)',
                backgroundSize: '16px 16px',
                border: '1px solid var(--border-strong)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
              }}>
                <img 
                  src={uploadModal.imageUrl} 
                  alt="Pre-upload content" 
                  style={{
                    maxWidth: '85%',
                    maxHeight: '85%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.5))'
                  }}
                />
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                width: '100%',
                marginTop: '16px',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>ASSET NAME:</span>
                  <span style={{ color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                    {uploadModal.fileName}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>ASPECT RATIO:</span>
                  <span style={{ color: 'var(--text-main)' }}>{uploadModal.aspectRatio.toFixed(3)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setUploadModal(prev => ({ ...prev, isOpen: false }))}
                style={{
                  padding: '10px 16px',
                  border: '1px solid var(--border-strong)',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Discard
              </button>
              <button
                onClick={handleImportOverlay}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--cmyk-cyan)',
                  color: '#000000',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#000000';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cmyk-cyan)';
                  e.currentTarget.style.color = '#000000';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Import as Overlay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Overlay */}
      {cartOpen && (
        <CartOverlay 
          items={cartItems}
          onClose={() => setCartOpen(false)}
          onUpdateQuantity={(id, qty) => setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item))}
          onRemoveItem={(id) => setCartItems(prev => prev.filter(item => item.id !== id))}
          onClearCart={() => setCartItems([])}
        />
      )}
    </div>
  );
};
