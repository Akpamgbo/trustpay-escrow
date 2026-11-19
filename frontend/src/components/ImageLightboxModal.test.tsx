import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageLightboxModal } from './ImageLightboxModal';
import { DeliverableItem } from './DeliverablePreview';

const MULTI_DELIVERABLES: DeliverableItem[] = [
  { url: 'https://example.com/mockup-1.png', name: 'Homepage Mockup.png', type: 'image' },
  { url: 'https://example.com/mockup-2.png', name: 'Dashboard Schematic.png', type: 'image' },
  { url: 'https://example.com/spec.pdf', name: 'Escrow Spec.pdf', type: 'pdf' },
];

describe('ImageLightboxModal & DeliverablePreview (#147)', () => {
  it('renders bottom thumbnail filmstrip and navigates between multi-file deliverables', () => {
    render(
      <ImageLightboxModal
        items={MULTI_DELIVERABLES}
        initialIndex={0}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('lightbox-thumbnail-filmstrip')).toBeInTheDocument();
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('1 / 3');
    expect(screen.getByTestId('lightbox-active-image')).toHaveAttribute(
      'src',
      'https://example.com/mockup-1.png'
    );

    // Click second thumbnail
    fireEvent.click(screen.getByTestId('lightbox-thumb-1'));
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('2 / 3');
    expect(screen.getByTestId('lightbox-active-image')).toHaveAttribute(
      'src',
      'https://example.com/mockup-2.png'
    );

    // Navigate via Right Arrow to PDF deliverable
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('3 / 3');
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-download-link')).toHaveAttribute(
      'href',
      'https://example.com/spec.pdf'
    );

    // Navigate PDF pages
    expect(screen.getByTestId('pdf-page-indicator')).toHaveTextContent('Page 1');
    fireEvent.click(screen.getByRole('button', { name: /next pdf page/i }));
    expect(screen.getByTestId('pdf-page-indicator')).toHaveTextContent('Page 2');

    // Navigate back with Left Arrow
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('2 / 3');
  });

  it('updates zoom scale on keyboard +/- and wheel events (up to 400%) and closes on Esc', () => {
    const onClose = vi.fn();
    render(
      <ImageLightboxModal
        items={MULTI_DELIVERABLES}
        initialIndex={0}
        onClose={onClose}
      />
    );

    expect(screen.getByTestId('lightbox-zoom-indicator')).toHaveTextContent('100%');

    // Keyboard '+' zooms in by 25%
    fireEvent.keyDown(window, { key: '+' });
    expect(screen.getByTestId('lightbox-zoom-indicator')).toHaveTextContent('125%');

    // Wheel up zooms in further
    const stage = screen.getByTestId('lightbox-stage');
    fireEvent.wheel(stage, { deltaY: -100 });
    expect(screen.getByTestId('lightbox-zoom-indicator')).toHaveTextContent('150%');

    // Keyboard '-' zooms out
    fireEvent.keyDown(window, { key: '-' });
    expect(screen.getByTestId('lightbox-zoom-indicator')).toHaveTextContent('125%');

    // Zoom cap at 400%
    for (let i = 0; i < 20; i++) {
      fireEvent.keyDown(window, { key: '+' });
    }
    expect(screen.getByTestId('lightbox-zoom-indicator')).toHaveTextContent('400%');

    // Escape closes modal
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
