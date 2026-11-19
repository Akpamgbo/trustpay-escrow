import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  MilestoneProgressBar,
  calculateMilestoneProgress,
} from './MilestoneProgressBar';
import { Milestone } from '@/types';

const WEIGHTED_MILESTONES: Milestone[] = [
  { id: 'm1', milestone_index: 0, title: 'Design', amount: 250, status: 'approved' },
  { id: 'm2', milestone_index: 1, title: 'Smart Contract', amount: 500, status: 'submitted' },
  { id: 'm3', milestone_index: 2, title: 'Deployment', amount: 250, status: 'pending' },
];

describe('MilestoneProgressBar (#171)', () => {
  it('computes weighted completion percentages accurately across statuses', () => {
    const summary = calculateMilestoneProgress(WEIGHTED_MILESTONES, 1000);
    expect(summary.totalBudget).toBe(1000);
    expect(summary.approvedAmount).toBe(250);
    expect(summary.inReviewAmount).toBe(500);
    expect(summary.pendingAmount).toBe(250);
    expect(summary.approvedPercent).toBe(25);
    expect(summary.inReviewPercent).toBe(50);
    expect(summary.pendingPercent).toBe(25);
    expect(summary.tickPositions).toEqual([25, 75]);
  });

  it('handles uneven milestone weights and empty milestone lists safely', () => {
    const uneven = calculateMilestoneProgress(
      [
        { amount: 700, status: 'approved' },
        { amount: 300, status: 'pending' },
      ],
      1000
    );
    expect(uneven.approvedPercent).toBe(70);
    expect(uneven.pendingPercent).toBe(30);

    const empty = calculateMilestoneProgress([], 0);
    expect(empty.approvedPercent).toBe(0);
    expect(empty.totalBudget).toBe(0);
  });

  it('renders segmented bars with CSS transition classes and hover tooltip breakdown', () => {
    render(
      <MilestoneProgressBar
        milestones={WEIGHTED_MILESTONES}
        totalBudget={1000}
        token="USDC"
      />
    );

    expect(screen.getByTestId('milestone-progress-badge')).toHaveTextContent('25%');

    const approvedSeg = screen.getByTestId('progress-segment-approved');
    const reviewSeg = screen.getByTestId('progress-segment-review');
    const pendingSeg = screen.getByTestId('progress-segment-pending');

    expect(approvedSeg).toHaveClass('transition-all', 'duration-700', 'ease-out');
    expect(reviewSeg).toHaveClass('transition-all', 'duration-700', 'ease-out');
    expect(pendingSeg).toHaveClass('transition-all', 'duration-700', 'ease-out');

    expect(approvedSeg).toHaveStyle({ width: '25%' });
    expect(reviewSeg).toHaveStyle({ width: '50%' });

    // Hover to reveal tooltip with completed dollar amount vs total escrowed
    const container = screen.getByTestId('milestone-progress-bar');
    fireEvent.mouseEnter(container);

    const tooltip = screen.getByTestId('milestone-progress-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('$250 USDC');
    expect(tooltip).toHaveTextContent('$1,000 USDC');
  });
});
