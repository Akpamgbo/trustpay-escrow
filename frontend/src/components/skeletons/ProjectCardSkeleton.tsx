'use client';

import React from 'react';

export interface ProjectCardSkeletonProps {
  variant?: 'default' | 'freelancer';
}

export function ProjectCardSkeleton({ variant = 'default' }: ProjectCardSkeletonProps) {
  if (variant === 'freelancer') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading freelancer project card"
        data-testid="project-card-skeleton-freelancer"
        className="bg-[#1c1c20]/90 border border-[#27272a] rounded-2xl p-4 sm:p-5 md:p-6 space-y-3.5 shadow-lg min-h-[192px]"
      >
        {/* Header Row matching FreelancerDashboard project card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 rounded-md skeleton-shimmer" />
              <div className="h-4 w-32 rounded-md skeleton-shimmer opacity-75" />
            </div>
            <div className="h-6 w-3/4 max-w-md rounded-md skeleton-shimmer" />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1 sm:pt-0">
            <div className="h-8 w-24 rounded-xl skeleton-shimmer" />
            <div className="h-8 w-24 rounded-xl skeleton-shimmer" />
          </div>
        </div>

        {/* Description lines matching line-clamp-2 */}
        <div className="space-y-1.5 pt-0.5">
          <div className="h-4 w-full rounded-md skeleton-shimmer opacity-80" />
          <div className="h-4 w-4/5 rounded-md skeleton-shimmer opacity-60" />
        </div>

        {/* Milestone progress & tags footer matching FreelancerDashboard */}
        <div className="pt-3 border-t border-[#27272a]/60 space-y-2.5">
          <div className="h-2 w-full rounded-full skeleton-shimmer opacity-75" />
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-5 w-24 rounded-md skeleton-shimmer opacity-70" />
            <div className="h-5 w-32 rounded-md skeleton-shimmer opacity-60" />
            <div className="h-5 w-28 rounded-md skeleton-shimmer opacity-60" />
          </div>
        </div>
        <span className="sr-only">Loading project...</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading project card"
      data-testid="project-card-skeleton"
      className="bg-[#1c1c20]/80 border border-[#27272a] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-h-[116px]"
    >
      <div className="space-y-2.5 flex-1 min-w-0">
        {/* Title placeholder matching text-base sm:text-lg */}
        <div className="h-6 w-2/5 max-w-xs rounded-md skeleton-shimmer" />

        {/* Subtitle / Budget & Milestone summary placeholder */}
        <div className="h-4 w-3/5 max-w-md rounded-md skeleton-shimmer opacity-80" />

        {/* Progress bar & attachment pills placeholder */}
        <div className="pt-1 space-y-2">
          <div className="h-2 w-full max-w-sm rounded-full skeleton-shimmer opacity-70" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-16 rounded-md skeleton-shimmer opacity-75" />
            <div className="h-6 w-20 rounded-md skeleton-shimmer opacity-65" />
          </div>
        </div>
      </div>

      {/* Right status & escrow badge placeholder */}
      <div className="self-start sm:self-center flex flex-col items-end gap-1.5 shrink-0">
        <div className="h-5 w-28 rounded-full skeleton-shimmer opacity-75" />
        <div className="h-7 w-24 rounded-full skeleton-shimmer" />
      </div>
      <span className="sr-only">Loading project...</span>
    </div>
  );
}

export interface ProjectCardSkeletonListProps {
  count?: number;
  variant?: 'default' | 'freelancer';
}

export function ProjectCardSkeletonList({ count = 3, variant = 'default' }: ProjectCardSkeletonListProps) {
  return (
    <div className="space-y-4" data-testid="project-skeleton-list" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <ProjectCardSkeleton key={index} variant={variant} />
      ))}
    </div>
  );
}
