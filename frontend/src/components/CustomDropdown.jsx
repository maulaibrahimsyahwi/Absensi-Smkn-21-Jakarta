import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * CustomDropdown Component
 *
 * Elegant, accessible, and fully styled alternative to native HTML <select>.
 *
 * Supports:
 * - Flat options: [value1, value2] or [{ value, label, sublabel }]
 * - Grouped options: [{ group: "Header", badge: "TAG", badgeClass: "...", options: [...] }]
 * - Custom icons, alignment, sizing, and disabled states
 */
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
  size = "md", // "sm", "md", "lg"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [horizontalPlacement, setHorizontalPlacement] = useState(align);
  const dropdownRef = useRef(null);

  // Auto detect placement (flip upward if space below is tight, flip horizontal if near screen edges)
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 260 && rect.top > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }

      if (align === "right" && rect.right < 280) {
        setHorizontalPlacement("left");
      } else if (align === "left" && rect.left + 280 > window.innerWidth) {
        setHorizontalPlacement("right");
      } else {
        setHorizontalPlacement(align);
      }
    }
  }, [isOpen, align]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  // Normalize options structure
  const normalizedGroups = React.useMemo(() => {
    if (groups && Array.isArray(groups)) {
      return groups.map((g) => ({
        group: g.group || g.label || "",
        badge: g.badge || "",
        badgeClass:
          g.badgeClass || "bg-slate-100 text-slate-700 border-slate-200",
        options: (g.options || g.items || []).map((opt) =>
          typeof opt === "object"
            ? {
                value: opt.value,
                label: opt.label || String(opt.value),
                sublabel: opt.sublabel,
              }
            : { value: opt, label: String(opt) },
        ),
      }));
    }

    // Flat options
    const flatList = (options || []).map((opt) =>
      typeof opt === "object"
        ? {
            value: opt.value,
            label: opt.label || String(opt.value),
            sublabel: opt.sublabel,
          }
        : { value: opt, label: String(opt) },
    );

    return [
      {
        group: "",
        badge: "",
        options: flatList,
      },
    ];
  }, [options, groups]);

  // Find currently selected label
  const selectedItem = React.useMemo(() => {
    for (const grp of normalizedGroups) {
      for (const item of grp.options) {
        if (String(item.value) === String(value)) {
          return item;
        }
      }
    }
    return null;
  }, [normalizedGroups, value]);

  const displayLabel = selectedItem ? selectedItem.label : placeholder;

  const sizeClasses =
    {
      sm: "px-3 py-1.5 text-xs rounded-xl",
      md: "px-3.5 py-2 text-xs font-semibold rounded-xl",
      lg: "px-4 py-2.5 text-sm font-semibold rounded-xl",
    }[size] || "px-3.5 py-2 text-xs font-semibold rounded-xl";

  const handleSelect = (itemValue) => {
    if (disabled) return;
    onChange(itemValue);
    setIsOpen(false);
  };

  const isFullWidth = Boolean(className && className.includes("w-full"));

  return (
    <div
      ref={dropdownRef}
      className={`relative text-left ${className || "inline-block"}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2.5 bg-white border border-slate-200 text-slate-800 transition-all shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer ${sizeClasses} ${
          disabled
            ? "opacity-60 cursor-not-allowed bg-slate-100 hover:border-slate-200"
            : "hover:bg-slate-50/80 active:scale-[0.99]"
        } ${isOpen ? "ring-2 ring-blue-500/20 border-blue-500 bg-blue-50/20" : ""} ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          className={`absolute ${
            horizontalPlacement === "right" ? "right-0" : "left-0"
          } ${openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"} ${
            isFullWidth
              ? "w-full min-w-full max-w-full"
              : "min-w-full w-max max-w-[calc(100vw-2rem)] sm:max-w-md"
          } bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/10 z-50 p-1.5 max-h-72 overflow-y-auto overscroll-contain animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
        >
          {normalizedGroups.map((grp, gIdx) => (
            <div
              key={gIdx}
              className={gIdx > 0 ? "mt-2 pt-2 border-t border-slate-100" : ""}
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
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleSelect(item.value)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-semibold rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/60 shadow-2xs"
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
      )}
    </div>
  );
}
