import React, { useState, useRef } from 'react';
import { X, QrCode, Copy, Check, Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import type { Playlist, Skill } from '../types';
import { generatePlaylistShareUrl } from '../utils/playlistShare';

interface SharePlaylistQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist | null;
  skills: Skill[];
}

export const SharePlaylistQrModal: React.FC<SharePlaylistQrModalProps> = ({
  isOpen,
  onClose,
  playlist,
  skills,
}) => {
  const [copied, setCopied] = useState(false);
  const qrWrapperRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !playlist) return null;

  const shareUrl = generatePlaylistShareUrl(playlist, skills);
  const validSkillsMap = new Map(skills.map((s) => [s.id, s]));
  const skillCount = playlist.skillIds.filter((id) => validSkillsMap.has(id)).length;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleDownloadQr = () => {
    const canvas = qrWrapperRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    const safeName = playlist.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'playlist';
    a.href = dataUrl;
    a.download = `tempodaddy-${safeName}-qr.png`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-5 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white leading-tight truncate max-w-[220px]">
                {playlist.name}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {skillCount} {skillCount === 1 ? 'skill' : 'skills'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Display */}
        <div className="flex flex-col items-center justify-center">
          <div
            ref={qrWrapperRef}
            className="p-4 bg-white rounded-2xl shadow-lg flex items-center justify-center"
          >
            <QRCodeCanvas
              value={shareUrl}
              size={220}
              level="M"
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-amber-400" />
                <span>Copy Share Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadQr}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Save QR Image</span>
          </button>
        </div>
      </div>
    </div>
  );
};
