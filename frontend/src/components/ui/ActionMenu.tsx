import React, { useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import FloatingPanel from "./FloatingPanel";
import Sheet, { SheetBody, SheetHeader } from "./Sheet";

export interface ActionItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  group?: string;
  danger?: boolean;
  hidden?: boolean;
}

export default function ActionMenu({
  title,
  subtitle,
  items,
  label,
}: {
  title: string;
  subtitle?: string;
  items: ActionItem[];
  label?: string;
}) {
  const isSheet = useMediaQuery("(max-width: 1279px)");
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const visible = items.filter((i) => !i.hidden);
  const groups = Array.from(new Set(visible.map((i) => i.group ?? "")));

  const list = (
    <div className="p-1.5">
      {groups.map((g, gi) => (
        <div
          key={g || gi}
          className={gi > 0 ? "mt-1.5 border-t border-slate-100 pt-1.5" : ""}
        >
          {visible
            .filter((i) => (i.group ?? "") === g)
            .map((i) => (
              <button
                key={i.key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  i.onSelect();
                }}
                className={`press flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold cursor-pointer xl:min-h-10 ${
                  i.danger
                    ? "text-rose-600 hover:bg-rose-50"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center">
                  {i.icon}
                </span>
                <span>{i.label}</span>
              </button>
            ))}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label ? undefined : `Aksi lainnya untuk ${title}`}
        onClick={() => setOpen((o) => !o)}
        className={`press inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer ${
          label
            ? "min-h-11 px-3.5 text-sm font-bold xl:min-h-9"
            : "h-11 w-11 xl:h-9 xl:w-9"
        }`}
      >
        <MoreHorizontal className="h-4 w-4" />
        {label}
      </button>
      {isSheet ? (
        <Sheet
          isOpen={open}
          onClose={() => setOpen(false)}
          size="sm"
          labelledBy={titleId}
        >
          <SheetHeader
            id={titleId}
            title={title}
            subtitle={subtitle}
            onClose={() => setOpen(false)}
          />
          <SheetBody>{list}</SheetBody>
        </Sheet>
      ) : (
        <FloatingPanel
          anchorRef={anchorRef}
          open={open}
          onClose={() => setOpen(false)}
          align="right"
          width={248}
        >
          {list}
        </FloatingPanel>
      )}
    </>
  );
}
