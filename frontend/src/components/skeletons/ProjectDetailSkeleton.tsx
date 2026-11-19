'use client';

import React from 'react';

export function ProjectDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading project details"
      className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24"
      data-testid="project-detail-skeleton"
    >
      {/* Top Banner matching projects/[id]/page.tsx */}
      <div className="h-64 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 relative border-b border-slate-800/80" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-44 relative z-10">
        {/* Top Navigation Bar Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="h-9 w-36 rounded-xl skeleton-shimmer-slate" />
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-40 rounded-full skeleton-shimmer-slate" />
            <div className="h-7 w-24 rounded-full skeleton-shimmer-slate" />
          </div>
        </div>

        {/* Project Header Card Skeleton */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl mb-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <div className="h-6 w-28 rounded-lg skeleton-shimmer-slate" />
                <div className="h-4 w-24 rounded skeleton-shimmer-slate opacity-75" />
              </div>
              <div className="h-9 w-2/3 max-w-lg rounded-xl skeleton-shimmer-slate" />
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl min-w-[220px] space-y-2">
              <div className="h-3.5 w-28 rounded skeleton-shimmer-slate opacity-75" />
              <div className="h-8 w-36 rounded-lg skeleton-shimmer-slate" />
            </div>
          </div>

          {/* Overview Description Skeleton */}
          <div className="space-y-2.5">
            <div className="h-4 w-36 rounded skeleton-shimmer-slate opacity-80" />
            <div className="h-4 w-full rounded skeleton-shimmer-slate opacity-70" />
            <div className="h-4 w-11/12 rounded skeleton-shimmer-slate opacity-65" />
            <div className="h-4 w-3/4 rounded skeleton-shimmer-slate opacity-55" />
          </div>

          {/* Participant Wallets Strip Skeleton */}
          <div className="pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((slot) => (
              <div key={slot} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="h-3 w-24 rounded skeleton-shimmer-slate opacity-75" />
                <div className="h-4 w-40 rounded skeleton-shimmer-slate" />
              </div>
            ))}
          </div>
        </div>

        {/* Milestones Section Skeleton */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-7 w-48 rounded-lg skeleton-shimmer-slate" />
              <div className="h-6 w-8 rounded-full skeleton-shimmer-slate" />
            </div>
            <div className="h-5 w-32 rounded skeleton-shimmer-slate opacity-75" />
          </div>

          {/* Milestone Progress Bar Skeleton */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-36 rounded skeleton-shimmer-slate" />
              <div className="h-5 w-24 rounded-full skeleton-shimmer-slate" />
            </div>
            <div className="h-3 w-full rounded-full skeleton-shimmer-slate" />
          </div>

          {/* Milestone Cards Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-h-[112px]"
              >
                <div className="space-y-2.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-10 rounded-lg skeleton-shimmer-slate" />
                    <div className="h-5 w-52 rounded skeleton-shimmer-slate" />
                  </div>
                  <div className="h-4 w-4/5 max-w-md rounded skeleton-shimmer-slate opacity-70" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-24 rounded-xl skeleton-shimmer-slate" />
                  <div className="h-9 w-28 rounded-xl skeleton-shimmer-slate" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading project details...</span>
    </div>
  );
}
