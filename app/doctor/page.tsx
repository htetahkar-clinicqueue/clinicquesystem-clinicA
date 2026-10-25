"use client";

import React, { useState } from "react";
import { useClinic } from "@/lib/clinic-store";
import { Button } from "@/components/ui/button";
import { ArrowRightCircle, Stethoscope, BellRing } from "lucide-react";

export default function DoctorMinimalistPortalPage() {
  const { doctors, advanceDoctorQueue } = useClinic();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    doctors[0]?.id || "11111111-1111-4111-8111-111111111101"
  );
  const [isCalling, setIsCalling] = useState(false);
  const [lastNotified, setLastNotified] = useState<string | null>(null);

  const activeDoctor =
    doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  if (!activeDoctor) return null;

  const handleCallNext = async () => {
    setIsCalling(true);
    try {
      const res = await advanceDoctorQueue(activeDoctor.id);
      setLastNotified(
        res.notifiedPatients.length > 0
          ? `Synced with Reception • Alerted ${res.notifiedPatients.join(", ")}`
          : `Synced with Reception • Queue #${res.newQueueNumber}`
      );
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-2xl flex-col justify-between px-4 py-8 sm:px-6">
      {/* Minimalist Room Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-6 w-6 text-clinic-primary" />
          <span className="text-base font-extrabold text-slate-700">
            Consultation Room:
          </span>
        </div>
        <select
          aria-label="Select Doctor Room"
          value={activeDoctor.id}
          onChange={(e) => {
            setSelectedDoctorId(e.target.value);
            setLastNotified(null);
          }}
          className="min-h-[48px] rounded-xl border-2 border-slate-900 bg-slate-50 px-4 py-2 text-lg font-black text-slate-950 focus:outline-none focus:ring-4 focus:ring-clinic-primary/30"
        >
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.room_number})
            </option>
          ))}
        </select>
      </div>

      {/* Massive Ultra-Minimalist Current Queue Display */}
      <div className="my-8 flex flex-1 flex-col items-center justify-center rounded-3xl border-4 border-slate-900 bg-white p-10 text-center shadow-xl">
        <p className="text-lg font-black uppercase tracking-widest text-slate-600">
          {activeDoctor.room_number} • Now Serving
        </p>

        <div className="my-6 text-[7rem] sm:text-[9.5rem] font-black leading-none tracking-tighter text-slate-950">
          #{activeDoctor.current_queue_number}
        </div>

        <p className="text-xl font-bold text-slate-800">{activeDoctor.name}</p>

        {lastNotified && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-emerald-700 bg-emerald-50 px-4 py-2 text-base font-extrabold text-emerald-950">
            <BellRing className="h-5 w-5 text-emerald-700" />
            {lastNotified}
          </div>
        )}
      </div>

      {/* Massive Full-Width [Call Next Patient] Button */}
      <Button
        size="xl"
        onClick={handleCallNext}
        disabled={isCalling}
        className="min-h-[88px] w-full rounded-3xl text-2xl sm:text-3xl font-black shadow-xl"
      >
        <ArrowRightCircle className="mr-3 h-9 w-9" />
        {isCalling
          ? "Calling Next Patient..."
          : `Call Next Patient (#${activeDoctor.current_queue_number + 1})`}
      </Button>
    </div>
  );
}
