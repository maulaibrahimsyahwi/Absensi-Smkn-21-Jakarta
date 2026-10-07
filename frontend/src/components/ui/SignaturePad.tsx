import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
} from "react";

type Pt = { x: number; y: number };
export interface SignaturePadHandle {
  clear(): void;
  undo(): void;
  toDataURL(): string | null;
}
const MIN_LENGTH = 120;

export interface SignaturePadProps {
  onChange?: (valid: boolean) => void;
  className?: string;
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ onChange, className = "h-56" }, ref) {
    const wrap = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const strokes = useRef<Pt[][]>([]);
    const drawing = useRef(false);
    const notify = useRef(onChange);
    notify.current = onChange;
    const [, force] = useReducer((n: number) => n + 1, 0);

    const length = () =>
      strokes.current.reduce(
        (sum, s) =>
          sum +
          s
            .slice(1)
            .reduce((a, p, i) => a + Math.hypot(p.x - s[i].x, p.y - s[i].y), 0),
        0,
      );

    const redraw = useCallback(() => {
      const c = canvas.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = "#0f172a";
      ctx.fillStyle = "#0f172a";
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const s of strokes.current) {
        if (s.length === 1) {
          ctx.beginPath();
          ctx.arc(s[0].x, s[0].y, 1.3, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(s[0].x, s[0].y);
        for (let i = 1; i < s.length - 1; i++) {
          ctx.quadraticCurveTo(
            s[i].x,
            s[i].y,
            (s[i].x + s[i + 1].x) / 2,
            (s[i].y + s[i + 1].y) / 2,
          );
        }
        ctx.lineTo(s[s.length - 1].x, s[s.length - 1].y);
        ctx.stroke();
      }
    }, []);

    useEffect(() => {
      const w = wrap.current;
      const c = canvas.current;
      if (!w || !c) return;
      const resize = () => {
        const r = w.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        c.width = Math.round(r.width * dpr);
        c.height = Math.round(r.height * dpr);
        redraw();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(w);
      return () => ro.disconnect();
    }, [redraw]);

    const changed = () => {
      redraw();
      force();
      notify.current?.(length() >= MIN_LENGTH);
    };

    const at = (e: { clientX: number; clientY: number }): Pt => {
      const r = canvas.current!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    useImperativeHandle(ref, () => ({
      clear() {
        strokes.current = [];
        changed();
      },
      undo() {
        strokes.current.pop();
        changed();
      },
      toDataURL() {
        const pts = strokes.current.flat();
        const c = canvas.current;
        if (!c || length() < MIN_LENGTH) return null;
        const dpr = window.devicePixelRatio || 1;
        const pad = 12;
        const minX = Math.min(...pts.map((p) => p.x)) - pad;
        const maxX = Math.max(...pts.map((p) => p.x)) + pad;
        const minY = Math.min(...pts.map((p) => p.y)) - pad;
        const maxY = Math.max(...pts.map((p) => p.y)) + pad;
        const sx = Math.max(0, minX * dpr);
        const sy = Math.max(0, minY * dpr);
        const sw = Math.min(c.width - sx, (maxX - minX) * dpr);
        const sh = Math.min(c.height - sy, (maxY - minY) * dpr);
        const k = Math.min(1, 700 / sw);
        const out = document.createElement("canvas");
        out.width = Math.max(1, Math.round(sw * k));
        out.height = Math.max(1, Math.round(sh * k));
        out
          .getContext("2d")!
          .drawImage(c, sx, sy, sw, sh, 0, 0, out.width, out.height);
        return out.toDataURL("image/png");
      },
    }));

    return (
      <div
        ref={wrap}
        className={`relative touch-none overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 select-none ${className}`}
      >
        <canvas
          ref={canvas}
          className="block h-full w-full cursor-crosshair touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            strokes.current.push([at(e)]);
            changed();
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const s = strokes.current[strokes.current.length - 1];
            const evs = (
              e.nativeEvent as PointerEvent
            ).getCoalescedEvents?.() ?? [e.nativeEvent];
            for (const ev of evs) s.push(at(ev));
            redraw();
          }}
          onPointerUp={() => {
            if (drawing.current) {
              drawing.current = false;
              changed();
            }
          }}
          onPointerCancel={() => {
            drawing.current = false;
          }}
        />
        {strokes.current.length === 0 && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-xs font-semibold text-slate-400">
            Goreskan tanda tangan di sini
          </p>
        )}
      </div>
    );
  },
);

export default SignaturePad;
