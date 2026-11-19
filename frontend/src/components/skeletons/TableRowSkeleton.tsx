'use client';

import React from 'react';

export function TableRowSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading table row"
      data-testid="table-row-skeleton"
      className="flex items-center justify-between p-4 bg-[#1c1c20]/60 border border-[#27272a] rounded-xl gap-4 min-h-[68px]"
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-full skeleton-shimmer shrink-0" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="h-4 w-1/3 max-w-[180px] rounded skeleton-shimmer" />
          <div className="h-3 w-1/2 max-w-[260px] rounded skeleton-shimmer opacity-70" />
        </div>
      </div>
      <div className="h-6 w-20 rounded-md skeleton-shimmer shrink-0" />
      <div className="h-6 w-16 rounded-full skeleton-shimmer shrink-0" />
      <span className="sr-only">Loading row...</span>
    </div>
  );
}

export interface TableRowSkeletonListProps {
  count?: number;
}

export function TableRowSkeletonList({ count = 4 }: TableRowSkeletonListProps) {
  return (
    <div className="space-y-3" data-testid="table-row-skeleton-list" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <TableRowSkeleton key={index} />
      ))}
    </div>
  );
}

export function ProposalCardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading proposal card"
      data-testid="proposal-card-skeleton"
      className="bg-[#1c1c20]/80 border border-[#27272a] rounded-xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-h-[156px]"
    >
      <div className="space-y-3 max-w-xl flex-1">
        <div className="flex items-center space-x-2">
          <div className="h-5 w-44 rounded skeleton-shimmer" />
          <div className="h-4 w-20 rounded skeleton-shimmer opacity-75" />
        </div>

        <div className="h-4 w-48 rounded skeleton-shimmer opacity-80" />

        <div className="space-y-1.5 pt-1">
          <div className="h-3.5 w-full rounded skeleton-shimmer opacity-70" />
          <div className="h-3.5 w-4/5 rounded skeleton-shimmer opacity-55" />
        </div>

        <div className="h-3.5 w-32 rounded skeleton-shimmer opacity-65" />
      </div>

      <div className="self-start shrink-0">
        <div className="h-7 w-24 rounded-full skeleton-shimmer" />
      </div>
      <span className="sr-only">Loading proposal...</span>
    </div>
  );
}

export interface ProposalSkeletonListProps {
  count?: number;
}

export function ProposalSkeletonList({ count = 3 }: ProposalSkeletonListProps) {
  return (
    <div className="space-y-4" data-testid="proposal-skeleton-list" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <ProposalCardSkeleton key={index} />
      ))}
    </div>
  );
}
