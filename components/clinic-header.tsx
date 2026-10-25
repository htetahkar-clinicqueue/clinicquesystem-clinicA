"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLINIC_NAME, LOGO_URL, PRIMARY_COLOR } from "@/clinic.config";
import { useClinic } from "@/lib/clinic-store";
import { formatCurrency } from "@/lib/utils";
import {
  Stethoscope,
  LayoutDashboard,
  UserRound,
  Wallet,
  LogOut,
  Wifi,
} from "lucide-react";

export function ClinicHeader() {
  const pathname = usePathname();
  const { currentPatient, logoutPatient, isRealtimeConnected } = useClinic();

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand Identity */}
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl py-1 pr-2 focus:outline-none focus:ring-4 focus:ring-clinic-primary/30"
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            <img
              src={LOGO_URL}
              alt={CLINIC_NAME}
              className="h-9 w-9 object-contain"
            />
          </div>
          <div>
            <span className="block text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              {CLINIC_NAME}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <Wifi className="h-3.5 w-3.5 text-emerald-600" />
              {isRealtimeConnected ? "Live Queue Active" : "Offline Ready"}
            </span>
          </div>
        </Link>

        {/* Portal Switcher & Patient Wallet Status */}
        <div className="flex flex-wrap items-center gap-2">
          <nav
            aria-label="Portal Navigation"
            className="flex items-center rounded-xl border-2 border-slate-200 bg-slate-100 p-1"
          >
            <Link
              href="/"
              className={`flex min-h-[44px] items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-extrabold transition-colors ${
                pathname === "/"
                  ? "bg-clinic-primary text-white shadow-sm"
                  : "text-slate-800 hover:bg-white"
              }`}
            >
              <UserRound className="h-4 w-4" />
              <span>Patient</span>
            </Link>
            <Link
              href="/reception"
              className={`flex min-h-[44px] items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-extrabold transition-colors ${
                pathname?.startsWith("/reception")
                  ? "bg-clinic-primary text-white shadow-sm"
                  : "text-slate-800 hover:bg-white"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Reception</span>
            </Link>
            <Link
              href="/doctor"
              className={`flex min-h-[44px] items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-extrabold transition-colors ${
                pathname?.startsWith("/doctor")
                  ? "bg-clinic-primary text-white shadow-sm"
                  : "text-slate-800 hover:bg-white"
              }`}
            >
              <Stethoscope className="h-4 w-4" />
              <span>Doctor</span>
            </Link>
          </nav>

          {currentPatient && pathname === "/" && (
            <div className="flex items-center gap-2">
              <div className="flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-emerald-700 bg-emerald-50 px-3.5 py-1.5 text-emerald-950">
                <Wallet className="h-5 w-5 text-emerald-700" />
                <div className=" leading-tight">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Credit Points
                  </span>
                  <span className="text-base font-black">
                    {formatCurrency(currentPatient.credit_points)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={logoutPatient}
                title="Sign Out"
                className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
