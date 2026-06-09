import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";

interface ZoomableImageProps {
  src: string;
  alt?: string;
}

export default function ZoomableImage({ src, alt }: ZoomableImageProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const clamp = (z: number) => Math.min(8, Math.max(0.25, z));

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 30) return;
    e.preventDefault();
    setZoom((z) => clamp(z * (e.deltaY > 0 ? 0.9 : 1.1)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.startX),
      y: dragRef.current.oy + (e.clientY - dragRef.current.startY),
    });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="absolute top-2 right-2 z-10 flex gap-1 rounded-md bg-background/90 backdrop-blur border p-1 shadow">
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => clamp(z * 0.8))} title="Diminuir zoom">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => clamp(z * 1.25))} title="Aumentar zoom">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setZoom(2); setOffset({ x: 0, y: 0 }); }} title="2x">
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={reset} title="Resetar">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <div className="px-2 text-xs flex items-center text-muted-foreground tabular-nums min-w-[42px] justify-center">
          {Math.round(zoom * 100)}%
        </div>
      </div>
      <div
        className="flex-1 min-h-0 overflow-auto rounded border bg-muted/30 flex items-center justify-center select-none"
        onWheel={onWheel}
        style={{ cursor: zoom > 1 ? (dragRef.current ? "grabbing" : "grab") : "default" }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onDoubleClick={() => setZoom((z) => (z >= 2 ? 1 : 2))}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="max-w-none transition-transform duration-75"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            maxHeight: zoom <= 1 ? "100%" : "none",
            maxWidth: zoom <= 1 ? "100%" : "none",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
}
