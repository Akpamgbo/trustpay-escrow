'use client';

import React, { useMemo, useState } from 'react';
import { Milestone } from '@/types';

export interface MilestoneProgressSummary {
  totalBudget: number;
  approvedAmount: number;
  inReviewAmount: number;
  pendingAmount: number;
  approvedPercent: number;
  inReviewPercent: number;
  pendingPercent: number;
  approvedCount: number;
  inReviewCount: number;
  pendingCount: number;
  totalCount: number;
  tickPositions: number[];
}

export function calculateMilestoneProgress(
  milestones: Pick<Milestone, 'amount' | 'status'>[] = [],
  totalBudget?: number
): MilestoneProgressSummary {
  const milestoneSum = milestones.reduce((sum, m) => sum + Math.max(0, Number(m.amount) || 0), 0);
  const effectiveTotal =
    totalBudget && totalBudget > 0 ? totalBudget : milestoneSum > 0 ? milestoneSum : 0;

  let approvedAmount = 0;
  let inReviewAmount = 0;
  let pendingAmount = 0;
  let approvedCount = 0;
  let inReviewCount = 0;
  let pendingCount = 0;

  for (const m of milestones) {
    const amt = Math.max(0, Number(m.amount) || 0);
    if (m.status === 'approved') {
      approvedAmount += amt;
      approvedCount += 1;
    } else if (m.status === 'submitted' || m.status === 'in_revision') {
      inReviewAmount += amt;
      inReviewCount += 1;
    } else {
      pendingAmount += amt;
      pendingCount += 1;
    }
  }

  const rawApprovedPct =
    effectiveTotal > 0 ? Math.min(100, (approvedAmount / effectiveTotal) * 100) : 0;
  const rawInReviewPct =
    effectiveTotal > 0
      ? Math.min(100 - rawApprovedPct, (inReviewAmount / effectiveTotal) * 100)
      : 0;
  const rawPendingPct = Math.max(0, 100 - rawApprovedPct - rawInReviewPct);

  // Compute cumulative tick mark positions (excluding 0% and 100%)
  const tickPositions: number[] = [];
  if (effectiveTotal > 0 && milestones.length > 1) {
    let cumulative = 0;
    for (let i = 0; i < milestones.length - 1; i++) {
      cumulative += Math.max(0, Number(milestones[i].amount) || 0);
      const pct = (cumulative / effectiveTotal) * 100;
      if (pct > 0 && pct < 100) {
        tickPositions.push(Number(pct.toFixed(2)));
      }
    }
  }

  return {
    totalBudget: effectiveTotal,
    approvedAmount,
    inReviewAmount,
    pendingAmount,
    approvedPercent: Math.round(rawApprovedPct * 10) / 10,
    inReviewPercent: Math.round(rawInReviewPct * 10) / 10,
    pendingPercent: Math.round(rawPendingPct * 10) / 10,
    approvedCount,
    inReviewCount,
    pendingCount,
    totalCount: milestones.length,
    tickPositions,
  };
}

export interface MilestoneProgressBarProps {
  milestones?: Milestone[];
  totalBudget?: number;
  token?: string;
  compact?: boolean;
  className?: string;
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function MilestoneProgressBar({
  milestones = [],
  totalBudget,
  token = 'USDC',
  compact = false,
  className = '',
}: MilestoneProgressBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const progress = useMemo(
    () => calculateMilestoneProgress(milestones, totalBudget),
    [milestones, totalBudget]
  );

  const roundedPercent = Math.round(progress.approvedPercent);
  const currencyPrefix = token === 'USDC' || token === 'PYUSD' ? '$' : '';

  return (
    <div
      className={`relative select-none ${compact ? 'space-y-1.5' : 'space-y-2.5'} ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      role="region"
      aria-label={`Milestone progress: ${roundedPercent}% completed`}
      data-testid="milestone-progress-bar"
    >
      {/* Header Row: Label + Percentage Badge */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`font-semibold ${compact ? 'text-[11px] text-[#a1a1aa]' : 'text-xs text-slate-300'}`}>
            Escrow Progress
          </span>
          <span className="text-[11px] text-[#71717a] truncate">
            ({progress.approvedCount}/{progress.totalCount} approved
            {progress.inReviewCount > 0 ? ` • ${progress.inReviewCount} in review` : ''})
          </span>
        </div>

        <span
          data-testid="milestone-progress-badge"
          className={`inline-flex items-center gap-1 font-bold rounded-full border px-2 py-0.5 shrink-0 ${
            roundedPercent === 100
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : roundedPercent > 0 || progress.inReviewCount > 0
              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
              : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60'
          } ${compact ? 'text-[10px]' : 'text-xs'}`}
        >
          <span>{roundedPercent}%</span>
          {!compact && <span className="font-medium opacity-80">Completed</span>}
        </span>
      </div>

      {/* Segmented Multi-Color Progress Track */}
      <div
        role="progressbar"
        aria-valuenow={roundedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`relative w-full overflow-hidden rounded-full bg-zinc-800/90 border border-zinc-700/60 flex ${
          compact ? 'h-2' : 'h-3'
        }`}
      >
        {/* Emerald = Approved */}
        <div
          data-testid="progress-segment-approved"
          style={{ width: `${progress.approvedPercent}%` }}
          className="relative h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 transition-all duration-700 ease-out overflow-hidden"
        >
          {progress.approvedPercent > 0 && <div className="progress-shimmer-overlay" />}
        </div>

        {/* Blue = In Review */}
        <div
          data-testid="progress-segment-review"
          style={{ width: `${progress.inReviewPercent}%` }}
          className="relative h-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-400 transition-all duration-700 ease-out overflow-hidden"
        >
          {progress.inReviewPercent > 0 && <div className="progress-shimmer-overlay" />}
        </div>

        {/* Grey = Pending */}
        <div
          data-testid="progress-segment-pending"
          style={{ width: `${progress.pendingPercent}%` }}
          className="h-full bg-zinc-700/40 transition-all duration-700 ease-out"
        />

        {/* Milestone Tick Marks */}
        {progress.tickPositions.map((pos, idx) => (
          <div
            key={idx}
            style={{ left: `${pos}%` }}
            className="absolute top-0 bottom-0 w-px bg-black/50 pointer-events-none z-10"
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Legend Row (Full mode only) */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-0.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                Approved ({currencyPrefix}
                {formatAmount(progress.approvedAmount)} {token})
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>
                In Review ({currencyPrefix}
                {formatAmount(progress.inReviewAmount)} {token})
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              <span>
                Pending ({currencyPrefix}
                {formatAmount(progress.pendingAmount)} {token})
              </span>
            </span>
          </div>
          <span className="font-mono text-slate-300 font-semibold">
            {currencyPrefix}
            {formatAmount(progress.approvedAmount)} / {currencyPrefix}
            {formatAmount(progress.totalBudget)} {token}
          </span>
        </div>
      )}

      {/* Hover Tooltip with Escrowed Breakdown */}
      {showTooltip && (
        <div
          role="tooltip"
          data-testid="milestone-progress-tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-30 w-64 rounded-xl bg-[#18181b] border border-[#3f3f46] shadow-2xl p-3 text-xs text-zinc-200 pointer-events-none"
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#27272a]">
            <span className="font-bold text-white">Escrow Breakdown</span>
            <span className="font-mono font-bold text-emerald-400">{roundedPercent}%</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-emerald-400">Completed / Approved:</span>
              <span className="font-mono font-semibold text-white">
                {currencyPrefix}
                {formatAmount(progress.approvedAmount)} {token}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-400">In Review:</span>
              <span className="font-mono text-zinc-200">
                {currencyPrefix}
                {formatAmount(progress.inReviewAmount)} {token}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Pending:</span>
              <span className="font-mono text-zinc-300">
                {currencyPrefix}
                {formatAmount(progress.pendingAmount)} {token}
              </span>
            </div>
            <div className="flex justify-between pt-1 mt-1 border-t border-[#27272a] font-semibold">
              <span className="text-zinc-300">Total Escrowed:</span>
              <span className="font-mono text-white">
                {currencyPrefix}
                {formatAmount(progress.totalBudget)} {token}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
