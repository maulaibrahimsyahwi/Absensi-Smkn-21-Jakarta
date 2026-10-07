import React, {
  useState,
  useRef,
  useEffect,
  ReactNode,
  useMemo,
  useId,
} from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import Sheet, { SheetHeader, SheetBody } from "./ui/Sheet";
import FloatingPanel from "./ui/FloatingPanel";

export interface DropdownOption {
  value: string | number;
  label?: string;
  sublabel?: string;
}

export interface DropdownGroup {
  group?: string;
  label?: string;
  badge?: string;
  badgeClass?: string;
  options?: Array<DropdownOption | string | number>;
  items?: Array<DropdownOption | string | number>;
}

export interface CustomDropdownProps {
  value?: string | number;
  onChange: (value: any) => void;
  options?: Array<DropdownOption | string | number>;
  groups?: DropdownGroup[] | null;
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function CustomDropdown({
  value,
  onChange,
  options = [],
  groups = null,
  placeholder = "Pilih...",
  icon = null,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  align = "left",
  disabled = false,
  size = "md",
}: CustomDropdownProps) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mobileSearch, setMobileSearch] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      setMobileSearch("");
    }
  }, [isOpen]);

  // Normalisasi data options dan groups ke struktur terpadu
  const normalizedGroups = useMemo(() => {
    if (groups && groups.length > 0) {
      return groups.map((g) => {
        const rawItems = g.options || g.items || [];
        const normOptions: DropdownOption[] = rawItems.map((item) => {
          if (typeof item === "object" && item !== null) {
            return {
              value: item.value,
              label: item.label ?? String(item.value),
              sublabel: item.sublabel,
            };
          }
          return {
            value: item,
            label: String(item),
          };
        });
        return {
          group: g.group || g.label || "",
          badge: g.badge || "",
          badgeClass:
            g.badgeClass ||
            "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
          options: normOptions,
        };
      });
    }

    if (options && options.length > 0) {
      const normOptions: DropdownOption[] = options.map((item) => {
        if (typeof item === "object" && item !== null) {
          return {
            value: item.value,
            label: item.label ?? String(item.value),
            sublabel: item.sublabel,
          };
        }
        return {
          value: item,
          label: String(item),
        };
      });
      return [{ group: "", badge: "", badgeClass: "", options: normOptions }];
    }

    return [];
  }, [groups, options]);

  const flatOptions = useMemo(
    () => normalizedGroups.flatMap((g) => g.options),
    [normalizedGroups],
  );

  const [activeIdx, setActiveIdx] = useState<number>(-1);

  // Label opsi terpilih saat ini
  const selectedOption = useMemo(() => {
    return flatOptions.find((opt) => String(opt.value) === String(value));
  }, [flatOptions, value]);

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setIsOpen(true);
        setActiveIdx(
          Math.max(
            0,
            flatOptions.findIndex((o) => String(o.value) === String(value)),
          ),
        );
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(flatOptions.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(flatOptions.length - 1);
    } else if (e.key === "Enter" && flatOptions[activeIdx]) {
      e.preventDefault();
      handleSelect(flatOptions[activeIdx].value);
    }
  };

  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-xs min-h-9",
    md: "px-3.5 py-2 text-xs sm:text-sm min-h-11",
    lg: "px-4 py-2.5 text-sm min-h-12",
  };

  const filteredGroupsForMobile = useMemo(() => {
    if (!mobileSearch.trim()) return normalizedGroups;
    const query = mobileSearch.toLowerCase();
    return normalizedGroups
      .map((grp) => ({
        ...grp,
        options: grp.options.filter(
          (opt) =>
            (opt.label || "").toLowerCase().includes(query) ||
            (opt.sublabel || "").toLowerCase().includes(query),
        ),
      }))
      .filter((grp) => grp.options.length > 0);
  }, [normalizedGroups, mobileSearch]);

  const totalOptionsCount = flatOptions.length;

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2.5 rounded-xl border font-semibold transition-all cursor-pointer ${
          sizeClasses[size]
        } ${
          disabled
            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            : isOpen
              ? "bg-white text-slate-800 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1 text-left">
          {icon && <span className="shrink-0 text-slate-500">{icon}</span>}
          {selectedOption ? (
            <span className="truncate text-slate-900 font-bold">
              {selectedOption.label}
            </span>
          ) : (
            <span className="truncate text-slate-400 font-normal">
              {placeholder}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* Mobile Drawer (Bottom Sheet) */}
      {isMobile && (
        <Sheet
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          size="md"
          labelledBy={titleId}
        >
          <SheetHeader
            id={titleId}
            title={placeholder || "Pilih opsi"}
            onClose={() => setIsOpen(false)}
          />

          {totalOptionsCount > 8 && (
            <div className="px-5 pb-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  placeholder="Cari opsi..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <SheetBody>
            <div className="space-y-1">
              {filteredGroupsForMobile.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  Tidak ada opsi yang cocok
                </div>
              ) : (
                filteredGroupsForMobile.map((grp, gIdx) => (
                  <div
                    key={gIdx}
                    className={
                      gIdx > 0 ? "mt-2 pt-2 border-t border-slate-100" : ""
                    }
                  >
                    {grp.group && (
                      <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>{grp.group}</span>
                        {grp.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${grp.badgeClass}`}
                          >
                            {grp.badge}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="space-y-1">
                      {grp.options.map((item) => {
                        const isSelected = String(item.value) === String(value);
                        return (
                          <button
                            key={String(item.value)}
                            type="button"
                            onClick={() => handleSelect(item.value)}
                            className={`w-full flex min-h-12 items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-2xs"
                                : "text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                            }`}
                          >
                            <div className="flex flex-col min-w-0 flex-1 truncate">
                              <span className="truncate">{item.label}</span>
                              {item.sublabel && (
                                <span className="text-xs text-slate-400 font-normal truncate mt-0.5">
                                  {item.sublabel}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SheetBody>
        </Sheet>
      )}

      {/* Desktop & Tablet Dropdown via FloatingPanel (>= 640px) */}
      {!isMobile && (
        <FloatingPanel
          anchorRef={dropdownRef}
          open={isOpen}
          onClose={() => setIsOpen(false)}
          align={align}
          width="anchor"
          className={menuClassName}
        >
          <div role="listbox" className="p-1.5 space-y-0.5">
            {normalizedGroups.map((grp, gIdx) => (
              <div
                key={gIdx}
                className={
                  gIdx > 0 ? "mt-2 pt-2 border-t border-slate-100" : ""
                }
              >
                {grp.group && (
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span className="truncate">{grp.group}</span>
                    {grp.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${grp.badgeClass}`}
                      >
                        {grp.badge}
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-0.5">
                  {grp.options.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400 italic">
                      Tidak ada pilihan
                    </div>
                  ) : (
                    grp.options.map((item) => {
                      const isSelected = String(item.value) === String(value);
                      const isKeyboardActive =
                        flatOptions[activeIdx]?.value === item.value;
                      return (
                        <button
                          key={String(item.value)}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(item.value)}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-semibold rounded-xl text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/60 shadow-2xs"
                              : isKeyboardActive
                                ? "bg-slate-100 text-slate-900"
                                : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                          }`}
                        >
                          <div className="flex flex-col min-w-0 flex-1 truncate">
                            <span className="truncate">{item.label}</span>
                            {item.sublabel && (
                              <span className="text-[10px] text-slate-400 font-normal truncate">
                                {item.sublabel}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </FloatingPanel>
      )}
    </div>
  );
}
