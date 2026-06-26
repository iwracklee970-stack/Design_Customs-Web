import React, { useState } from 'react';
import { X, ShoppingBag, Truck, CreditCard, CheckCircle2 } from 'lucide-react';
import type { CartItem } from '../types';

interface CartOverlayProps {
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

type CheckoutStep = 'cart' | 'shipping' | 'confirm' | 'success';

export const CartOverlay: React.FC<CartOverlayProps> = ({ items, onClose, onUpdateQuantity, onRemoveItem, onClearCart }) => {
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [shippingTier, setShippingTier] = useState<'standard' | 'express'>('standard');
  const [orderNumber, setOrderNumber] = useState('');

  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const shippingCost = shippingTier === 'express' ? 15 : 5;
  const total = subtotal + shippingCost;

  const handleCheckout = () => setStep('shipping');
  
  const handleConfirmOrder = () => {
    setOrderNumber(`DC-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`);
    setStep('success');
  };

  const handleFinish = () => {
    onClearCart();
    onClose();
  };

  if (items.length === 0 && step === 'cart') {
    return (
      <div style={overlayStyle}>
        <div style={panelStyle}>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <ShoppingBag size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h2>Your cart is empty</h2>
            <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>Add some custom apparel to get started.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <button onClick={step === 'success' ? handleFinish : onClose} style={closeBtnStyle}><X size={20} /></button>
        
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-muted)', backgroundColor: 'var(--bg-studio)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {step === 'cart' && <><ShoppingBag size={20} /> Shopping Cart</>}
            {step === 'shipping' && <><Truck size={20} /> Shipping Details</>}
            {step === 'confirm' && <><CreditCard size={20} /> Review Order</>}
            {step === 'success' && <><CheckCircle2 size={20} color="#10b981" /> Order Confirmed</>}
          </h2>
          {step !== 'success' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: step === 'cart' ? 'var(--text-main)' : '' }}>01 CART</span> — 
              <span style={{ color: step === 'shipping' ? 'var(--text-main)' : '' }}>02 SHIPPING</span> — 
              <span style={{ color: step === 'confirm' ? 'var(--text-main)' : '' }}>03 CONFIRM</span>
            </div>
          )}
        </div>

        <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
          
          {step === 'cart' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: '16px', padding: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-strong)', borderRadius: '4px' }}>
                  <div style={{ width: '80px', height: '80px', backgroundColor: item.previewSnapshot, borderRadius: '4px', border: '1px solid var(--border-muted)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.apparelType.replace('_', ' ')}</span>
                      <span style={{ fontWeight: 700 }}>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '12px' }}>
                      <span>Size: {item.size}</span>
                      <span>Fabric: {item.fabricType}</span>
                      <span>Quality: {item.printQuality}</span>
                      <span>Layers: {item.patternCount + item.vectorCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: '2px' }}>
                        <button onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))} style={qtyBtnStyle}>-</button>
                        <span style={{ padding: '0 12px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} style={qtyBtnStyle}>+</button>
                      </div>
                      <button onClick={() => onRemoveItem(item.id)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '0.75rem', cursor: 'pointer' }}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-strong)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <span>Shipping</span>
                  <span>Calculated next step</span>
                </div>
                <button onClick={handleCheckout} style={primaryBtnStyle}>PROCEED TO CHECKOUT</button>
              </div>
            </div>
          )}

          {step === 'shipping' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Shipping Address</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input type="text" placeholder="Full Name" style={inputStyle} />
                  <input type="email" placeholder="Email Address" style={inputStyle} />
                  <input type="text" placeholder="Street Address" style={inputStyle} />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="text" placeholder="City" style={{...inputStyle, flex: 2}} />
                    <input type="text" placeholder="State/ZIP" style={{...inputStyle, flex: 1}} />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Shipping Method</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={radioContainerStyle(shippingTier === 'standard')}>
                    <input type="radio" name="shipping" checked={shippingTier === 'standard'} onChange={() => setShippingTier('standard')} style={{ marginRight: '12px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Standard Delivery</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>5-7 business days</div>
                    </div>
                    <span style={{ fontWeight: 600 }}>$5.00</span>
                  </label>
                  <label style={radioContainerStyle(shippingTier === 'express')}>
                    <input type="radio" name="shipping" checked={shippingTier === 'express'} onChange={() => setShippingTier('express')} style={{ marginRight: '12px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Express Delivery</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>2-3 business days</div>
                    </div>
                    <span style={{ fontWeight: 600 }}>$15.00</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button onClick={() => setStep('cart')} style={secondaryBtnStyle}>Back</button>
                <button onClick={() => setStep('confirm')} style={{...primaryBtnStyle, flex: 1}}>REVIEW ORDER</button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: 'rgba(255,107,53,0.1)', border: '1px solid #ff6b35', borderRadius: '4px' }}>
                <p style={{ fontSize: '0.8rem', color: '#ff6b35', margin: 0, lineHeight: 1.4 }}>
                  <strong>Note:</strong> Orders are fulfilled and shipped by Design Customs Print Partners. 
                  No payment is required for this demo.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Order Summary</h3>
                <div style={{ border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '16px' }}>
                  {items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
                      <span>{item.quantity}x {item.apparelType.replace('_', ' ')}</span>
                      <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px dashed var(--border-strong)', margin: '12px 0', padding: '12px 0 0 0', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '12px' }}>
                    <span>Shipping ({shippingTier})</span>
                    <span>${shippingCost.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: '#10b981' }}>
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep('shipping')} style={secondaryBtnStyle}>Back</button>
                <button onClick={handleConfirmOrder} style={{...primaryBtnStyle, flex: 1, backgroundColor: '#10b981', color: '#fff'}}>CONFIRM & PLACE ORDER</button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <CheckCircle2 size={64} color="#10b981" style={{ marginBottom: '24px' }} />
              <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Order Placed Successfully!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                Your order is now being processed by our print partners.
              </p>
              <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-strong)', padding: '16px', borderRadius: '4px', display: 'inline-block', marginBottom: '32px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Order Number</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{orderNumber}</div>
              </div>
              <br />
              <button onClick={handleFinish} style={{...primaryBtnStyle, width: 'auto', padding: '12px 32px'}}>RETURN TO STUDIO</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)',
  zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const panelStyle: React.CSSProperties = {
  width: '100%', maxWidth: '600px', maxHeight: '90vh',
  backgroundColor: 'var(--bg-studio)',
  border: '1px solid var(--border-muted)',
  borderRadius: '8px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
  display: 'flex', flexDirection: 'column',
  position: 'relative'
};

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute', top: '24px', right: '24px',
  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
  padding: '4px'
};

const qtyBtnStyle: React.CSSProperties = {
  width: '28px', height: '28px', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const inputStyle: React.CSSProperties = {
  padding: '12px',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-strong)',
  borderRadius: '4px',
  color: 'var(--text-main)',
  fontSize: '0.85rem',
  outline: 'none'
};

const radioContainerStyle = (checked: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', padding: '16px',
  border: `1px solid ${checked ? 'var(--cmyk-cyan)' : 'var(--border-strong)'}`,
  backgroundColor: checked ? 'rgba(0,255,255,0.05)' : 'var(--bg-input)',
  borderRadius: '4px', cursor: 'pointer'
});

const primaryBtnStyle: React.CSSProperties = {
  width: '100%', padding: '14px',
  backgroundColor: 'var(--text-main)', color: 'var(--bg-studio)',
  border: 'none', borderRadius: '4px',
  fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer'
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '14px 24px',
  backgroundColor: 'transparent', color: 'var(--text-main)',
  border: '1px solid var(--border-strong)', borderRadius: '4px',
  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
};
