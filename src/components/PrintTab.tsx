import React, { useState, useEffect } from 'react';
import { ShoppingCart, PackageOpen, Tag, Info, Ruler } from 'lucide-react';
import { ApparelType, PatternType } from '../types';
import type { CanvasState, PrintQuality, FabricType, ApparelSize, CartItem } from '../types';

interface PrintTabProps {
  canvasState: CanvasState;
  onAddToCart: (item: Omit<CartItem, 'id'>) => void;
}

export const PrintTab: React.FC<PrintTabProps> = ({ canvasState, onAddToCart }) => {
  const [quality, setQuality] = useState<PrintQuality>('standard');
  const [fabric, setFabric] = useState<FabricType>('cotton');
  const [size, setSize] = useState<ApparelSize>('M');
  const [quantity, setQuantity] = useState<number>(1);
  const [estimatedPrice, setEstimatedPrice] = useState<number>(18);

  useEffect(() => {
    let base = 18;
    if (quality === 'premium') base += 8;
    if (quality === 'ultra') base += 20;

    if (fabric === 'organic') base += 4;
    if (fabric === 'triblend') base += 6;

    // Additional charge for complex graphics
    base += canvasState.vectors.length * 1.5;

    setEstimatedPrice(base * quantity);
  }, [quality, fabric, size, quantity, canvasState.vectors.length]);

  const handleAddToCart = () => {
    onAddToCart({
      apparelType: canvasState.apparelType,
      baseColor: canvasState.baseColor,
      patternCount: canvasState.patterns.filter(p => p.type !== PatternType.NONE).length,
      vectorCount: canvasState.vectors.length,
      printQuality: quality,
      fabricType: fabric,
      size,
      quantity,
      unitPrice: estimatedPrice / quantity,
      previewSnapshot: canvasState.baseColor,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto', paddingRight: '4px' }}>
      
      {/* SECTION 1: CONFIGURATION */}
      <div className="control-segment">
        <span className="segment-title">
          <PackageOpen size={14} style={{ color: '#ff6b35' }} />
          Production Settings
        </span>
        
        {/* Quality */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>Print Quality</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['standard', 'premium', 'ultra'] as PrintQuality[]).map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: quality === q ? 'rgba(255, 107, 53, 0.1)' : 'var(--bg-input)',
                  border: `1px solid ${quality === q ? '#ff6b35' : 'var(--border-strong)'}`,
                  color: quality === q ? '#ff6b35' : 'var(--text-main)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  borderRadius: '3px'
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Fabric */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>Fabric Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {(['cotton', 'polyester', 'organic', 'triblend'] as FabricType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFabric(f)}
                style={{
                  padding: '8px',
                  backgroundColor: fabric === f ? 'rgba(255, 107, 53, 0.1)' : 'var(--bg-input)',
                  border: `1px solid ${fabric === f ? '#ff6b35' : 'var(--border-strong)'}`,
                  color: fabric === f ? '#ff6b35' : 'var(--text-main)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  borderRadius: '3px'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Size & Quantity */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>Size</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as ApparelSize)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-main)',
                borderRadius: '3px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            >
              {(['XS', 'S', 'M', 'L', 'XL', 'XXL'] as ApparelSize[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>Quantity</label>
            <div style={{ display: 'flex', height: '33px' }}>
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{ width: '33px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >-</button>
              <input 
                type="number" 
                value={quantity}
                readOnly
                style={{ flex: 1, minWidth: 0, textAlign: 'center', backgroundColor: 'var(--bg-input)', borderTop: '1px solid var(--border-strong)', borderBottom: '1px solid var(--border-strong)', borderLeft: 'none', borderRight: 'none', color: 'var(--text-main)', WebkitAppearance: 'none', margin: 0 }}
              />
              <button 
                onClick={() => setQuantity(quantity + 1)}
                style={{ width: '33px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >+</button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: TECHNICAL PRINT GUIDE */}
      <div className="control-segment">
        <span className="segment-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Ruler size={14} style={{ color: '#ff6b35' }} /> Print Guide Display</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', border: '1px solid var(--border-strong)', padding: '2px 4px', borderRadius: '2px' }}>READ ONLY</span>
        </span>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.4 }}>
          Technical reference for production. Approximate boundaries based on a standard 50x70cm print area.
        </p>

        <div style={{ 
          width: '100%', 
          aspectRatio: '16/9', 
          backgroundColor: '#111', 
          border: '1px dashed var(--border-strong)', 
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          padding: '10px',
          gap: '10px'
        }}>
          {/* Front Guide */}
          <div style={{ flex: 1, border: '1px solid #333', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
              FRONT
            </div>
            {/* Mock Print Area Boundary */}
            <div style={{ position: 'absolute', top: '15%', bottom: '15%', left: '20%', right: '20%', border: '1px dashed #ff6b35', opacity: 0.6 }}>
              {/* Registration Marks */}
              <div style={{ position: 'absolute', top: -5, left: -5, width: 10, height: 10, borderTop: '1px solid #fff', borderLeft: '1px solid #fff' }} />
              <div style={{ position: 'absolute', top: -5, right: -5, width: 10, height: 10, borderTop: '1px solid #fff', borderRight: '1px solid #fff' }} />
              <div style={{ position: 'absolute', bottom: -5, left: -5, width: 10, height: 10, borderBottom: '1px solid #fff', borderLeft: '1px solid #fff' }} />
              <div style={{ position: 'absolute', bottom: -5, right: -5, width: 10, height: 10, borderBottom: '1px solid #fff', borderRight: '1px solid #fff' }} />
            </div>
             {/* Center Line */}
             <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', borderLeft: '1px dotted rgba(255,255,255,0.2)' }} />
          </div>

          {/* Back Guide */}
          <div style={{ flex: 1, border: '1px solid #333', position: 'relative' }}>
             <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
              BACK
            </div>
            {/* Mock Print Area Boundary */}
            <div style={{ position: 'absolute', top: '15%', bottom: '15%', left: '20%', right: '20%', border: '1px dashed #ff6b35', opacity: 0.6 }}>
               {/* Registration Marks */}
              <div style={{ position: 'absolute', top: -5, left: -5, width: 10, height: 10, borderTop: '1px solid #fff', borderLeft: '1px solid #fff' }} />
              <div style={{ position: 'absolute', top: -5, right: -5, width: 10, height: 10, borderTop: '1px solid #fff', borderRight: '1px solid #fff' }} />
              <div style={{ position: 'absolute', bottom: -5, left: -5, width: 10, height: 10, borderBottom: '1px solid #fff', borderLeft: '1px solid #fff' }} />
              <div style={{ position: 'absolute', bottom: -5, right: -5, width: 10, height: 10, borderBottom: '1px solid #fff', borderRight: '1px solid #fff' }} />
            </div>
             {/* Center Line */}
             <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', borderLeft: '1px dotted rgba(255,255,255,0.2)' }} />
          </div>
          
          {/* CMYK Strip */}
          <div style={{ position: 'absolute', bottom: 4, right: 4, display: 'flex', gap: '2px' }}>
            <div style={{ width: 8, height: 8, backgroundColor: '#00ffff' }} />
            <div style={{ width: 8, height: 8, backgroundColor: '#ff00ff' }} />
            <div style={{ width: 8, height: 8, backgroundColor: '#ffff00' }} />
            <div style={{ width: 8, height: 8, backgroundColor: '#000000', border: '1px solid #333' }} />
          </div>
        </div>
      </div>

      {/* SECTION 3: ADD TO CART */}
      <div className="control-segment" style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Estimated Total</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ff6b35' }}>${estimatedPrice.toFixed(2)}</span>
        </div>
        
        <button
          onClick={handleAddToCart}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#ff6b35',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            fontSize: '0.9rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <ShoppingCart size={18} />
          ADD TO CART
        </button>
      </div>

    </div>
  );
};
