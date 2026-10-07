import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  Edit2,
  Trash2,
  Lock,
  Download,
  X,
  LayoutGrid,
  List as ListIcon,
  Clock,
  Plus,
} from "lucide-react";
import { HolidayEvent } from "../../types/libur";
import Sheet from "../ui/Sheet";

export interface HolidayCalendarViewProps {
  events: HolidayEvent[];
  selectedYear: string;
  onSelectYear: (year: string) => void;
  selectedMonth?: number;
  onSelectMonth?: (month: number) => void;
  isAdmin?: boolean;
  onAddNewHoliday?: (prefilledDate?: string) => void;
  onEditEvent?: (event: HolidayEvent) => void;
  onDeleteEvent?: (event: HolidayEvent) => void;
  onPreviewSurat?: (event: HolidayEvent) => void;
}

const MONTH_NAMES_ID = [
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

const WEEKDAY_NAMES_ID = [
  { short: "Sen", full: "Senin" },
  { short: "Sel", full: "Selasa" },
  { short: "Rab", full: "Rabu" },
  { short: "Kam", full: "Kamis" },
  { short: "Jum", full: "Jumat" },
  { short: "Sab", full: "Sabtu", isWeekend: true },
  { short: "Min", full: "Minggu", isWeekend: true },
];

const KATEGORI_CONFIG: Record<
  string,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotColor: string;
    borderAccent: string;
  }
> = {
  libur_nasional: {
    label: "Libur Nasional (SKB)",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-800",
    badgeBorder: "border-rose-200",
    dotColor: "bg-rose-600",
    borderAccent: "border-l-[3px] border-l-rose-600",
  },
  cuti_bersama: {
    label: "Cuti Bersama",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-200",
    dotColor: "bg-amber-600",
    borderAccent: "border-l-[3px] border-l-amber-600",
  },
  libur_semester: {
    label: "Libur Semester",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-800",
    badgeBorder: "border-purple-200",
    dotColor: "bg-purple-600",
    borderAccent: "border-l-[3px] border-l-purple-600",
  },
  khusus: {
    label: "Libur Khusus",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200",
    dotColor: "bg-emerald-600",
    borderAccent: "border-l-[3px] border-l-emerald-600",
  },
  masuk_khusus: {
    label: "Masuk Khusus",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-800",
    badgeBorder: "border-blue-200",
    dotColor: "bg-blue-600",
    borderAccent: "border-l-[3px] border-l-blue-600",
  },
};

const formatDateYMD = (year: number, month: number, day: number): string => {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
};

const parseDateYMD = (ymdStr: string) => {
  if (!ymdStr) return null;
  const parts = ymdStr.split("-");
  if (parts.length !== 3) return null;
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10) - 1,
    day: parseInt(parts[2], 10),
  };
};

export function HolidayCalendarView({
  events = [],
  selectedYear,
  onSelectYear,
  selectedMonth,
  onSelectMonth,
  isAdmin = true,
  onAddNewHoliday,
  onEditEvent,
  onDeleteEvent,
  onPreviewSurat,
}: HolidayCalendarViewProps): React.JSX.Element {
  const today = useMemo(() => new Date(), []);
  const todayYMD = useMemo(
    () => formatDateYMD(today.getFullYear(), today.getMonth(), today.getDate()),
    [today],
  );

  // Month navigation: controlled if parent passes selectedMonth, else internal
  const [internalMonth, setInternalMonth] = useState<number>(today.getMonth());
  const currentMonth =
    typeof selectedMonth === "number" ? selectedMonth : internalMonth;

  const setCurrentMonth = (val: number | ((prev: number) => number)) => {
    const nextMonth = typeof val === "function" ? val(currentMonth) : val;
    if (onSelectMonth) onSelectMonth(nextMonth);
    setInternalMonth(nextMonth);
  };

  // Year navigation
  const parsedPropYear = parseInt(selectedYear, 10) || today.getFullYear();
  const [currentYear, setCurrentYear] = useState<number>(parsedPropYear);

  useEffect(() => {
    const y = parseInt(selectedYear, 10);
    if (!isNaN(y) && y !== currentYear) {
      setCurrentYear(y);
    }
  }, [selectedYear]);

  // Mode: "calendar" vs "list"
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // Popup detail per tanggal
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Filter & Search untuk list mode
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Navigasi bulan
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      const prevY = currentYear - 1;
      setCurrentMonth(11);
      setCurrentYear(prevY);
      onSelectYear(String(prevY));
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      const nextY = currentYear + 1;
      setCurrentMonth(0);
      setCurrentYear(nextY);
      onSelectYear(String(nextY));
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleTodayClick = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    if (now.getFullYear() !== currentYear) {
      setCurrentYear(now.getFullYear());
      onSelectYear(String(now.getFullYear()));
    }
    setSelectedDateStr(todayYMD);
  };

  const handleMonthChange = (mIndex: number) => {
    setCurrentMonth(mIndex);
  };

  const handleYearChange = (yVal: number) => {
    setCurrentYear(yVal);
    onSelectYear(String(yVal));
  };

  // Touch swipe gesture untuk ganti bulan di perangkat mobile/tablet
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Deteksi swipe horizontal jika pergeseran > 50px dan lebih dominan dibanding vertical scroll
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        handlePrevMonth();
      } else {
        handleNextMonth();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Kalkulasi sel kalender (Senin s/d Minggu)
  const gridCells = useMemo(() => {
    const firstDayDate = new Date(currentYear, currentMonth, 1);
    // Senin = 0, Minggu = 6
    const startOffset = (firstDayDate.getDay() + 6) % 7;

    const daysInCurrentMonth = new Date(
      currentYear,
      currentMonth + 1,
      0,
    ).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      isWeekend: boolean;
      isToday: boolean;
    }> = [];

    // Hari dari bulan sebelumnya
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dStr = formatDateYMD(prevY, prevM, d);
      const dayOfWeek = (new Date(prevY, prevM, d).getDay() + 6) % 7;
      cells.push({
        dateStr: dStr,
        dayNum: d,
        month: prevM,
        year: prevY,
        isCurrentMonth: false,
        isWeekend: dayOfWeek >= 5,
        isToday: dStr === todayYMD,
      });
    }

    // Hari dari bulan saat ini
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dStr = formatDateYMD(currentYear, currentMonth, d);
      const dayOfWeek =
        (new Date(currentYear, currentMonth, d).getDay() + 6) % 7;
      cells.push({
        dateStr: dStr,
        dayNum: d,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        isWeekend: dayOfWeek >= 5,
        isToday: dStr === todayYMD,
      });
    }

    // Hari dari bulan berikutnya untuk melengkapi baris grid
    let remaining = (7 - (cells.length % 7)) % 7;
    // Jaga konsistensi baris grid (minimal 5 baris = 35 sel)
    if (cells.length + remaining < 35) {
      remaining += 7;
    }

    for (let d = 1; d <= remaining; d++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dStr = formatDateYMD(nextY, nextM, d);
      const dayOfWeek = (new Date(nextY, nextM, d).getDay() + 6) % 7;
      cells.push({
        dateStr: dStr,
        dayNum: d,
        month: nextM,
        year: nextY,
        isCurrentMonth: false,
        isWeekend: dayOfWeek >= 5,
        isToday: dStr === todayYMD,
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayYMD]);

  // Pemetaan cepat: Date string -> Array of HolidayEvent
  const eventsByDate = useMemo(() => {
    const map = new Map<string, HolidayEvent[]>();

    events.forEach((ev) => {
      const start = (ev.tanggal_mulai || ev.tanggal || "").trim();
      const end = (
        ev.tanggal_selesai ||
        ev.tanggal_mulai ||
        ev.tanggal ||
        ""
      ).trim();
      if (!start) return;

      const pStart = parseDateYMD(start);
      const pEnd = parseDateYMD(end);

      if (!pStart || !pEnd) {
        const list = map.get(start) || [];
        list.push(ev);
        map.set(start, list);
        return;
      }

      const cur = new Date(pStart.year, pStart.month, pStart.day);
      const limit = new Date(pEnd.year, pEnd.month, pEnd.day);

      let count = 0;
      while (cur <= limit && count < 90) {
        const ymd = formatDateYMD(
          cur.getFullYear(),
          cur.getMonth(),
          cur.getDate(),
        );
        const list = map.get(ymd) || [];
        if (
          !list.some(
            (existing) => existing.id === ev.id && existing.nama === ev.nama,
          )
        ) {
          list.push(ev);
        }
        map.set(ymd, list);
        cur.setDate(cur.getDate() + 1);
        count++;
      }
    });

    return map;
  }, [events]);

  // Klik pada sel kalender (pindah bulan jika sel trailing)
  const handleCellClick = (cell: (typeof gridCells)[0]) => {
    if (!cell.isCurrentMonth) {
      setCurrentMonth(cell.month);
      if (cell.year !== currentYear) {
        setCurrentYear(cell.year);
        onSelectYear(String(cell.year));
      }
    }
    setSelectedDateStr(cell.dateStr);
  };

  // Event untuk tanggal yang dipilih di modal
  const selectedDateEvents = useMemo(() => {
    if (!selectedDateStr) return [];
    return eventsByDate.get(selectedDateStr) || [];
  }, [selectedDateStr, eventsByDate]);

  // Info tanggal pilihan
  const selectedDateInfo = useMemo(() => {
    if (!selectedDateStr) return null;
    const p = parseDateYMD(selectedDateStr);
    if (!p) return null;
    const dObj = new Date(p.year, p.month, p.day);
    const dayOfWeek = (dObj.getDay() + 6) % 7;
    const isWeekend = dayOfWeek >= 5;
    const weekdayName = WEEKDAY_NAMES_ID[dayOfWeek].full;
    const monthName = MONTH_NAMES_ID[p.month];
    const fullDateText = `${weekdayName}, ${p.day} ${monthName} ${p.year}`;

    const hasMasukKhusus = selectedDateEvents.some(
      (e) => e.tipe_hari === "masuk_khusus",
    );
    const hasLibur = selectedDateEvents.some(
      (e) => e.tipe_hari !== "masuk_khusus",
    );

    let statusText = "Hari Sekolah Aktif";
    let statusDesc = "Kegiatan belajar mengajar dan presensi berjalan normal.";
    let statusType: "normal" | "libur" | "masuk_khusus" | "weekend" = "normal";

    if (hasMasukKhusus) {
      statusText = "Wajib Masuk Khusus";
      statusDesc = "Presensi kehadiran dibuka khusus (agenda resmi sekolah).";
      statusType = "masuk_khusus";
    } else if (hasLibur) {
      statusText = "Sekolah Diliburkan";
      statusDesc = "Presensi kehadiran ditutup untuk seluruh siswa.";
      statusType = "libur";
    } else if (isWeekend) {
      statusText = `Libur Akhir Pekan (${weekdayName})`;
      statusDesc = "Hari libur rutin akhir pekan.";
      statusType = "weekend";
    }

    return {
      fullDateText,
      dayNum: p.day,
      monthName,
      year: p.year,
      weekdayName,
      isWeekend,
      statusText,
      statusDesc,
      statusType,
    };
  }, [selectedDateStr, selectedDateEvents]);

  // Filter daftar untuk list mode
  const filteredEventsForList = useMemo(() => {
    return events.filter((ev) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        ev.nama?.toLowerCase().includes(q) ||
        ev.keterangan?.toLowerCase().includes(q) ||
        ev.kategori?.toLowerCase().includes(q) ||
        ev.tanggal_mulai?.includes(q) ||
        ev.tanggal_selesai?.includes(q);

      const matchCat =
        categoryFilter === "all" ||
        ev.kategori === categoryFilter ||
        (categoryFilter === "masuk_khusus" && ev.tipe_hari === "masuk_khusus");

      return matchQuery && matchCat;
    });
  }, [events, searchQuery, categoryFilter]);

  const getCategoryTheme = (kategori?: string, tipeHari?: string) => {
    if (tipeHari === "masuk_khusus") {
      return KATEGORI_CONFIG.masuk_khusus;
    }
    if (kategori && KATEGORI_CONFIG[kategori]) {
      return KATEGORI_CONFIG[kategori];
    }
    return {
      label: "Agenda Sekolah",
      badgeBg: "bg-slate-50",
      badgeText: "text-slate-700",
      badgeBorder: "border-slate-200",
      dotColor: "bg-slate-500",
      borderAccent: "border-l-[3px] border-l-slate-400",
    };
  };

  // Hitung jumlah agenda per bulan di tahun aktif
  const monthEventCounts = useMemo(() => {
    const counts: number[] = Array(12).fill(0);
    const countedKeysByMonth = Array.from({ length: 12 }, () => new Set<string>());

    events.forEach((ev) => {
      const start = (ev.tanggal_mulai || ev.tanggal || "").trim();
      const end = (ev.tanggal_selesai || ev.tanggal_mulai || ev.tanggal || "").trim();
      if (!start) return;

      const pStart = parseDateYMD(start);
      const pEnd = parseDateYMD(end);
      if (!pStart || !pEnd) return;

      const cur = new Date(pStart.year, pStart.month, pStart.day);
      const limit = new Date(pEnd.year, pEnd.month, pEnd.day);

      let count = 0;
      while (cur <= limit && count < 90) {
        if (cur.getFullYear() === currentYear) {
          const m = cur.getMonth();
          const key = String(ev.id || ev.nama);
          if (!countedKeysByMonth[m].has(key)) {
            countedKeysByMonth[m].add(key);
            counts[m]++;
          }
        }
        cur.setDate(cur.getDate() + 1);
        count++;
      }
    });

    return counts;
  }, [events, currentYear]);

  // Ringkasan jumlah libur di bulan terpilih
  const monthStats = useMemo(() => {
    let liburNasional = 0;
    let cutiBersama = 0;
    let liburSemester = 0;
    let masukKhusus = 0;

    const visitedEventIds = new Set<string | number>();

    gridCells
      .filter((c) => c.isCurrentMonth)
      .forEach((c) => {
        const evs = eventsByDate.get(c.dateStr) || [];
        evs.forEach((e) => {
          const key = e.id || e.nama;
          if (key && !visitedEventIds.has(key)) {
            visitedEventIds.add(key);
            if (e.tipe_hari === "masuk_khusus") masukKhusus++;
            else if (e.kategori === "libur_nasional") liburNasional++;
            else if (e.kategori === "cuti_bersama") cutiBersama++;
            else if (e.kategori === "libur_semester") liburSemester++;
          }
        });
      });

    return { liburNasional, cutiBersama, liburSemester, masukKhusus };
  }, [gridCells, eventsByDate]);

  return (
    <div className="space-y-3.5">
      {/* Top Bar: Navigasi Bulan, Tahun, Toggle Mode, dan Tombol Tambah */}
      <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Navigasi Bulan & Tahun */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={currentMonth}
              onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-400 focus:outline-hidden cursor-pointer"
            >
              {MONTH_NAMES_ID.map((name, idx) => {
                const count = monthEventCounts[idx] || 0;
                return (
                  <option key={name} value={idx}>
                    {name} {count > 0 ? `(${count} agenda)` : ""}
                  </option>
                );
              })}
            </select>

            <select
              value={currentYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-400 focus:outline-hidden cursor-pointer"
            >
              {[-1, 0, 1, 2].map((offset) => {
                const y = today.getFullYear() + offset;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              onClick={handleTodayClick}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              title="Kembali ke Hari Ini"
            >
              Hari Ini
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="bg-slate-200/80 p-0.5 rounded-xl flex items-center">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kalender</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>Daftar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ringkasan & Legenda Kategori */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs">
        {/* Ringkasan Jumlah Libur di Bulan Terpilih */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-700">
            {MONTH_NAMES_ID[currentMonth]} {currentYear}:
          </span>
          {monthStats.liburNasional > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-medium">
              {monthStats.liburNasional} Libur Nasional
            </span>
          )}
          {monthStats.cutiBersama > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium">
              {monthStats.cutiBersama} Cuti Bersama
            </span>
          )}
          {monthStats.liburSemester > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium">
              {monthStats.liburSemester} Libur Semester
            </span>
          )}
          {monthStats.masukKhusus > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
              {monthStats.masukKhusus} Masuk Khusus
            </span>
          )}
          {monthStats.liburNasional === 0 &&
            monthStats.cutiBersama === 0 &&
            monthStats.liburSemester === 0 &&
            monthStats.masukKhusus === 0 && (
              <span className="text-slate-400 text-xs">
                Tidak ada agenda khusus di bulan ini
              </span>
            )}
          {monthStats.liburNasional === 0 && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <span className="text-slate-400 hidden md:inline">Bulan bertanggal merah:</span>
              {[0, 2, 4, 11].map((mIdx) => (
                <button
                  key={mIdx}
                  type="button"
                  onClick={() => setCurrentMonth(mIdx)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                >
                  {MONTH_NAMES_ID[mIdx]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Legenda Kategori */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
            <span>Libur Nasional</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
            <span>Cuti Bersama</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
            <span>Libur Semester</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
            <span>Masuk Khusus</span>
          </div>
        </div>
      </div>

      {/* TAMPILAN 1: GRID KALENDER VISUAL */}
      {viewMode === "calendar" ? (
        <div
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden select-none touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header Hari dalam Seminggu */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-600">
            {WEEKDAY_NAMES_ID.map((wd) => (
              <div
                key={wd.short}
                className={`py-2.5 border-r border-slate-200 last:border-r-0 ${
                  wd.isWeekend ? "text-rose-600" : ""
                }`}
              >
                <span className="hidden sm:inline">{wd.full}</span>
                <span className="sm:hidden">{wd.short}</span>
              </div>
            ))}
          </div>

          {/* Grid Sel Hari */}
          <div className="grid grid-cols-7 bg-slate-200 gap-px">
            {gridCells.map((cell) => {
              const cellEvents = eventsByDate.get(cell.dateStr) || [];
              const hasEvents = cellEvents.length > 0;
              const isSelected = selectedDateStr === cell.dateStr;

              const cellLabel = `${cell.dayNum} ${MONTH_NAMES_ID[cell.month]} ${cell.year}${
                hasEvents ? `, ${cellEvents.length} agenda: ${cellEvents.map((e) => e.nama).join(", ")}` : ""
              }`;

              return (
                <button
                  type="button"
                  key={cell.dateStr}
                  onClick={() => handleCellClick(cell)}
                  aria-label={cellLabel}
                  className={`w-full text-left min-h-[74px] sm:min-h-[110px] p-1.5 flex flex-col justify-between transition-colors cursor-pointer relative outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 ${
                    cell.isCurrentMonth
                      ? cell.isWeekend
                        ? "bg-slate-50/70 hover:bg-slate-100/70"
                        : "bg-white hover:bg-slate-50"
                      : "bg-slate-100/40 text-slate-400 hover:bg-slate-100/70"
                  } ${
                    isSelected
                      ? "ring-2 ring-purple-600 ring-inset z-10 bg-purple-50/30"
                      : ""
                  }`}
                >
                  {/* Nomor Tanggal */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-semibold flex items-center justify-center rounded-lg transition-transform ${
                        cell.isToday
                          ? "w-6 h-6 bg-blue-600 text-white font-bold"
                          : cell.isCurrentMonth
                            ? cell.isWeekend
                              ? "text-rose-600"
                              : "text-slate-800"
                            : "text-slate-400"
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                  </div>

                  {/* Indikator Dot di Mobile (<640px) */}
                  <div className="flex sm:hidden items-center justify-center gap-1 mt-1 flex-wrap min-h-[14px] w-full">
                    {hasEvents && (
                      <>
                        {cellEvents.slice(0, 3).map((ev, evIdx) => {
                          const theme = getCategoryTheme(
                            ev.kategori,
                            ev.tipe_hari,
                          );
                          return (
                            <span
                              key={`${ev.id || ev.nama}-${evIdx}`}
                              className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`}
                              title={ev.nama}
                            />
                          );
                        })}
                        {cellEvents.length > 3 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        )}
                      </>
                    )}
                  </div>

                  {/* Task Pills Di Dalam Sel Tanggal di Tablet & Desktop (>=640px) */}
                  <div className="hidden sm:block flex-1 space-y-1 overflow-hidden mt-1 w-full">
                    {hasEvents ? (
                      <>
                        {cellEvents.slice(0, 2).map((ev, evIdx) => {
                          const theme = getCategoryTheme(
                            ev.kategori,
                            ev.tipe_hari,
                          );
                          return (
                            <div
                              key={`${ev.id || ev.nama}-${evIdx}`}
                              className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] font-semibold border transition-all truncate ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder} ${theme.borderAccent}`}
                              title={`${ev.nama} (${theme.label})`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.dotColor}`}
                              />
                              <span className="truncate flex-1 leading-none">
                                {ev.nama}
                              </span>
                            </div>
                          );
                        })}

                        {cellEvents.length > 2 && (
                          <div
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 text-center truncate transition-colors"
                          >
                            +{cellEvents.length - 2} lainnya
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-full min-h-[20px]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* TAMPILAN 2: DAFTAR / TABEL DENGAN FILTER & SEARCH */
        <div className="space-y-3">
          {/* Search Bar & Kategori Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama hari libur, nomor edaran, atau keterangan..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
            >
              <option value="all">Semua Kategori</option>
              <option value="libur_nasional">Libur Nasional (SKB)</option>
              <option value="cuti_bersama">Cuti Bersama</option>
              <option value="libur_semester">Libur Semester</option>
              <option value="khusus">Khusus Sekolah</option>
              <option value="masuk_khusus">Wajib Masuk Khusus</option>
            </select>
          </div>

          {/* List Kartu */}
          {filteredEventsForList.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
              <CalendarIcon className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-sm font-semibold text-slate-800">
                Tidak ada agenda yang cocok
              </p>
              <p className="text-xs text-slate-500">
                Coba sesuaikan kata kunci pencarian atau pilih kategori lain.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEventsForList.map((item) => {
                const theme = getCategoryTheme(item.kategori, item.tipe_hari);
                const isMasukKhusus = item.tipe_hari === "masuk_khusus";
                const isBuiltin = Boolean(item.is_builtin);

                return (
                  <div
                    key={item.id || item.nama}
                    className={`p-3.5 rounded-xl border space-y-2.5 bg-white ${theme.borderAccent} border-slate-200`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                        >
                          {isBuiltin
                            ? "Nasional (SKB)"
                            : isMasukKhusus
                              ? "Masuk Khusus"
                              : theme.label}
                        </span>
                        <h4 className="font-semibold text-sm text-slate-900 leading-snug break-words">
                          {item.nama}
                        </h4>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          {onEditEvent && (
                            <button
                              type="button"
                              onClick={() => onEditEvent(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit Agenda"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isBuiltin ? (
                            <span
                              className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed inline-flex items-center"
                              title="Libur resmi nasional otomatis."
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            onDeleteEvent && (
                              <button
                                type="button"
                                onClick={() => onDeleteEvent(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus Agenda"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* Rentang Tanggal */}
                    <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-600 flex items-center justify-between border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="font-medium text-slate-800">
                          {item.tanggal_mulai === item.tanggal_selesai
                            ? item.tanggal_mulai
                            : `${item.tanggal_mulai} s/d ${item.tanggal_selesai}`}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {isMasukKhusus ? "Presensi Buka" : "Presensi Tutup"}
                      </span>
                    </div>

                    {/* Keterangan */}
                    {item.keterangan && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {item.keterangan}
                      </p>
                    )}

                    {/* Surat Edaran */}
                    {item.lampiran_surat && onPreviewSurat && (
                      <button
                        type="button"
                        onClick={() => onPreviewSurat(item)}
                        className="w-full py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Lihat Surat Edaran Resmi</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DETAIL AGENDA TANGGAL (SAAT TANGGAL DIKLIK) */}
      <Sheet
        isOpen={Boolean(selectedDateStr && selectedDateInfo)}
        onClose={() => setSelectedDateStr(null)}
        labelledBy="date-detail-title"
        size="md"
      >
        {selectedDateInfo && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header Modal Detail */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="min-w-0">
                <h3 id="date-detail-title" className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {selectedDateInfo.fullDateText}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  Agenda & Operasional Sekolah
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDateStr(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Operasional Banner */}
            <div
              className={`px-4 py-2.5 border-b text-xs flex items-center justify-between ${
                selectedDateInfo.statusType === "libur"
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : selectedDateInfo.statusType === "masuk_khusus"
                    ? "bg-blue-50 text-blue-800 border-blue-200"
                    : selectedDateInfo.statusType === "weekend"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}
            >
              <div>
                <p className="font-semibold leading-tight">
                  {selectedDateInfo.statusText}
                </p>
                <p className="text-[11px] opacity-80 leading-tight mt-0.5">
                  {selectedDateInfo.statusDesc}
                </p>
              </div>
            </div>

            {/* Konten Agenda */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map((ev, evIdx) => {
                  const theme = getCategoryTheme(ev.kategori, ev.tipe_hari);
                  const isBuiltin = Boolean(ev.is_builtin);
                  const isMasukKhusus = ev.tipe_hari === "masuk_khusus";

                  return (
                    <div
                      key={ev.id || `${ev.nama}-${evIdx}`}
                      className={`p-3.5 rounded-xl border space-y-2.5 bg-white ${theme.borderAccent} border-slate-200`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                          >
                            {isBuiltin
                              ? "Libur Nasional Resmi (SKB)"
                              : isMasukKhusus
                                ? "Masuk Khusus"
                                : theme.label}
                          </span>
                          <h4 className="text-sm font-semibold text-slate-900 leading-snug break-words">
                            {ev.nama}
                          </h4>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            {onEditEvent && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDateStr(null);
                                  onEditEvent(ev);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit Agenda"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isBuiltin ? (
                              <span
                                className="p-1.5 rounded-lg text-slate-300 inline-flex items-center cursor-not-allowed"
                                title="Agenda otomatis dari SKB Menteri"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              onDeleteEvent && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDateStr(null);
                                    onDeleteEvent(ev);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Hapus Agenda"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {/* Periode Tanggal */}
                      <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-600 flex items-center justify-between border border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="font-medium text-slate-800">
                            {ev.tanggal_mulai === ev.tanggal_selesai
                              ? ev.tanggal_mulai
                              : `${ev.tanggal_mulai} s/d ${ev.tanggal_selesai}`}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {isMasukKhusus ? "Presensi Buka" : "Presensi Tutup"}
                        </span>
                      </div>

                      {/* Keterangan */}
                      {ev.keterangan && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                          {ev.keterangan}
                        </p>
                      )}

                      {/* Tombol Surat Edaran */}
                      {ev.lampiran_surat && onPreviewSurat && (
                        <div className="pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onPreviewSurat(ev)}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Lihat Surat Edaran Resmi</span>
                          </button>
                          <a
                            href={ev.lampiran_surat}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Unduh Berkas Surat"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 px-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-semibold text-slate-800">
                      Tidak Ada Agenda Libur Terjadwal
                    </h5>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-0.5 leading-relaxed">
                      Hari sekolah biasa atau akhir pekan tanpa penetapan libur khusus.
                    </p>
                  </div>
                  {isAdmin && onAddNewHoliday && (
                    <button
                      type="button"
                      onClick={() => {
                        const dateToSet = selectedDateStr || undefined;
                        setSelectedDateStr(null);
                        onAddNewHoliday(dateToSet);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buat Agenda di Tanggal Ini</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer Modal Detail */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              {isAdmin && onAddNewHoliday && selectedDateEvents.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const dateToSet = selectedDateStr || undefined;
                    setSelectedDateStr(null);
                    onAddNewHoliday(dateToSet);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Agenda Lain</span>
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setSelectedDateStr(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

export default HolidayCalendarView;
