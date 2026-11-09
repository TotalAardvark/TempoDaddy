import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SharePlaylistQrModal } from './SharePlaylistQrModal';
import {
  TEMPO_DADDY_QR_BADGE_SVG,
  TEMPO_DADDY_QR_BADGE_DATA_URI,
} from '../assets/qrLogoBadge';
import type { Playlist, Skill } from '../types';

describe('QR Logo Badge Asset (Option 2: Inverted Dark Badge)', () => {
  it('exports a valid SVG string with inverted dark tile and metronome landmarks', () => {
    expect(TEMPO_DADDY_QR_BADGE_SVG).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(TEMPO_DADDY_QR_BADGE_SVG).toContain('viewBox="0 0 512 512"');
    expect(TEMPO_DADDY_QR_BADGE_SVG).toContain('fill="#111111"'); // Obsidian tile background
    expect(TEMPO_DADDY_QR_BADGE_SVG).toContain('fill="#1E2229"'); // Gunmetal metronome body
    expect(TEMPO_DADDY_QR_BADGE_SVG).toContain('stroke="#FFFFFF"'); // White beveled metronome wireframe & ticker arm
    expect(TEMPO_DADDY_QR_BADGE_SVG).toContain('fill="#FFFFFF"'); // Pure white reversed mustache fill
    expect(TEMPO_DADDY_QR_BADGE_SVG).toContain('rx="112"'); // Squircle badge corner radius
  });

  it('exports a valid base64 data URI that decodes back to the SVG', () => {
    expect(TEMPO_DADDY_QR_BADGE_DATA_URI).toMatch(/^data:image\/svg\+xml;base64,/);
    const b64Data = TEMPO_DADDY_QR_BADGE_DATA_URI.replace('data:image/svg+xml;base64,', '');
    const decoded = atob(b64Data);
    expect(decoded).toBe(TEMPO_DADDY_QR_BADGE_SVG);
  });
});

describe('SharePlaylistQrModal', () => {
  const mockPlaylist: Playlist = {
    id: 'p-1',
    name: 'Speed & Endurance',
    skillIds: ['s-1', 's-2'],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const mockSkills: Skill[] = [
    {
      id: 's-1',
      title: 'Single Stroke Roll',
      category: 'drumming',
      personalBestBpm: 120,
      targetBpm: 160,
      subdivision: '1/16',
      isTriplet: false,
      order: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 's-2',
      title: 'Double Stroke Roll',
      category: 'drumming',
      personalBestBpm: 100,
      targetBpm: 140,
      subdivision: '1/16',
      isTriplet: false,
      order: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SharePlaylistQrModal
        isOpen={false}
        onClose={vi.fn()}
        playlist={mockPlaylist}
        skills={mockSkills}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when playlist is null', () => {
    const { container } = render(
      <SharePlaylistQrModal
        isOpen={true}
        onClose={vi.fn()}
        playlist={null}
        skills={mockSkills}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders playlist name, skill count, QR canvas, and action buttons', () => {
    render(
      <SharePlaylistQrModal
        isOpen={true}
        onClose={vi.fn()}
        playlist={mockPlaylist}
        skills={mockSkills}
      />
    );

    expect(screen.getByText('Speed & Endurance')).toBeTruthy();
    expect(screen.getByText('2 skills')).toBeTruthy();
    expect(screen.getByText('Copy Share Link')).toBeTruthy();
    expect(screen.getByText('Save QR Image')).toBeTruthy();

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <SharePlaylistQrModal
        isOpen={true}
        onClose={onClose}
        playlist={mockPlaylist}
        skills={mockSkills}
      />
    );

    const closeBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles copy share link to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <SharePlaylistQrModal
        isOpen={true}
        onClose={vi.fn()}
        playlist={mockPlaylist}
        skills={mockSkills}
      />
    );

    const copyBtn = screen.getByText('Copy Share Link');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock.mock.calls[0][0]).toContain('#import=');
  });

  it('handles QR code download without throwing', () => {
    // Mock HTMLCanvasElement.toDataURL
    const toDataURLMock = vi.fn().mockReturnValue('data:image/png;base64,mockPngData');
    HTMLCanvasElement.prototype.toDataURL = toDataURLMock;

    render(
      <SharePlaylistQrModal
        isOpen={true}
        onClose={vi.fn()}
        playlist={mockPlaylist}
        skills={mockSkills}
      />
    );

    const downloadBtn = screen.getByText('Save QR Image');
    expect(() => fireEvent.click(downloadBtn)).not.toThrow();
    expect(toDataURLMock).toHaveBeenCalledWith('image/png');
  });
});
