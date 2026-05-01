'use client';

import { useState } from 'react';
import { QrCode, Download, X } from 'lucide-react';

interface CafeQRCodeProps {
  cafeUrl: string;
  cafeName: string;
}

export default function CafeQRCode({ cafeUrl, cafeName }: CafeQRCodeProps) {
  const [showModal, setShowModal] = useState(false);

  // Generate QR code using a public API (no dependencies needed)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cafeUrl)}&bgcolor=FFFFFF&color=000000&margin=10`;

  const downloadQR = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cafeName.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download QR code:', err);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
        title="Get QR Code"
      >
        <QrCode className="w-5 h-5" />
      </button>

      {/* QR Code Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">QR Code</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* QR Code */}
            <div className="bg-white border-2 border-gray-100 rounded-xl p-4 mb-4">
              <img
                src={qrCodeUrl}
                alt={`QR code for ${cafeName}`}
                className="w-full aspect-square"
              />
            </div>

            {/* Cafe Name */}
            <p className="text-center text-gray-600 mb-4">
              Scan to visit <strong>{cafeName}</strong>
            </p>

            {/* Download Button */}
            <button
              onClick={downloadQR}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-medium transition-colors"
            >
              <Download className="w-5 h-5" />
              Download QR Code
            </button>

            {/* Usage Hint */}
            <p className="text-xs text-gray-500 text-center mt-3">
              Print and display at your cafe for customers to scan
            </p>
          </div>
        </div>
      )}
    </>
  );
}
