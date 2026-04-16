'use client';

import { useRef, useState, useEffect } from 'react';

interface SignatureCanvasProps {
  value: string;
  onChange: (base64: string) => void;
}

export function SignatureCanvas({ value, onChange }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches[0]) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#2D2D2D';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    lastPos.current = pos;
    onChange(canvasRef.current.toDataURL());
  };

  const stopDraw = () => setIsDrawing(false);

  const clear = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setTypedName('');
    onChange('');
  };

  const applyTyped = () => {
    if (!canvasRef.current || !typedName.trim()) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.font = 'italic 32px Georgia, serif';
    ctx.fillStyle = '#2D2D2D';
    ctx.fillText(typedName, 20, canvasRef.current.height / 2 + 10);
    onChange(canvasRef.current.toDataURL());
  };

  useEffect(() => {
    if (mode === 'type' && typedName) applyTyped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedName, mode]);

  return (
    <div>
      <div className="mb-2 flex gap-3 text-sm">
        <button
          type="button"
          onClick={() => {
            setMode('draw');
            clear();
          }}
          className={`rounded-md px-3 py-1 text-xs font-medium ${mode === 'draw' ? 'bg-[#2D2D2D] text-white' : 'border border-[#D3D3D3] text-[#5D5B5B]'}`}
        >
          Draw
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('type');
            clear();
          }}
          className={`rounded-md px-3 py-1 text-xs font-medium ${mode === 'type' ? 'bg-[#2D2D2D] text-white' : 'border border-[#D3D3D3] text-[#5D5B5B]'}`}
        >
          Type name
        </button>
        <button
          type="button"
          onClick={clear}
          className="ml-auto rounded-md border border-[#D3D3D3] px-3 py-1 text-xs text-[#5D5B5B] hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      {mode === 'type' && (
        <input
          type="text"
          placeholder="Type your full name…"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          className="mb-2 w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
        />
      )}

      <canvas
        ref={canvasRef}
        width={460}
        height={120}
        className={`w-full rounded-lg border-2 ${value ? 'border-[#2D2D2D]' : 'border-dashed border-[#D3D3D3]'} bg-white touch-none`}
        onMouseDown={mode === 'draw' ? startDraw : undefined}
        onMouseMove={mode === 'draw' ? draw : undefined}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={mode === 'draw' ? startDraw : undefined}
        onTouchMove={mode === 'draw' ? draw : undefined}
        onTouchEnd={stopDraw}
      />
      {!value && (
        <p className="mt-1 text-xs text-[#5D5B5B]">
          {mode === 'draw' ? 'Draw your signature above' : 'Your typed name will appear above'}
        </p>
      )}
    </div>
  );
}
