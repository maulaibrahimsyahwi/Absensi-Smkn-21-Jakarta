import React, { useState, useRef, useMemo, useId } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import Sheet, { SheetHeader, SheetBody } from "./ui/Sheet";
import FloatingPanel from "./ui/FloatingPanel";
import { todayWib } from "../utils/date";

export const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const NAMA_HARI_SINGKAT = [
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
  "Min",
];

export const NAMA_HARI_LENGKAP = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

/**
 * Format string "YYYY-MM-DD" menjadi tampilan tanggal bahasa Indonesia
 */
export function formatTanggalIndo(
  ymdStr?: string | null,
  includeDayName = true,
): string {
  if (!ymdStr) return "";
  try {
    const [year, month, day] = ymdStr.split("-").map(Number);
    if (!year || !month || !day) return ymdStr;
    const dateObj = new Date(year, month - 1, day);
    const hari = NAMA_HARI_LENGKAP[dateObj.getDay()];
    const bulan = NAMA_BULAN[month - 1];
    return includeDayName
      ? `${hari}, ${day} ${bulan} ${year}`
      : `${day} ${bulan} ${year}`;
  } catch {
    return ymdStr;
  }
}

export interface CustomDatePickerProps {
  value?: string;
  onChange: (dateYmd: string) => void;
  minDate?: string | null;
  maxDate?: string | null;
  placeholder?: string;
  disabled?: boolean;
  disableWeekends?: boolean;
  className?: string;
  align?: "left" | "right";
  size?: "sm" | "md" | "lg";
}

export default function CustomDatePicker({
  value,
  onChange,
  minDate = null,
  maxDate = null,
  placeholder = "Pilih tanggal...",
  disabled = false,
  disableWeekends = false,
  className = "",
  align = "left",
  size = "md",
}: CustomDatePickerProps) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const todayStr = todayWib();

  // Parse tanggal saat ini untuk inisialisasi view kalender
  const initialDate = useMemo(() => {
    if (value) {
      const [y, m, d] = value.split("-").map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0 - 11
  const [showMonthYearPicker, setShowMonthYearPicker] =
    useState<boolean>(false);

  const close = () => {
    setIsOpen(false);
    setShowMonthYearPicker(false);
  };

  const formatYMD = (
    year: number,
    monthZeroIdx: number,
    day: number,
  ): string => {
    const mm = String(monthZeroIdx + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const isDateDisabled = (ymd: string): boolean => {
    if (minDate && ymd < minDate) return true;
    if (maxDate && ymd > maxDate) return true;
    if (disableWeekends) {
      const [y, m, d] = ymd.split("-").map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0: Min, 6: Sab
      if (dayOfWeek === 0 || dayOfWeek === 6) return true;
    }
    return false;
  };

  // Navigasi bulan
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDate = (ymd: string) => {
    if (isDateDisabled(ymd)) return;
    onChange(ymd);
    close();
  };

  const handleQuickSelect = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const ymd = formatYMD(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
    );
    if (!isDateDisabled(ymd)) {
      onChange(ymd);
      close();
    }
  };

  const availableYears = useMemo(() => {
    const currentY = new Date().getFullYear();
    const list: number[] = [];
    for (let i = currentY - 3; i <= currentY + 3; i++) {
      list.push(i);
    }
    return list;
  }, []);

  // Grid Hari
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    let startDayOfWeek = firstDayOfMonth.getDay() - 1; // 0 = Senin, 6 = Minggu
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      ymd: string;
      isCurrentMonth: boolean;
      isPrevMonth: boolean;
      isNextMonth: boolean;
    }> = [];

    // Hari bulan sebelumnya
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        day: d,
        ymd: formatYMD(prevY, prevM, d),
        isCurrentMonth: false,
        isPrevMonth: true,
        isNextMonth: false,
      });
    }

    // Hari bulan ini
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      days.push({
        day: d,
        ymd: formatYMD(viewYear, viewMonth, d),
        isCurrentMonth: true,
        isPrevMonth: false,
        isNextMonth: false,
      });
    }

    // Hari bulan berikutnya hingga kelipatan 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({
        day: d,
        ymd: formatYMD(nextY, nextM, d),
        isCurrentMonth: false,
        isPrevMonth: false,
        isNextMonth: true,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const sizeClasses =
    {
      sm: "px-3 py-1.5 text-xs rounded-xl",
      md: "px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl",
      lg: "px-4 py-3 text-sm font-semibold rounded-xl",
    }[size] || "px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl";

  const calendarBody = (
    <div className="space-y-3.5">
      {/* Header Kalender: Bulan, Tahun & Navigasi */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <button
          type="button"
          onClick={() => setShowMonthYearPicker((prev) => !prev)}
          className="flex min-h-10 items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-bold text-slate-800 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <span>
            {NAMA_BULAN[viewMonth]} {viewYear}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              showMonthYearPicker ? "rotate-180 text-blue-600" : ""
            }`}
          />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="grid h-11 w-11 sm:h-9 sm:w-9 place-items-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Bulan Sebelumnya"
            aria-label="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="grid h-11 w-11 sm:h-9 sm:w-9 place-items-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Bulan Berikutnya"
            aria-label="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Month & Year Picker Overlay */}
      {showMonthYearPicker ? (
        <div className="space-y-3 py-1 animate-in fade-in duration-100">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Bulan
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {NAMA_BULAN.map((bulanName, idx) => {
                const isCurrent = viewMonth === idx;
                return (
                  <button
                    key={bulanName}
                    type="button"
                    onClick={() => {
                      setViewMonth(idx);
                      setShowMonthYearPicker(false);
                    }}
                    className={`min-h-10 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {bulanName.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Tahun
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {availableYears.map((yr) => {
                const isCurrent = viewYear === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setViewYear(yr);
                      setShowMonthYearPicker(false);
                    }}
                    className={`min-h-10 py-1.5 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header Nama Hari */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 uppercase tracking-wider">
            {NAMA_HARI_SINGKAT.map((h, i) => (
              <div
                key={h}
                className={i === 5 || i === 6 ? "text-rose-400" : ""}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Grid Hari Kalender */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item) => {
              const isSelected = item.ymd === value;
              const isToday = item.ymd === todayStr;
              const isDisabled = isDateDisabled(item.ymd);

              return (
                <button
                  key={item.ymd}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDate(item.ymd)}
                  aria-label={formatTanggalIndo(item.ymd)}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  className={`press grid h-11 sm:h-9 place-items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white font-bold shadow-xs shadow-blue-500/30 scale-100 z-10"
                      : isToday
                        ? "border border-blue-500/80 text-blue-700 font-bold bg-blue-50/40"
                        : !item.isCurrentMonth
                          ? "text-slate-300 hover:text-slate-600"
                          : "text-slate-700 hover:bg-slate-100"
                  } ${isDisabled ? "text-slate-300 opacity-40 cursor-not-allowed hover:bg-transparent" : ""}`}
                >
                  <span>{item.day}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${
        className.includes("w-full") ? "w-full" : "inline-block"
      } text-left ${className}`}
    >
      {/* Trigger Button Kalender */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-3 bg-slate-50 hover:bg-white border text-left transition-all shadow-2xs focus:outline-none cursor-pointer ${sizeClasses} ${
          disabled
            ? "opacity-60 cursor-not-allowed bg-slate-100 border-slate-200"
            : isOpen
              ? "border-blue-500 ring-2 ring-blue-500/20 bg-white"
              : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          <div className="flex flex-col truncate">
            {value ? (
              <>
                {size !== "sm" && (
                  <span className="text-[10px] text-blue-600 font-semibold truncate -mt-0.5">
                    {formatTanggalIndo(value, true).split(",")[0]}
                  </span>
                )}
                <span
                  className={`font-bold text-slate-900 truncate ${
                    size === "sm" ? "text-xs" : ""
                  }`}
                >
                  {formatTanggalIndo(value, false)}
                </span>
              </>
            ) : (
              <span className="text-slate-400 font-normal">{placeholder}</span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* Render Mobile: Bottom Sheet */}
      {isMobile ? (
        <Sheet isOpen={isOpen} onClose={close} size="sm" labelledBy={titleId}>
          <SheetHeader id={titleId} title="Pilih tanggal" onClose={close} />
          <SheetBody>{calendarBody}</SheetBody>
        </Sheet>
      ) : (
        /* Render Desktop/Tablet: FloatingPanel */
        <FloatingPanel
          anchorRef={containerRef}
          open={isOpen}
          onClose={close}
          width={330}
          align={align}
        >
          <div className="p-4">{calendarBody}</div>
        </FloatingPanel>
      )}
    </div>
  );
}
