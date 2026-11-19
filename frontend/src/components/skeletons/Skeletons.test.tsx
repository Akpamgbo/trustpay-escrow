import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  ProjectCardSkeleton,
  ProjectCardSkeletonList,
  ProjectDetailSkeleton,
  TableRowSkeleton,
  TableRowSkeletonList,
  ProposalSkeletonList,
} from './index';

function MockQueryProjectGrid({ isPending, projects }: { isPending: boolean; projects: string[] }) {
  if (isPending) {
    return <ProjectCardSkeletonList count={3} />;
  }
  return (
    <div data-testid="loaded-project-list">
      {projects.map((title) => (
        <div key={title}>{title}</div>
      ))}
    </div>
  );
}

describe('Shimmer Skeleton Components (#168)', () => {
  it('mounts shimmer skeleton list while query is pending and swaps cleanly when data loads', () => {
    const { rerender } = render(<MockQueryProjectGrid isPending={true} projects={[]} />);

    expect(screen.getByTestId('project-skeleton-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('project-card-skeleton')).toHaveLength(3);
    expect(screen.queryByTestId('loaded-project-list')).not.toBeInTheDocument();

    rerender(<MockQueryProjectGrid isPending={false} projects={['Escrow UI', 'Soroban Audit']} />);

    expect(screen.queryByTestId('project-skeleton-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('loaded-project-list')).toBeInTheDocument();
    expect(screen.getByText('Escrow UI')).toBeInTheDocument();
  });

  it('renders GPU shimmer wave classes on ProjectCardSkeleton (default & freelancer)', () => {
    const { container: defaultContainer } = render(<ProjectCardSkeleton variant="default" />);
    expect(defaultContainer.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(0);

    const { container: freelancerContainer } = render(<ProjectCardSkeleton variant="freelancer" />);
    expect(screen.getByTestId('project-card-skeleton-freelancer')).toHaveAttribute('aria-busy', 'true');
    expect(freelancerContainer.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(0);
  });

  it('renders ProjectDetailSkeleton and TableRowSkeleton with shimmer classes', () => {
    const { container: detailContainer } = render(<ProjectDetailSkeleton />);
    expect(screen.getByTestId('project-detail-skeleton')).toHaveAttribute('aria-busy', 'true');
    expect(detailContainer.querySelectorAll('.skeleton-shimmer-slate').length).toBeGreaterThan(0);

    const { container: tableContainer } = render(<TableRowSkeletonList count={2} />);
    expect(screen.getAllByTestId('table-row-skeleton')).toHaveLength(2);
    expect(tableContainer.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(0);

    const { container: singleRowContainer } = render(<TableRowSkeleton />);
    expect(singleRowContainer.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(0);

    render(<ProposalSkeletonList count={2} />);
    expect(screen.getAllByTestId('proposal-card-skeleton')).toHaveLength(2);
  });
});
