import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  Clock,
} from "lucide-react";

const NAMA_BULAN = [
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

const NAMA_HARI_SINGKAT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const NAMA_HARI_LENGKAP = [
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
 * Contoh: "Kamis, 17 September 2026"
 */
export function formatTanggalIndo(ymdStr, includeDayName = true) {
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

/**
 * CustomDatePicker Component
 *
 * Kalender interaktif dan modern bergaya SMKN 21:
 * - Menggantikan input HTML native default datepicker yang kaku.
 * - Sesuai tema visual web (rounded-2xl, indigo/blue glow, smooth shadow).
 * - Format bahasa Indonesia ramah & lengkap (nama hari & bulan).
 * - Navigasi bulan/tahun cepat + shortcut tanggal instan ("Hari Ini", "Besok").
 * - Dukungan pembatasan tanggal (minDate & maxDate).
 */
export default function CustomDatePicker({
  value,
  onChange,
  minDate = null,
  maxDate = null,
  placeholder = "Pilih tanggal...",
  disabled = false,
  disableWeekends = false,
  className = "",
  align = "left", // "left" | "right"
  size = "md", // "sm" | "md" | "lg"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse tanggal saat ini untuk inisialisasi view kalender
  const initialDate = useMemo(() => {
    if (value) {
      const [y, m, d] = value.split("-").map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0 - 11
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);

  // Sinkronkan view kalender saat nilai value berubah
  useEffect(() => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [value]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowMonthYearPicker(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setShowMonthYearPicker(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  // Format Helper YYYY-MM-DD
  const formatYMD = (y, m, d) => {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  const todayYMD = useMemo(() => {
    const t = new Date();
    return formatYMD(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  // Hitung grid kalender (minggu dimulai dari hari Senin)
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Minggu, 1 = Senin
    const mondayOffset = (firstDayOfWeek + 6) % 7; // 0 = Senin, ..., 6 = Minggu

    const prevMonthDaysCount = new Date(viewYear, viewMonth, 0).getDate();
    const days = [];

    // Hari dari bulan sebelumnya (overflow kiri)
    for (let i = mondayOffset - 1; i >= 0; i--) {
      const d = prevMonthDaysCount - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const ymd = formatYMD(prevYear, prevMonth, d);
      days.push({
        day: d,
        month: prevMonth,
        year: prevYear,
        ymd,
        isCurrentMonth: false,
      });
    }

    // Hari dari bulan ini
    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = formatYMD(viewYear, viewMonth, d);
      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        ymd,
        isCurrentMonth: true,
      });
    }

    // Hari dari bulan berikutnya (overflow kanan untuk melengkapi baris)
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remainingSlots = totalSlots - days.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const ymd = formatYMD(nextYear, nextMonth, d);
      days.push({
        day: d,
        month: nextMonth,
        year: nextYear,
        ymd,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Navigasi Bulan
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

  // Pengecekan disabled berdasarkan minDate / maxDate / disableWeekends
  const isDateDisabled = (ymd) => {
    if (minDate && ymd < minDate) return true;
    if (maxDate && ymd > maxDate) return true;
    if (disableWeekends) {
      const [y, m, d] = ymd.split("-").map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0 is Sunday, 6 is Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) return true;
    }
    return false;
  };

  const handleSelectDate = (ymd) => {
    if (isDateDisabled(ymd)) return;
    onChange(ymd);
    setIsOpen(false);
    setShowMonthYearPicker(false);
  };

  // Shortcut Tanggal Cepat
  const handleQuickSelect = (daysOffset) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const ymd = formatYMD(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
    );
    if (!isDateDisabled(ymd)) {
      onChange(ymd);
      setIsOpen(false);
      setShowMonthYearPicker(false);
    }
  };

  // Daftar tahun untuk selector cepat (misal 3 tahun ke belakang & 3 tahun ke depan)
  const availableYears = useMemo(() => {
    const currentY = new Date().getFullYear();
    const list = [];
    for (let i = currentY - 3; i <= currentY + 3; i++) {
      list.push(i);
    }
    return list;
  }, []);

  const sizeClasses =
    {
      sm: "px-3 py-1.5 text-xs rounded-xl",
      md: "px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl",
      lg: "px-4 py-3 text-sm font-semibold rounded-xl",
    }[size] || "px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl";

  return (
    <div
      ref={containerRef}
      className={`relative ${className.includes("w-full") ? "w-full" : "inline-block"} text-left ${className}`}
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
          <div
            className={`${
              size === "sm" ? "w-6 h-6 rounded-md" : "w-7 h-7 rounded-lg"
            } flex items-center justify-center flex-shrink-0 transition-colors ${
              isOpen || value
                ? "bg-blue-100 text-blue-600"
                : "bg-slate-200/70 text-slate-500"
            }`}
          >
            <CalendarIcon
              className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}
            />
          </div>
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
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* Popover Kalender Modern */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "right"
              ? "right-0"
              : "left-0 sm:left-0 max-sm:left-1/2 max-sm:-translate-x-1/2"
          } top-full mt-2 w-[calc(100vw-2rem)] max-w-[320px] sm:max-w-none sm:w-[330px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-900/15 z-50 p-3.5 sm:p-4 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header Kalender: Bulan, Tahun & Navigasi */}
          <div className="flex items-center justify-between mb-3.5 pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setShowMonthYearPicker((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span>
                {NAMA_BULAN[viewMonth]} {viewYear}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  showMonthYearPicker ? "rotate-180 text-blue-600" : ""
                }`}
              />
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Bulan Berikutnya"
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
                  Pilih Bulan
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
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate ${
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
                  Pilih Tahun
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
                        className={`py-1.5 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
              {/* Header Nama Hari (Senin s/d Minggu) */}
              <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
                {NAMA_HARI_SINGKAT.map((h, i) => {
                  const isWeekend = i === 5 || i === 6;
                  return (
                    <div
                      key={h}
                      className={`text-[11px] font-bold py-1 ${
                        isWeekend
                          ? disableWeekends
                            ? "text-rose-400 font-bold"
                            : i === 6
                              ? "text-rose-500"
                              : "text-slate-500"
                          : "text-slate-400"
                      }`}
                    >
                      {h}
                    </div>
                  );
                })}
              </div>

              {/* Grid Tanggal Kalender */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((item, index) => {
                  const isSelected = item.ymd === value;
                  const isToday = item.ymd === todayYMD;
                  const disabledDay = isDateDisabled(item.ymd);

                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={disabledDay}
                      onClick={() => handleSelectDate(item.ymd)}
                      title={
                        disabledDay &&
                        disableWeekends &&
                        (index % 7 === 5 || index % 7 === 6)
                          ? "Sabtu & Minggu libur sekolah"
                          : ""
                      }
                      className={`h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-all relative cursor-pointer ${
                        disabledDay
                          ? "text-slate-300 bg-slate-50/50 cursor-not-allowed opacity-35 line-through"
                          : isSelected
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/25 scale-105 z-10"
                            : isToday
                              ? "border border-blue-500 text-blue-600 font-bold bg-blue-50/50 hover:bg-blue-100/60"
                              : item.isCurrentMonth
                                ? "text-slate-800 hover:bg-slate-100"
                                : "text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      <span>{item.day}</span>
                    </button>
                  );
                })}
              </div>

              {/* Shortcut Cepat Bawah ("Hari Ini", "Besok") */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isDateDisabled(todayYMD)}
                    onClick={() => handleQuickSelect(0)}
                    className="px-2.5 py-1 rounded-lg font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    disabled={(() => {
                      const t = new Date();
                      t.setDate(t.getDate() + 1);
                      return isDateDisabled(
                        formatYMD(t.getFullYear(), t.getMonth(), t.getDate()),
                      );
                    })()}
                    onClick={() => handleQuickSelect(1)}
                    className="px-2.5 py-1 rounded-lg font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Besok
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-medium px-2 py-1 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
