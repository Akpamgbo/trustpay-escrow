'use client';

import React, { useState } from 'react';

export interface DeliverableItem {
  url: string;
  name: string;
  type?: 'image' | 'pdf' | 'file';
}

export function detectDeliverableType(url: string, name = ''): 'image' | 'pdf' | 'file' {
  const target = `${url} ${name}`.toLowerCase();
  if (
    target.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$|\s)/i) ||
    url.startsWith('data:image/')
  ) {
    return 'image';
  }
  if (target.match(/\.pdf(\?|$|\s)/i) || url.startsWith('data:application/pdf')) {
    return 'pdf';
  }
  return 'file';
}

export function normalizeDeliverables(rawFiles: any[] = []): DeliverableItem[] {
  return rawFiles
    .map((file, idx): DeliverableItem | null => {
      if (!file) return null;
      if (typeof file === 'string') {
        const cleanName = file.split('/').pop()?.split('?')[0] || `Deliverable ${idx + 1}`;
        return {
          url: file,
          name: cleanName,
          type: detectDeliverableType(file, cleanName),
        };
      }
      const url = file.file_url || file.url || file.file_name || file.name || '';
      const name = file.file_name || file.name || `Deliverable ${idx + 1}`;
      if (!url) return null;
      return {
        url,
        name,
        type: file.type || detectDeliverableType(url, name),
      };
    })
    .filter((item): item is DeliverableItem => item !== null);
}

export interface PdfViewerProps {
  url: string;
  name: string;
  zoomLevel?: number;
}

export function PdfViewer({ url, name, zoomLevel = 1 }: PdfViewerProps) {
  const [page, setPage] = useState<number>(1);

  const handlePrevPage = () => setPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setPage((p) => p + 1);

  const iframeSrc = url.startsWith('data:')
    ? url
    : `${url}#page=${page}&zoom=${Math.round(zoomLevel * 100)}`;

  return (
    <div
      data-testid="pdf-viewer"
      className="w-full max-w-4xl h-[74vh] flex flex-col bg-[#18181b] border border-[#333338] rounded-2xl overflow-hidden shadow-2xl"
    >
      {/* PDF Navigation & Download Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#232326] border-b border-[#333338]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-red-500/15 text-red-400 border border-red-500/30">
            PDF
          </span>
          <span className="text-xs font-semibold text-white truncate max-w-[220px] sm:max-w-xs">
            {name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={page <= 1}
            aria-label="Previous PDF page"
            className="px-2.5 py-1 bg-[#18181b] hover:bg-[#27272a] disabled:opacity-40 text-white rounded-lg border border-[#3f3f46] text-xs font-semibold transition-colors"
          >
            ← Prev
          </button>
          <span
            data-testid="pdf-page-indicator"
            className="text-xs font-mono text-[#e4e4e7] px-2 py-1 bg-[#18181b] rounded-lg border border-[#333338]"
          >
            Page {page}
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            aria-label="Next PDF page"
            className="px-2.5 py-1 bg-[#18181b] hover:bg-[#27272a] text-white rounded-lg border border-[#3f3f46] text-xs font-semibold transition-colors"
          >
            Next →
          </button>

          <a
            href={url}
            download={name}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="pdf-download-link"
            className="ml-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
          >
            <span>⬇</span>
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      {/* Embedded PDF Document Frame */}
      <div className="flex-1 bg-[#0f0f12] relative overflow-auto">
        <iframe
          key={`${url}-p${page}`}
          src={iframeSrc}
          title={name}
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}

export interface DeliverablePreviewProps {
  items: DeliverableItem[];
  onInspect: (index: number) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function DeliverablePreview({
  items,
  onInspect,
  size = 'sm',
  className = '',
}: DeliverablePreviewProps) {
  if (!items || items.length === 0) return null;

  const thumbSize = size === 'md' ? 'w-20 h-20' : 'w-12 h-12';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} data-testid="deliverable-preview-list">
      {items.map((item, idx) => {
        const type = item.type || detectDeliverableType(item.url, item.name);

        if (type === 'image') {
          return (
            <button
              key={`${item.url}-${idx}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(idx);
              }}
              aria-label={`Inspect image ${item.name}`}
              className="relative group/img cursor-pointer overflow-hidden rounded-lg border border-[#333338] hover:border-blue-500 transition-all shadow-sm bg-[#18181b]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.name}
                className={`${thumbSize} object-cover transform group-hover/img:scale-110 transition-transform duration-200`}
              />
              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity">
                🔍 Zoom
              </div>
            </button>
          );
        }

        if (type === 'pdf') {
          return (
            <button
              key={`${item.url}-${idx}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(idx);
              }}
              aria-label={`Preview PDF ${item.name}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#232326] hover:bg-[#2a2a30] text-[#e4e4e7] text-xs rounded-lg border border-red-500/30 hover:border-red-400 transition-all cursor-pointer"
            >
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-500/20 text-red-300">
                PDF
              </span>
              <span className="truncate max-w-[140px] font-mono text-[11px]">{item.name}</span>
              <span className="text-[10px] text-blue-400">Preview</span>
            </button>
          );
        }

        return (
          <a
            key={`${item.url}-${idx}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#232326] hover:bg-[#27272a] text-[#e4e4e7] text-[11px] rounded-lg border border-[#333338] font-mono transition-colors"
          >
            <span>📄</span>
            <span className="truncate max-w-[140px]">{item.name}</span>
          </a>
        );
      })}
    </div>
  );
}
