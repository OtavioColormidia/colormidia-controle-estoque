import { useEffect, useRef, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DoubleScrollProps {
  children: ReactNode;
  className?: string;
  topStickyOffset?: string;
}

export function DoubleScroll({ children, className, topStickyOffset = "0px" }: DoubleScrollProps) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [innerWidth, setInnerWidth] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const el = innerRef.current;
    const outer = bottomRef.current;
    if (!el || !outer) return;
    const measure = () => {
      setInnerWidth(el.scrollWidth);
      setHasOverflow(el.scrollWidth > outer.clientWidth + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(outer);
    return () => ro.disconnect();
  }, []);

  const syncTop = () => {
    if (topRef.current && bottomRef.current) {
      bottomRef.current.scrollLeft = topRef.current.scrollLeft;
    }
  };
  const syncBottom = () => {
    if (topRef.current && bottomRef.current) {
      topRef.current.scrollLeft = bottomRef.current.scrollLeft;
    }
  };

  return (
    <div className={className}>
      {hasOverflow && (
        <div
          ref={topRef}
          onScroll={syncTop}
          className="overflow-x-auto sticky z-10 bg-background/80 backdrop-blur-sm mb-1"
          style={{ top: topStickyOffset }}
        >
          <div style={{ width: innerWidth, height: 1 }} />
        </div>
      )}
      <div ref={bottomRef} onScroll={syncBottom} className="overflow-x-auto">
        <div ref={innerRef} className={cn("inline-block min-w-full")}>{children}</div>
      </div>
    </div>
  );
}
