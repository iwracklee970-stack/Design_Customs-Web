import React, { useRef, useState } from 'react';
import { ApparelType, ViewSide, PatternType, FilterType } from '../types';
import type { CanvasState, VectorOverlay, ImageOverlay } from '../types';
import { APPAREL_PATH_SHAPES, PRESET_VECTORS, CANVAS_SIZE } from './VectorAssets';

interface ClothingPreviewProps {
  canvasState: CanvasState;
  onChangeCanvasState: (state: CanvasState) => void;
  // Stitching toggles & colors from editor state
  stitchingConfig: {
    collar: { enabled: boolean; color: string };
    sleeve: { enabled: boolean; color: string };
    hem: { enabled: boolean; color: string };
  };
  // Expose the SVG element ref to parent so it can trigger PNG export
  onSvgRef?: (el: SVGSVGElement | null) => void;
}

export const ClothingPreview: React.FC<ClothingPreviewProps> = ({
  canvasState,
  onChangeCanvasState,
  stitchingConfig,
  onSvgRef
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Notify parent whenever the SVG element mounts/unmounts
  const setSvgRef = (el: SVGSVGElement | null) => {
    (svgRef as React.MutableRefObject<SVGSVGElement | null>).current = el;
    onSvgRef?.(el);
  };
  
  // Dragging and Transformation interaction state
  const [interaction, setInteraction] = useState<{
    mode: 'drag' | 'transform' | null;
    elementId: string;
    elementType: 'vector' | 'image';
    startX: number;
    startY: number;
    startElementX: number;
    startElementY: number;
    startScale: number;
    startScaleX?: number;
    startScaleY?: number;
    startRotation: number;
  } | null>(null);

  // Active element helper
  const getActiveElement = () => {
    if (!canvasState.selectedElementId) return null;
    if (canvasState.selectedElementType === 'vector') {
      return canvasState.vectors.find(v => v.id === canvasState.selectedElementId);
    } else {
      return canvasState.images.find(img => img.id === canvasState.selectedElementId);
    }
  };

  const activeElement = getActiveElement();

  // Helper to convert client coordinates to SVG canvas viewBox coordinates
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((clientY - rect.top) / rect.height) * CANVAS_SIZE;
    return { x, y };
  };

  const handlePointerDown = (
    e: React.PointerEvent,
    elementId: string,
    type: 'vector' | 'image',
    mode: 'drag' | 'transform' = 'drag'
  ) => {
    e.stopPropagation();
    
    // Select the element
    onChangeCanvasState({
      ...canvasState,
      selectedElementId: elementId,
      selectedElementType: type
    });

    const target = type === 'vector' 
      ? canvasState.vectors.find(v => v.id === elementId) 
      : canvasState.images.find(img => img.id === elementId);

    if (!target) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    
    setInteraction({
      mode,
      elementId,
      elementType: type,
      startX: coords.x,
      startY: coords.y,
      startElementX: target.x,
      startElementY: target.y,
      startScale: target.scale,
      startRotation: target.rotation
    });

    // Capture pointer to make dragging continuous even outside bounding box
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interaction) return;
    e.stopPropagation();

    const coords = getCanvasCoords(e.clientX, e.clientY);
    const target = interaction.elementType === 'vector'
      ? canvasState.vectors.find(v => v.id === interaction.elementId)
      : canvasState.images.find(img => img.id === interaction.elementId);

    if (!target) return;

    if (interaction.mode === 'drag') {
      const dx = coords.x - interaction.startX;
      const dy = coords.y - interaction.startY;
      
      const newX = interaction.startElementX + dx;
      const newY = interaction.startElementY + dy;

      if (interaction.elementType === 'vector') {
        onChangeCanvasState({
          ...canvasState,
          vectors: canvasState.vectors.map(v => 
            v.id === interaction.elementId ? { ...v, x: newX, y: newY } : v
          )
        });
      } else {
        onChangeCanvasState({
          ...canvasState,
          images: canvasState.images.map(img => 
            img.id === interaction.elementId ? { ...img, x: newX, y: newY } : img
          )
        });
      }
    } else if (interaction.mode === 'transform') {
      // Transform mode (resize and rotate handle clicked)
      // Vector from center of the element to initial click
      const centerX = interaction.startElementX;
      const centerY = interaction.startElementY;

      const initialDx = interaction.startX - centerX;
      const initialDy = interaction.startY - centerY;
      const initialDist = Math.hypot(initialDx, initialDy);
      const initialAngle = Math.atan2(initialDy, initialDx);

      // Vector from center of the element to current pointer position
      const currentDx = coords.x - centerX;
      const currentDy = coords.y - centerY;
      const currentDist = Math.hypot(currentDx, currentDy);
      const currentAngle = Math.atan2(currentDy, currentDx);

      // Calculate new scale and rotation
      const scaleMultiplier = currentDist / initialDist;
      const newScale = Math.max(0.1, interaction.startScale * scaleMultiplier);

      const deltaAngle = currentAngle - initialAngle;
      const newRotation = (interaction.startRotation + deltaAngle * (180 / Math.PI)) % 360;

      if (interaction.elementType === 'vector') {
        onChangeCanvasState({
          ...canvasState,
          vectors: canvasState.vectors.map(v => 
            v.id === interaction.elementId ? { ...v, scale: newScale, rotation: newRotation } : v
          )
        });
      } else {
        onChangeCanvasState({
          ...canvasState,
          images: canvasState.images.map(img => 
            img.id === interaction.elementId ? { ...img, scale: newScale, rotation: newRotation } : img
          )
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!interaction) return;
    e.stopPropagation();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setInteraction(null);
  };

  // Click outside to deselect
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).id === 'base-apparel') {
      onChangeCanvasState({
        ...canvasState,
        selectedElementId: null,
        selectedElementType: null
      });
    }
  };

  // Get current apparel paths
  const shapes = APPAREL_PATH_SHAPES[canvasState.apparelType];
  const apparelSilhouette = canvasState.viewSide === ViewSide.FRONT ? shapes.FRONT : shapes.BACK;
  const stitches = shapes.STITCHES;

  // Filter out elements not belonging to the current viewSide
  const currentVectors = canvasState.vectors.filter(v => v.viewSide === canvasState.viewSide);
  const currentImages = canvasState.images.filter(img => img.viewSide === canvasState.viewSide);

  // Helper to calculate bounding box corners for rendering dashed borders and control handles
  const renderSelectionOutline = () => {
    if (!activeElement) return null;
    
    // Render selection border only if element belongs to active viewSide
    if (activeElement.viewSide !== canvasState.viewSide) return null;

    const { x, y, scale, rotation } = activeElement;
    
    let width: number;
    let height: number;

    if (canvasState.selectedElementType === 'image') {
      const img = activeElement as ImageOverlay;
      // Image base size is 120 x (120/aspectRatio)
      width = 150 * scale;
      height = (150 / img.aspectRatio) * scale;
    } else {
      width = 80 * scale;
      height = 80 * scale;
    }

    const halfW = width / 2;
    const halfH = height / 2;

    // Handle path is at the bottom right corner
    const handleX = halfW;
    const handleY = halfH;

    return (
      <g transform={`translate(${x}, ${y}) rotate(${rotation})`} style={{ pointerEvents: 'none' }}>
        {/* Dashed outer boundary */}
        <rect
          x={-halfW}
          y={-halfH}
          width={width}
          height={height}
          fill="none"
          stroke="var(--cmyk-cyan)"
          strokeWidth="1.5"
          strokeDasharray="4,4"
        />
        
        {/* Transform / Rotate handles (only interactable via mouse/touch) */}
        {/* Bottom Right Corner Resize/Rotate Handle */}
        <circle
          cx={handleX}
          cy={handleY}
          r="8"
          fill="var(--bg-panel)"
          stroke="var(--cmyk-magenta)"
          strokeWidth="2"
          style={{ pointerEvents: 'auto', cursor: 'nwse-resize' }}
          onPointerDown={(e) => handlePointerDown(e, activeElement.id, canvasState.selectedElementType!, 'transform')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        
        {/* Element Center cross */}
        <line x1="-5" y1="0" x2="5" y2="0" stroke="var(--cmyk-cyan)" strokeWidth="1" />
        <line x1="0" y1="-5" x2="0" y2="5" stroke="var(--cmyk-cyan)" strokeWidth="1" />
      </g>
    );
  };

  // Dynamically render a vector shape
  const renderVectorShape = (vec: VectorOverlay) => {
    if (vec.type === 'text') {
      return (
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="central"
          fill={vec.color}
          fontSize="24"
          fontFamily="var(--font-mono)"
          fontWeight="600"
        >
          {vec.textContent || 'TEXT'}
        </text>
      );
    }

    const preset = PRESET_VECTORS[vec.type as keyof typeof PRESET_VECTORS];
    if (!preset) return null;

    if (preset.strokeOnly) {
      return (
        <path
          d={preset.path}
          fill="none"
          stroke={vec.color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    return (
      <path
        d={preset.path}
        fill={vec.color}
        stroke={vec.color}
        strokeWidth="1"
      />
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg
        ref={setSvgRef}
        viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
        style={{
          width: '90%',
          height: '90%',
          maxHeight: '680px',
          maxWidth: '680px',
          filter: 'drop-shadow(0 20px 45px rgba(0,0,0,0.55))',
          userSelect: 'none',
          touchAction: 'none'
        }}
        onClick={handleCanvasClick}
      >
        <defs>
          {/* Dynamic Clip Path for Apparel bounds */}
          <clipPath id="apparel-clip-path">
            <path d={apparelSilhouette} />
          </clipPath>

          {/* SVG Patterns for Textures — rendered in reverse so list-top = visually on top */}
          {[...canvasState.patterns].reverse().map((pattern) => (
            <pattern
              key={pattern.id}
              id={`apparel-pattern-${pattern.id}`}
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
              patternTransform={`rotate(${pattern.rotation}) scale(${pattern.scale / 40})`}
            >
              {pattern.type === PatternType.STRIPES && (
                <line x1="0" y1="0" x2="0" y2="40" stroke={pattern.color} strokeWidth="4" />
              )}
              
              {pattern.type === PatternType.GRID && (
                <path d="M 0 0 L 40 0 M 0 0 L 0 40" stroke={pattern.color} strokeWidth="1.5" fill="none" />
              )}
              
              {pattern.type === PatternType.DOTS && (
                <circle cx="20" cy="20" r="3.5" fill={pattern.color} />
              )}
              
              {pattern.type === PatternType.TEXTURE && (
                <path
                  d="M 0,10 L 10,0 M 30,40 L 40,30 M 0,30 L 30,0 M 10,40 L 40,10 M 0,20 L 20,0 M 20,40 L 40,20"
                  stroke={pattern.color}
                  strokeWidth="1"
                  fill="none"
                  opacity="0.75"
                />
              )}

              {pattern.type === PatternType.ZIGZAG && (
                <path d="M 0,10 L 10,0 L 20,10 L 30,0 L 40,10 M 0,30 L 10,20 L 20,30 L 30,20 L 40,30" stroke={pattern.color} strokeWidth="2" fill="none" />
              )}

              {pattern.type === PatternType.CROSSHATCH && (
                <path d="M 0,0 L 40,40 M 40,0 L 0,40 M 20,0 L 20,40 M 0,20 L 40,20" stroke={pattern.color} strokeWidth="1" fill="none" opacity="0.8" />
              )}
            </pattern>
          ))}

          {/* Dynamic Image Recolor Filters */}
          {canvasState.images.map((img) => {
            if (img.filterType === FilterType.MONOCHROME) {
              return (
                <filter id={`filter-mono-${img.id}`} key={img.id} x="-20%" y="-20%" width="140%" height="140%">
                  <feFlood flood-color={img.tintColor} flood-opacity="1" result="flood" />
                  <feComposite in="flood" in2="SourceGraphic" operator="in" />
                </filter>
              );
            }
            if (img.filterType === FilterType.DUOTONE) {
              const r = parseInt(img.tintColor.substring(1, 3), 16) / 255;
              const g = parseInt(img.tintColor.substring(3, 5), 16) / 255;
              const b = parseInt(img.tintColor.substring(5, 7), 16) / 255;
              return (
                <filter id={`filter-duo-${img.id}`} key={img.id} x="-20%" y="-20%" width="140%" height="140%">
                  {/* Step 1: Grayscale conversion */}
                  <feColorMatrix 
                    type="matrix" 
                    values="0.30 0.59 0.11 0 0  0.30 0.59 0.11 0 0  0.30 0.59 0.11 0 0  0 0 0 1 0" 
                    result="gray" 
                  />
                  {/* Step 2: Custom transfer to color */}
                  <feComponentTransfer in="gray">
                    <feFuncR type="table" tableValues={`0 ${r}`} />
                    <feFuncG type="table" tableValues={`0 ${g}`} />
                    <feFuncB type="table" tableValues={`0 ${b}`} />
                  </feComponentTransfer>
                </filter>
              );
            }
            return null;
          })}
        </defs>

        {/* 1. Base Clothing Fill & Stroke (Non-clipped base) */}
        <path
          id="base-apparel"
          d={apparelSilhouette}
          fill={canvasState.baseColor}
          stroke="var(--border-strong)"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* CLIPPED CONTENTS (Everything inside is constrained to shirt bounds) */}
        <g clipPath="url(#apparel-clip-path)">
          
          {/* 2. Procedural Texture Pattern Overlays — reversed: list-top renders on top */}
          {[...canvasState.patterns].reverse().map((pattern) => (
            pattern.type !== PatternType.NONE && (
              <path
                key={`path-${pattern.id}`}
                d={apparelSilhouette}
                fill={`url(#apparel-pattern-${pattern.id})`}
                opacity={pattern.opacity}
                style={{ pointerEvents: 'none' }}
              />
            )
          ))}

          {/* 3. Base Apparel Shading / Lighting Details (Provides 3D realism overlay) */}
          {/* Subtle shading curves */}
          <path
            d={canvasState.viewSide === ViewSide.FRONT 
              ? `M 155,165 Q 250,190 345,165` 
              : `M 155,165 Q 250,175 345,165`}
            fill="none"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="2"
            style={{ pointerEvents: 'none' }}
          />

          {/* Hoodie drawstrings & hood overlay */}
          {canvasState.apparelType === ApparelType.HOODIE && (
            <g style={{ pointerEvents: 'none' }}>
              {/* Outer Hood back outline */}
              <path d={stitches.HOOD} fill="rgba(0,0,0,0.08)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              {canvasState.viewSide === ViewSide.FRONT && (
                <>
                  {/* Drawstrings */}
                  <path d={stitches.DRAWSTRING_L} fill="none" stroke="#222" strokeWidth="3.5" strokeLinecap="round" />
                  <circle cx="233" cy="195" r="4.5" fill="var(--cmyk-cyan)" />
                  <path d={stitches.DRAWSTRING_R} fill="none" stroke="#222" strokeWidth="3.5" strokeLinecap="round" />
                  <circle cx="267" cy="195" r="4.5" fill="var(--cmyk-magenta)" />
                  {/* Pocket silhouette */}
                  <path d={stitches.POCKET} fill="rgba(0,0,0,0.06)" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                </>
              )}
            </g>
          )}

          {/* 4. Structural Stitches (Snaps strictly to seams) */}
          <g fill="none" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.8" style={{ pointerEvents: 'none' }}>
            {stitchingConfig.collar.enabled && (
              <path 
                d={canvasState.viewSide === ViewSide.FRONT ? stitches.COLLAR : stitches.COLLAR_BACK} 
                stroke={stitchingConfig.collar.color} 
              />
            )}
            {stitchingConfig.sleeve.enabled && (
              <>
                <path d={stitches.SLEEVE_L} stroke={stitchingConfig.sleeve.color} />
                <path d={stitches.SLEEVE_R} stroke={stitchingConfig.sleeve.color} />
                {canvasState.apparelType === ApparelType.LONG_SLEEVE && stitches.CUFF_L && (
                  <>
                    <path d={stitches.CUFF_L} stroke={stitchingConfig.sleeve.color} />
                    <path d={stitches.CUFF_R} stroke={stitchingConfig.sleeve.color} />
                  </>
                )}
              </>
            )}
            {stitchingConfig.hem.enabled && (
              <path d={stitches.HEM} stroke={stitchingConfig.hem.color} />
            )}
          </g>

          {/* 5. Custom Emblems / Vector Overlays — reversed: list-top renders on top */}
          {[...currentVectors].reverse().map((vec) => (
            <g
              key={vec.id}
              transform={`translate(${vec.x}, ${vec.y}) rotate(${vec.rotation}) scale(${vec.scale})`}
              onPointerDown={(e) => handlePointerDown(e, vec.id, 'vector')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                cursor: interaction?.elementId === vec.id ? 'grabbing' : 'grab',
                pointerEvents: 'auto'
              }}
            >
              {/* Invisible larger hover catcher for easy mouse select */}
              <rect x="-40" y="-40" width="80" height="80" fill="transparent" />
              {renderVectorShape(vec)}
            </g>
          ))}

          {/* 6. Absolute Top Layering - Uploaded Image Overlays */}
          {currentImages.map((img) => {
            const imgWidth = 150 * img.scale;
            const imgHeight = (150 / img.aspectRatio) * img.scale;
            
            return (
              <g
                key={img.id}
                transform={`translate(${img.x}, ${img.y}) rotate(${img.rotation})`}
                onPointerDown={(e) => handlePointerDown(e, img.id, 'image')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{
                  cursor: interaction?.elementId === img.id ? 'grabbing' : 'grab',
                  pointerEvents: 'auto'
                }}
              >
                {/* Image element */}
                <image
                  href={img.url}
                  x={-imgWidth / 2}
                  y={-imgHeight / 2}
                  width={imgWidth}
                  height={imgHeight}
                  opacity={img.opacity}
                  filter={
                    img.filterType !== FilterType.ORIGINAL 
                      ? `url(#filter-${img.filterType === FilterType.MONOCHROME ? 'mono' : 'duo'}-${img.id})` 
                      : undefined
                  }
                />
              </g>
            );
          })}
        </g>

        {/* 7. Active Selection boundary (rendered above clip path to avoid edge cut-offs) */}
        {renderSelectionOutline()}
      </svg>
      
      {/* Visual center axis helper lines inside studio (subtle backdrop design) */}
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: '1px',
        borderLeft: '1px dashed var(--border-muted)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        height: '1px',
        borderTop: '1px dashed var(--border-muted)',
        pointerEvents: 'none'
      }} />
    </div>
  );
};
