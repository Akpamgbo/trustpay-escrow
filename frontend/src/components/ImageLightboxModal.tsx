'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  DeliverableItem,
  PdfViewer,
  detectDeliverableType,
} from './DeliverablePreview';

export interface ImageLightboxModalProps {
  imageUrl?: string | null;
  imageAlt?: string;
  items?: DeliverableItem[];
  initialIndex?: number;
  onClose: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.25;

export function ImageLightboxModal({
  imageUrl = null,
  imageAlt = 'Project File Attachment',
  items,
  initialIndex = 0,
  onClose,
}: ImageLightboxModalProps) {
  const galleryItems = useMemo<DeliverableItem[]>(() => {
    if (items && items.length > 0) {
      return items.map((item) => ({
        ...item,
        type: item.type || detectDeliverableType(item.url, item.name),
      }));
    }
    if (imageUrl) {
      return [
        {
          url: imageUrl,
          name: imageAlt,
          type: detectDeliverableType(imageUrl, imageAlt),
        },
      ];
    }
    return [];
  }, [items, imageUrl, imageAlt]);

  const isOpen = galleryItems.length > 0;

  const safeInitialIndex = Math.min(
    Math.max(0, initialIndex),
    Math.max(0, galleryItems.length - 1)
  );

  const [activeIndex, setActiveIndex] = useState<number>(safeInitialIndex);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(
    null
  );

  // Sync activeIndex and reset transform when modal opens or initialIndex changes
  useEffect(() => {
    setActiveIndex(safeInitialIndex);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, [safeInitialIndex, imageUrl, items]);

  const activeItem = galleryItems[activeIndex] || galleryItems[0];

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => {
      const next = Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2)));
      if (next <= 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleSelectIndex = useCallback(
    (index: number) => {
      if (galleryItems.length === 0) return;
      const wrapped = ((index % galleryItems.length) + galleryItems.length) % galleryItems.length;
      setActiveIndex(wrapped);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    },
    [galleryItems.length]
  );

  const handlePrev = useCallback(() => {
    handleSelectIndex(activeIndex - 1);
  }, [activeIndex, handleSelectIndex]);

  const handleNext = useCallback(() => {
    handleSelectIndex(activeIndex + 1);
  }, [activeIndex, handleSelectIndex]);

  // Keyboard shortcuts: Left/Right arrows, Esc, +, -, 0
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' && galleryItems.length > 1) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' && galleryItems.length > 1) {
        e.preventDefault();
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, galleryItems.length, onClose, handleNext, handlePrev, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Mousewheel zoom handler (up to 400%)
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (activeItem?.type === 'pdf') return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setZoomLevel((prev) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((prev + delta).toFixed(2))));
      if (next <= 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  }, [activeItem?.type]);

  // Pointer drag-to-pan handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomLevel <= 1 || activeItem?.type === 'pdf') return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      originX: panOffset.x,
      originY: panOffset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: dragStartRef.current.originX + dx,
      y: dragStartRef.current.originY + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  if (!isOpen || !activeItem) return null;

  const isPdf = activeItem.type === 'pdf';
  const zoomPercent = Math.round(zoomLevel * 100);

  const modalJsx = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Deliverable viewer: ${activeItem.name}`}
      data-testid="image-lightbox-modal"
      className="fixed inset-0 z-[9999] bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6"
    >
      {/* Top Toolbar */}
      <div className="w-full max-w-6xl flex flex-wrap items-center justify-between gap-3 z-10 pb-3 border-b border-[#27272a]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-white bg-[#232326] px-3 py-1.5 rounded-lg border border-[#333338] truncate max-w-[220px] sm:max-w-md">
            {isPdf ? '📄' : '📷'} {activeItem.name}
          </span>
          {galleryItems.length > 1 && (
            <span
              data-testid="lightbox-counter"
              className="text-xs font-mono text-[#a1a1aa] bg-[#18181b] px-2.5 py-1 rounded-lg border border-[#27272a]"
            >
              {activeIndex + 1} / {galleryItems.length}
            </span>
          )}
          {!isPdf && (
            <span
              data-testid="lightbox-zoom-indicator"
              className="text-xs text-[#a1a1aa] font-mono bg-[#18181b] px-2 py-1 rounded-lg border border-[#27272a]"
            >
              {zoomPercent}%
            </span>
          )}
        </div>

        {/* Zoom Controls, Download & Close */}
        <div className="flex items-center gap-2">
          {!isPdf && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= MIN_ZOOM}
                aria-label="Zoom out"
                className="p-2 bg-[#232326] hover:bg-[#27272a] disabled:opacity-40 text-white rounded-xl border border-[#333338] text-xs font-bold transition-all"
                title="Zoom Out (-)"
              >
                🔎 -
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                aria-label="Reset zoom"
                className="px-3 py-2 bg-[#232326] hover:bg-[#27272a] text-white rounded-xl border border-[#333338] text-xs font-bold transition-all"
                title="Reset Zoom (0)"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= MAX_ZOOM}
                aria-label="Zoom in"
                className="p-2 bg-[#232326] hover:bg-[#27272a] disabled:opacity-40 text-white rounded-xl border border-[#333338] text-xs font-bold transition-all"
                title="Zoom In (+)"
              >
                🔍 +
              </button>
            </>
          )}

          <a
            href={activeItem.url}
            download={activeItem.name}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-[#232326] hover:bg-[#27272a] text-[#e4e4e7] rounded-xl border border-[#333338] text-xs font-bold transition-all"
            title="Download file"
          >
            ⬇ Download
          </a>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close lightbox"
            className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all ml-1"
            title="Close Lightbox (Esc)"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Main Media Stage */}
      <div
        data-testid="lightbox-stage"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`flex-1 w-full flex items-center justify-center overflow-hidden p-4 relative my-auto ${
          !isPdf && zoomLevel > 1
            ? isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : ''
        }`}
      >
        {/* Previous / Next Navigation Arrows */}
        {galleryItems.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Previous deliverable"
              className="absolute left-3 sm:left-6 z-20 w-10 h-10 rounded-full bg-[#18181b]/90 hover:bg-[#27272a] text-white border border-[#3f3f46] flex items-center justify-center text-lg font-bold shadow-xl transition-all"
              title="Previous (Left Arrow)"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Next deliverable"
              className="absolute right-3 sm:right-6 z-20 w-10 h-10 rounded-full bg-[#18181b]/90 hover:bg-[#27272a] text-white border border-[#3f3f46] flex items-center justify-center text-lg font-bold shadow-xl transition-all"
              title="Next (Right Arrow)"
            >
              ›
            </button>
          </>
        )}

        {isPdf ? (
          <PdfViewer url={activeItem.url} name={activeItem.name} zoomLevel={zoomLevel} />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={activeItem.url}
            alt={activeItem.name}
            draggable={false}
            data-testid="lightbox-active-image"
            style={{
              transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomLevel})`,
            }}
            className={`max-h-[70vh] max-w-[88vw] object-contain rounded-2xl shadow-2xl border border-[#333338] select-none ${
              isDragging ? '' : 'transition-transform duration-150 ease-out'
            }`}
          />
        )}
      </div>

      {/* Bottom Thumbnail Filmstrip & Shortcut Hints */}
      <div className="w-full max-w-5xl z-10 pt-2 space-y-2">
        {galleryItems.length > 1 && (
          <div
            data-testid="lightbox-thumbnail-filmstrip"
            className="flex items-center justify-center gap-2 overflow-x-auto py-1.5 px-2"
          >
            {galleryItems.map((item, idx) => {
              const isActive = idx === activeIndex;
              const itemIsPdf = item.type === 'pdf';
              return (
                <button
                  key={`${item.url}-${idx}`}
                  type="button"
                  onClick={() => handleSelectIndex(idx)}
                  aria-label={`Select deliverable ${idx + 1}: ${item.name}`}
                  aria-current={isActive ? 'true' : undefined}
                  data-testid={`lightbox-thumb-${idx}`}
                  className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border transition-all ${
                    isActive
                      ? 'border-blue-500 ring-2 ring-blue-500/70 scale-105 opacity-100'
                      : 'border-[#333338] opacity-60 hover:opacity-100 hover:border-[#52525b]'
                  }`}
                >
                  {itemIsPdf ? (
                    <div className="w-full h-full bg-[#232326] flex flex-col items-center justify-center text-[10px] font-bold text-red-400">
                      <span>📄</span>
                      <span>PDF</span>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="text-center text-[11px] text-[#71717a]">
          {isPdf
            ? 'Use Prev/Next page controls • Arrows to switch files • Esc to close'
            : 'Scroll or +/- to zoom (up to 400%) • Drag to pan when zoomed • Arrows to navigate • Esc to close'}
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modalJsx, document.body) : null;
}
