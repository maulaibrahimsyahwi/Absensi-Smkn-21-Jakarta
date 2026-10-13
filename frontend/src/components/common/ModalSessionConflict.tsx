import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert, Smartphone, ArrowRight } from "lucide-react";
import Button from "../ui/Button";

export interface SessionConflictData {
  errorCode: string;
  message: string;
}

/**
 * Modal Notifikasi untuk Konflik Sesi Multi-Perangkat (Single Active Session).
 */
export default function ModalSessionConflict() {
  const [conflictData, setConflictData] = useState<SessionConflictData | null>(
    null,
  );
  const [countdown, setCountdown] = useState<number>(5);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 1. Tangkap custom event internal dari axios interceptor (api.js)
    const handleSessionConflictEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        errorCode?: string;
        message?: string;
      }>;
      const detail = customEvent.detail || {};
      setConflictData({
        errorCode: detail.errorCode || "SESSION_TERMINATED",
        message:
          detail.message ||
          "Akun Anda telah login di perangkat lain. Sesi ini telah diakhiri demi keamanan data Anda.",
      });
      setCountdown(5);
    };

    window.addEventListener(
      "smkn21_session_conflict",
      handleSessionConflictEvent,
    );

    // 2. Tangkap sinyal antar tab via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("smkn21_auth_channel");
        bc.onmessage = (event: MessageEvent) => {
          if (event.data?.type === "SESSION_CONFLICT") {
            setConflictData({
              errorCode: event.data.errorCode || "SESSION_TERMINATED",
              message:
                event.data.message ||
                "Akun Anda telah login di perangkat lain. Sesi pada perangkat ini telah diakhiri.",
            });
            setCountdown(5);
          }
        };
      }
    } catch (_err) {
      // ignore
    }

    return () => {
      window.removeEventListener(
        "smkn21_session_conflict",
        handleSessionConflictEvent,
      );
      if (bc) bc.close();
    };
  }, []);

  // Timer hitung mundur 5 detik saat modal aktif
  useEffect(() => {
    if (!conflictData) return;

    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      handleRedirectToLogin();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [conflictData, countdown]);

  const handleRedirectToLogin = () => {
    try {
      localStorage.removeItem("smkn21_auth_token");
      localStorage.removeItem("smkn21_auth_user");
      sessionStorage.removeItem("smkn21_piket_idle_locked");
    } catch (_e) {
      // ignore
    }

    const reason =
      conflictData?.errorCode === "ACCOUNT_DELETED"
        ? "deleted=1"
        : "conflict=1";

    if (!window.location.pathname.includes("/login")) {
      window.location.href = `/login?${reason}`;
    } else {
      setConflictData(null);
    }
  };

  if (!conflictData) return null;

  const isMultiDevice =
    conflictData.errorCode === "SESSION_TERMINATED" ||
    conflictData.message.includes("perangkat lain");

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
      aria-describedby="conflict-desc"
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 sm:items-center sm:p-4 select-none"
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shadow-2xl animate-in slide-in-from-bottom duration-300 sm:rounded-3xl sm:p-8">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
          {isMultiDevice ? (
            <Smartphone className="h-7 w-7" />
          ) : (
            <ShieldAlert className="h-7 w-7" />
          )}
        </span>
        <h2
          id="conflict-title"
          className="text-lg font-extrabold tracking-tight text-slate-900"
        >
          {isMultiDevice ? "Akun masuk di perangkat lain" : "Sesi berakhir"}
        </h2>
        <p
          id="conflict-desc"
          className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600"
        >
          {conflictData.message}
        </p>

        <div className="mt-5">
          <div className="h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-900 transition-[width] duration-1000 ease-linear"
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Dialihkan ke halaman login dalam {countdown} detik
          </p>
        </div>

        <Button
          autoFocus
          variant="primary"
          className="mt-4 w-full"
          onClick={handleRedirectToLogin}
        >
          Login ulang
        </Button>
      </div>
    </div>,
    document.body,
  );
}
