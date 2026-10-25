"use client";

import React, { useState, useMemo } from "react";
import { useClinic } from "@/lib/clinic-store";
import { Doctor } from "@/lib/types";
import { CLINIC_CONFIG, CLINIC_NAME } from "@/clinic.config";
import { formatCurrency, formatPhoneDisplay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Phone,
  ShieldCheck,
  Delete,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Upload,
  Wallet,
  Clock,
  MapPin,
  Stethoscope,
  BellRing,
  CalendarCheck,
  CreditCard,
  UserCheck,
} from "lucide-react";

type PatientScreen =
  | "DOCTORS_HOME"
  | "BOOKING_CHECKOUT"
  | "LIVE_QUEUE_TRACKER";

export default function PatientPortalPage() {
  const {
    doctors,
    bookings,
    currentPatient,
    loginWithPhoneOtp,
    createBooking,
    addDemoCreditPoints,
  } = useClinic();

  // Auth Flow State (Phone -> OTP Verification Mock)
  const [phoneInput, setPhoneInput] = useState("095123456");
  const [nameInput, setNameInput] = useState("U Ba Hlaing");
  const [authStep, setAuthStep] = useState<"PHONE" | "OTP">("PHONE");
  const [otpInput, setOtpInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Navigation & Booking Wizard State
  const [screen, setScreen] = useState<PatientScreen>("DOCTORS_HOME");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "credit_points" | "kpay" | "wavepay"
  >("credit_points");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  // Active bookings for current logged-in patient today
  const myActiveBookings = useMemo(() => {
    if (!currentPatient) return [];
    return bookings
      .filter(
        (b) =>
          b.patient_id === currentPatient.id &&
          b.status !== "cancelled" &&
          b.status !== "completed"
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [bookings, currentPatient]);

  const trackedBooking = useMemo(() => {
    if (activeBookingId) {
      const found = bookings.find((b) => b.id === activeBookingId);
      if (found) return found;
    }
    return myActiveBookings[0] || null;
  }, [activeBookingId, bookings, myActiveBookings]);

  const trackedDoctor = useMemo(() => {
    if (!trackedBooking) return null;
    return doctors.find((d) => d.id === trackedBooking.doctor_id) || null;
  }, [trackedBooking, doctors]);

  // Keypad handlers for Elderly-Friendly Phone & OTP Entry
  const handlePhoneDigit = (digit: string) => {
    setAuthError("");
    if (phoneInput.length < 12) {
      setPhoneInput((prev) => prev + digit);
    }
  };

  const handlePhoneBackspace = () => {
    setAuthError("");
    setPhoneInput((prev) => prev.slice(0, -1));
  };

  const handleSendOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = phoneInput.replace(/\D/g, "");
    if (cleaned.length < 7) {
      setAuthError("Please enter a valid phone number (at least 7 digits).");
      return;
    }
    setAuthError("");
    setOtpInput("1234"); // Pre-fill SMS mock code for effortless elderly accessibility
    setAuthStep("OTP");
  };

  const handleOtpDigit = (digit: string) => {
    setAuthError("");
    if (otpInput.length < 4) {
      setOtpInput((prev) => prev + digit);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otpInput.length < 4) {
      setAuthError("Please enter the 4-digit SMS code (1234).");
      return;
    }
    setIsSubmitting(true);
    try {
      await loginWithPhoneOtp(phoneInput, nameInput);
      setAuthStep("PHONE");
      setOtpInput("");
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error ? err.message : "Could not sign in. Please retry."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartBooking = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setBookingError("");
    setReceiptFile(null);
    setReceiptPreview(null);
    if (
      currentPatient &&
      currentPatient.credit_points >= doctor.consultation_fee
    ) {
      setPaymentMethod("credit_points");
    } else {
      setPaymentMethod("kpay");
    }
    setScreen("BOOKING_CHECKOUT");
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor) return;
    setBookingError("");
    setIsSubmitting(true);
    try {
      const created = await createBooking({
        doctorId: selectedDoctor.id,
        paymentMethod,
        receiptFile,
      });
      setActiveBookingId(created.id);
      setScreen("LIVE_QUEUE_TRACKER");
    } catch (err: unknown) {
      setBookingError(
        err instanceof Error ? err.message : "Could not complete booking."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // SCREEN 1: ELDERLY-FRIENDLY LOGIN (PHONE KEYPAD + SMS OTP MOCK)
  // ============================================================================
  if (!currentPatient) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <Card className="border-2 border-slate-900 shadow-xl">
          <CardHeader className="space-y-3 border-b-2 border-slate-200 bg-slate-900 text-white rounded-t-xl p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-clinic-primary text-white shadow-inner">
                <Phone className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-black text-white">
                  {authStep === "PHONE"
                    ? "Patient Sign In"
                    : "Enter SMS Code"}
                </CardTitle>
                <p className="text-base font-semibold text-slate-200">
                  {authStep === "PHONE"
                    ? "Enter your phone number to book or check your queue"
                    : `We sent a 4-digit code to ${formatPhoneDisplay(phoneInput)}`}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {authStep === "PHONE" ? (
              <form onSubmit={handleSendOtp} className="space-y-6">
                {/* Patient Name Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="patient-name"
                    className="block text-lg font-extrabold text-slate-950"
                  >
                    Your Full Name
                  </label>
                  <Input
                    id="patient-name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. U Ba Hlaing / Daw Mya Sein"
                    className="text-xl font-bold h-14 border-2 border-slate-800"
                  />
                </div>

                {/* Large Phone Number Display */}
                <div className="space-y-2">
                  <label
                    htmlFor="phone-display"
                    className="block text-lg font-extrabold text-slate-950"
                  >
                    Your Mobile Phone Number
                  </label>
                  <Input
                    id="phone-display"
                    type="tel"
                    value={phoneInput}
                    onChange={(e) =>
                      setPhoneInput(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="09xxxxxxxxx"
                    className="text-3xl font-black tracking-wider text-center h-16 border-2 border-slate-900 bg-slate-50"
                  />
                </div>

                {/* Large Touch Keypad for Elderly Patients */}
                <div
                  aria-label="Phone Number Keypad"
                  className="grid grid-cols-3 gap-3"
                >
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePhoneDigit(num)}
                      className="flex min-h-[60px] items-center justify-center rounded-2xl border-2 border-slate-300 bg-white text-2xl font-black text-slate-950 shadow-sm hover:bg-slate-100 active:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-clinic-primary/40"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPhoneInput("")}
                    className="flex min-h-[60px] items-center justify-center rounded-2xl border-2 border-red-300 bg-red-50 text-base font-extrabold text-red-900 hover:bg-red-100"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePhoneDigit("0")}
                    className="flex min-h-[60px] items-center justify-center rounded-2xl border-2 border-slate-300 bg-white text-2xl font-black text-slate-950 shadow-sm hover:bg-slate-100 active:bg-slate-200"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handlePhoneBackspace}
                    aria-label="Delete last digit"
                    className="flex min-h-[60px] items-center justify-center rounded-2xl border-2 border-slate-400 bg-slate-100 text-slate-950 hover:bg-slate-200"
                  >
                    <Delete className="h-7 w-7" />
                  </button>
                </div>

                {authError && (
                  <div className="rounded-xl border-2 border-red-700 bg-red-50 p-4 text-lg font-bold text-red-900">
                    {authError}
                  </div>
                )}

                <Button type="submit" size="xl" className="w-full">
                  Send SMS Verification Code
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* SMS OTP Mock Notification Banner */}
                <div className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 p-4 text-emerald-950">
                  <div className="flex items-center gap-2 font-extrabold text-lg">
                    <ShieldCheck className="h-6 w-6 text-emerald-700 shrink-0" />
                    <span>SMS Verification Code (Demo Mode): 1234</span>
                  </div>
                  <p className="mt-1 text-base font-semibold text-emerald-900">
                    We have pre-filled your 4-digit SMS code below so you can
                    sign in with one tap.
                  </p>
                </div>

                {/* Large 4-Digit OTP Display */}
                <div className="space-y-2">
                  <label
                    htmlFor="otp-input"
                    className="block text-lg font-extrabold text-slate-950"
                  >
                    4-Digit Verification Code
                  </label>
                  <Input
                    id="otp-input"
                    type="text"
                    maxLength={4}
                    value={otpInput}
                    onChange={(e) =>
                      setOtpInput(e.target.value.replace(/\D/g, ""))
                    }
                    className="text-4xl font-black tracking-[0.5em] text-center h-20 border-2 border-slate-900 bg-slate-50"
                  />
                </div>

                {/* Keypad for OTP */}
                <div className="grid grid-cols-3 gap-3">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleOtpDigit(num)}
                      className="flex min-h-[56px] items-center justify-center rounded-2xl border-2 border-slate-300 bg-white text-2xl font-black text-slate-950 hover:bg-slate-100"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOtpInput("1234")}
                    className="flex min-h-[56px] items-center justify-center rounded-2xl border-2 border-emerald-700 bg-emerald-50 text-sm font-extrabold text-emerald-950"
                  >
                    Auto 1234
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOtpDigit("0")}
                    className="flex min-h-[56px] items-center justify-center rounded-2xl border-2 border-slate-300 bg-white text-2xl font-black text-slate-950 hover:bg-slate-100"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpInput((prev) => prev.slice(0, -1))}
                    className="flex min-h-[56px] items-center justify-center rounded-2xl border-2 border-slate-400 bg-slate-100 text-slate-950"
                  >
                    <Delete className="h-6 w-6" />
                  </button>
                </div>

                {authError && (
                  <div className="rounded-xl border-2 border-red-700 bg-red-50 p-4 text-lg font-bold text-red-900">
                    {authError}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    variant="success"
                    size="xl"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 className="mr-2 h-7 w-7" />
                    Verify & Enter Clinic Portal
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={() => setAuthStep("PHONE")}
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Change Phone Number
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // SCREEN 4: LIVE QUEUE TRACKER (MASSIVE ELDERLY-FRIENDLY REALTIME DISPLAY)
  // ============================================================================
  if (screen === "LIVE_QUEUE_TRACKER" && trackedBooking && trackedDoctor) {
    const myNumber = trackedBooking.queue_number;
    const currentNumber = trackedDoctor.current_queue_number;
    const peopleAhead = Math.max(0, myNumber - currentNumber);

    const isMyTurn =
      trackedBooking.status === "in_progress" || currentNumber === myNumber;
    const isAlmostMyTurn = !isMyTurn && peopleAhead > 0 && peopleAhead <= 2;
    const isPassed = currentNumber > myNumber;

    // Color-coded status banner (WCAG AAA high contrast)
    const statusBannerClass = isMyTurn
      ? "bg-emerald-700 text-white border-emerald-950"
      : isAlmostMyTurn
      ? "bg-amber-400 text-slate-950 border-slate-950"
      : "bg-clinic-primary text-white border-slate-900";

    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="default"
            onClick={() => setScreen("DOCTORS_HOME")}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            All Doctors Today
          </Button>
          <Badge
            variant={
              trackedBooking.payment_status === "paid" ? "success" : "warning"
            }
            className="text-base px-4 py-2"
          >
            {trackedBooking.payment_status === "paid"
              ? "✓ Payment Confirmed"
              : "⏳ Receipt Under Reception Review"}
          </Badge>
        </div>

        {/* Massive Live Queue Status Card */}
        <div
          className={`rounded-3xl border-4 p-6 sm:p-8 shadow-xl transition-colors ${statusBannerClass}`}
        >
          <div className="flex items-center justify-between gap-3 border-b-2 border-current/20 pb-4">
            <div>
              <p className="text-sm font-black uppercase tracking-widest opacity-90">
                Live Consultation Queue
              </p>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">
                {trackedDoctor.name}
              </h1>
              <p className="flex items-center gap-1.5 text-lg font-bold mt-1 opacity-95">
                <MapPin className="h-5 w-5 shrink-0" />
                {trackedDoctor.room_number}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <BellRing className="h-8 w-8 animate-pulse" />
            </div>
          </div>

          {/* Two Massive Numbers Side by Side */}
          <div className="my-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Patient's Queue Number */}
            <div className="rounded-2xl bg-white p-6 text-center text-slate-950 shadow-lg border-2 border-slate-900">
              <span className="block text-base font-extrabold uppercase tracking-wider text-slate-700">
                Your Queue Number
              </span>
              <span className="mt-2 block text-6xl sm:text-7xl font-black tracking-tight text-slate-950">
                #{myNumber}
              </span>
              <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-800">
                Patient: {currentPatient.name}
              </span>
            </div>

            {/* Doctor's Current Queue Number */}
            <div className="rounded-2xl bg-slate-950 p-6 text-center text-white shadow-lg border-2 border-white/20">
              <span className="block text-base font-extrabold uppercase tracking-wider text-slate-300">
                Now Serving Number
              </span>
              <span className="mt-2 block text-6xl sm:text-7xl font-black tracking-tight text-emerald-400">
                #{currentNumber}
              </span>
              <span className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white">
                Updates Automatically
              </span>
            </div>
          </div>

          {/* Plain-Language Turn Guidance for Elderly Patients */}
          <div className="rounded-2xl bg-black/15 p-5 text-center">
            {isMyTurn ? (
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black">
                  IT IS YOUR TURN NOW!
                </p>
                <p className="text-lg sm:text-xl font-bold">
                  Please walk into {trackedDoctor.room_number} now.
                </p>
              </div>
            ) : isPassed ? (
              <div className="space-y-1">
                <p className="text-2xl font-black">
                  Your Queue Number #{myNumber} Has Been Called
                </p>
                <p className="text-lg font-bold">
                  Please check with the Reception Desk if you missed your turn.
                </p>
              </div>
            ) : isAlmostMyTurn ? (
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black">
                  PLEASE GET READY! ({peopleAhead}{" "}
                  {peopleAhead === 1 ? "Patient" : "Patients"} Ahead)
                </p>
                <p className="text-lg font-bold">
                  Please sit near {trackedDoctor.room_number}. You will be
                  called very soon.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black">
                  {peopleAhead} Patients Ahead of You
                </p>
                <p className="text-lg font-bold">
                  Estimated wait: ~{peopleAhead * 8} minutes. We will alert your
                  phone when you are within 3 turns.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Helpful Info Footer */}
        <Card className="border-2 border-slate-300">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-lg font-extrabold text-slate-950">
                Need Assistance at the Clinic?
              </p>
              <p className="text-base font-medium text-slate-700">
                Show this screen to our Reception Desk or call{" "}
                <span className="font-bold text-slate-950">
                  {CLINIC_CONFIG.supportPhone}
                </span>
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setScreen("DOCTORS_HOME")}
            >
              Book Another Specialist
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // SCREEN 3: SIMPLE STEP-BY-STEP BOOKING & CHECKOUT WIZARD
  // ============================================================================
  if (screen === "BOOKING_CHECKOUT" && selectedDoctor) {
    const fee = selectedDoctor.consultation_fee;
    const hasEnoughPoints = currentPatient.credit_points >= fee;
    const doctorBookingsToday = bookings.filter(
      (b) => b.doctor_id === selectedDoctor.id
    );
    const nextQueueNum =
      doctorBookingsToday.reduce(
        (max, b) => Math.max(max, b.queue_number),
        selectedDoctor.current_queue_number
      ) + 1;

    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-6">
        <Button
          variant="outline"
          size="default"
          onClick={() => setScreen("DOCTORS_HOME")}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Doctor List
        </Button>

        <Card className="border-2 border-slate-900 shadow-lg">
          <CardHeader className="border-b-2 border-slate-200 bg-slate-50">
            <Badge className="w-fit mb-1 text-sm">
              Step 2 of 2 • Confirm Appointment
            </Badge>
            <CardTitle className="text-2xl sm:text-3xl font-black text-slate-950">
              {selectedDoctor.name}
            </CardTitle>
            <p className="text-lg font-bold text-slate-700">
              {selectedDoctor.specialty} • {selectedDoctor.room_number}
            </p>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Summary Box */}
            <div className="grid grid-cols-2 gap-4 rounded-2xl border-2 border-slate-300 bg-slate-50 p-4">
              <div>
                <span className="block text-sm font-bold uppercase text-slate-600">
                  Your Queue Ticket
                </span>
                <span className="text-3xl font-black text-clinic-primary">
                  #{nextQueueNum}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-sm font-bold uppercase text-slate-600">
                  Consultation Fee
                </span>
                <span className="text-2xl sm:text-3xl font-black text-slate-950">
                  {formatCurrency(fee)}
                </span>
              </div>
            </div>

            {/* 1-CLICK CREDIT POINTS CHECKOUT (PRIMARY OPTION FOR RETURNING/REFUNDED PATIENTS) */}
            <div className="space-y-3">
              <h2 className="text-xl font-black text-slate-950">
                Choose How You Want to Pay
              </h2>

              <div
                onClick={() =>
                  hasEnoughPoints && setPaymentMethod("credit_points")
                }
                className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                  paymentMethod === "credit_points"
                    ? "border-emerald-700 bg-emerald-50 ring-4 ring-emerald-600/20"
                    : "border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Wallet className="h-7 w-7 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xl font-black text-slate-950">
                        Use My Clinic Credit Points (1-Click Instant)
                      </span>
                      <span className="block text-base font-bold text-emerald-900 mt-1">
                        Your Available Balance:{" "}
                        {formatCurrency(currentPatient.credit_points)}
                      </span>
                    </div>
                  </div>
                  <Badge variant={hasEnoughPoints ? "success" : "secondary"}>
                    {hasEnoughPoints ? "Fastest" : "Low Balance"}
                  </Badge>
                </div>

                {!hasEnoughPoints && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                    <span className="text-sm font-bold text-slate-700">
                      Need {formatCurrency(fee - currentPatient.credit_points)}{" "}
                      more points for 1-click checkout.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        addDemoCreditPoints(15000);
                        setPaymentMethod("credit_points");
                      }}
                    >
                      + Add 15,000 Demo Points
                    </Button>
                  </div>
                )}
              </div>

              {/* KPay & WavePay Selection Buttons */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("kpay")}
                  className={`flex min-h-[64px] items-center justify-between rounded-2xl border-2 p-4 text-left transition-all ${
                    paymentMethod === "kpay"
                      ? "border-clinic-primary bg-clinic-light ring-4 ring-clinic-primary/20"
                      : "border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <span className="block text-lg font-black text-slate-950">
                      KBZPay (KPay)
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                      Upload transfer screenshot
                    </span>
                  </div>
                  <CreditCard className="h-6 w-6 text-clinic-primary" />
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("wavepay")}
                  className={`flex min-h-[64px] items-center justify-between rounded-2xl border-2 p-4 text-left transition-all ${
                    paymentMethod === "wavepay"
                      ? "border-clinic-primary bg-clinic-light ring-4 ring-clinic-primary/20"
                      : "border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <span className="block text-lg font-black text-slate-950">
                      WavePay
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                      Upload transfer screenshot
                    </span>
                  </div>
                  <CreditCard className="h-6 w-6 text-clinic-primary" />
                </button>
              </div>
            </div>

            {/* KPay / WavePay Transfer Details & Receipt Uploader */}
            {(paymentMethod === "kpay" || paymentMethod === "wavepay") && (
              <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-5 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-extrabold uppercase tracking-wider text-slate-600">
                    Step A: Transfer {formatCurrency(fee)} to {CLINIC_NAME}
                  </p>
                  <p className="text-2xl font-black text-slate-950">
                    {paymentMethod === "kpay"
                      ? CLINIC_CONFIG.paymentAccounts.kpay.provider
                      : CLINIC_CONFIG.paymentAccounts.wavepay.provider}
                    :{" "}
                    <span className="text-clinic-primary">
                      {CLINIC_CONFIG.paymentAccounts.kpay.accountNumber}
                    </span>
                  </p>
                  <p className="text-base font-bold text-slate-700">
                    Account Name:{" "}
                    {CLINIC_CONFIG.paymentAccounts.kpay.accountName}
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="receipt-upload"
                    className="block text-base font-extrabold text-slate-950"
                  >
                    Step B: Upload Your Payment Receipt Screenshot
                  </label>
                  <label
                    htmlFor="receipt-upload"
                    className="flex min-h-[72px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-900 bg-white p-4 text-center hover:bg-slate-100"
                  >
                    <Upload className="h-7 w-7 text-clinic-primary mb-1" />
                    <span className="text-lg font-extrabold text-slate-950">
                      {receiptFile
                        ? `Selected: ${receiptFile.name}`
                        : "Tap Here to Choose Receipt Photo"}
                    </span>
                    <span className="text-sm font-semibold text-slate-600">
                      (Or tap Confirm below to attach a sample KPay receipt for
                      demo)
                    </span>
                    <input
                      id="receipt-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptChange}
                      className="hidden"
                    />
                  </label>

                  {receiptPreview && (
                    <div className="mt-3 overflow-hidden rounded-xl border-2 border-slate-300 bg-white p-2">
                      <img
                        src={receiptPreview}
                        alt="Receipt Preview"
                        className="mx-auto max-h-48 object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {bookingError && (
              <div className="rounded-xl border-2 border-red-700 bg-red-50 p-4 text-lg font-bold text-red-900">
                {bookingError}
              </div>
            )}

            {/* Primary Checkout Button */}
            {paymentMethod === "credit_points" ? (
              <Button
                type="button"
                variant="success"
                size="xl"
                className="w-full"
                disabled={!hasEnoughPoints || isSubmitting}
                onClick={handleConfirmBooking}
              >
                <Sparkles className="mr-2 h-7 w-7" />
                {isSubmitting
                  ? "Booking Your Queue Number..."
                  : `1-Click Checkout (${formatCurrency(fee)} Points)`}
              </Button>
            ) : (
              <Button
                type="button"
                size="xl"
                className="w-full"
                disabled={isSubmitting}
                onClick={handleConfirmBooking}
              >
                <CheckCircle2 className="mr-2 h-7 w-7" />
                {isSubmitting
                  ? "Uploading Receipt & Booking..."
                  : "Submit Receipt & Get Queue Number"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // SCREEN 2: HOME - LARGE, EASY-TO-READ LIST OF AVAILABLE DOCTORS FOR TODAY
  // ============================================================================
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-8">
      {/* Welcome Banner & Active Queue Shortcut */}
      <div className="rounded-3xl border-2 border-slate-900 bg-white p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-700 px-3 py-1 text-sm font-extrabold text-emerald-950">
              <UserCheck className="h-4 w-4 text-emerald-700" />
              Signed in as {currentPatient.name} (
              {formatPhoneDisplay(currentPatient.phone)})
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 pt-1">
              Available Doctors Today
            </h1>
            <p className="text-lg font-semibold text-slate-700">
              Select a specialist below to get your instant queue number.
            </p>
          </div>

          {myActiveBookings.length > 0 && (
            <Button
              variant="success"
              size="lg"
              onClick={() => {
                setActiveBookingId(myActiveBookings[0].id);
                setScreen("LIVE_QUEUE_TRACKER");
              }}
              className="shrink-0"
            >
              <BellRing className="mr-2 h-6 w-6" />
              Your Queue Number (#{myActiveBookings[0].queue_number})
            </Button>
          )}
        </div>
      </div>

      {/* Active Bookings Banner if Patient Has One */}
      {myActiveBookings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-black text-slate-950">
            Your Active Appointments Today
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {myActiveBookings.map((b) => {
              const doc = doctors.find((d) => d.id === b.doctor_id);
              if (!doc) return null;
              const isTurn = doc.current_queue_number === b.queue_number;
              return (
                <div
                  key={b.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border-2 p-5 shadow-sm ${
                    isTurn
                      ? "border-emerald-800 bg-emerald-700 text-white"
                      : "border-clinic-primary bg-clinic-light text-slate-950"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xl font-black">
                        Your Queue #{b.queue_number}
                      </span>
                      <span className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-extrabold text-white">
                        Doctor at #{doc.current_queue_number}
                      </span>
                    </div>
                    <p className="text-xl font-extrabold">{doc.name}</p>
                    <p className="text-base font-bold opacity-90">
                      {doc.room_number}
                    </p>
                  </div>
                  <Button
                    variant={isTurn ? "outline" : "default"}
                    size="lg"
                    onClick={() => {
                      setActiveBookingId(b.id);
                      setScreen("LIVE_QUEUE_TRACKER");
                    }}
                    className="w-full sm:w-auto"
                  >
                    Open Live Queue Tracker
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Large Elderly-Friendly Doctor Cards */}
      <div className="grid grid-cols-1 gap-6">
        {doctors
          .filter((d) => d.is_active)
          .map((doctor) => {
            const waitingCount = bookings.filter(
              (b) =>
                b.doctor_id === doctor.id &&
                b.status === "waiting" &&
                b.queue_number > doctor.current_queue_number
            ).length;

            return (
              <Card
                key={doctor.id}
                className="border-2 border-slate-300 hover:border-slate-900 transition-all shadow-md"
              >
                <CardContent className="p-6 sm:p-7">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Doctor Details */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="default" className="text-base px-3.5 py-1">
                          <MapPin className="mr-1.5 h-4 w-4" />
                          {doctor.room_number}
                        </Badge>
                        <Badge variant="secondary" className="text-base px-3.5 py-1">
                          Fee: {formatCurrency(doctor.consultation_fee)}
                        </Badge>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-black text-slate-950">
                        {doctor.name}
                      </h2>

                      <p className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-700">
                        <Stethoscope className="h-6 w-6 text-clinic-primary shrink-0" />
                        {doctor.specialty}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 pt-1 text-base font-extrabold text-slate-800">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 border border-slate-300">
                          <Clock className="h-5 w-5 text-clinic-primary" />
                          Currently Serving:{" "}
                          <strong className="text-xl text-clinic-primary">
                            #{doctor.current_queue_number}
                          </strong>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 border border-emerald-300 text-emerald-950">
                          {waitingCount === 0
                            ? "No Wait • Immediate Next Turn"
                            : `${waitingCount} ${
                                waitingCount === 1 ? "Patient" : "Patients"
                              } Waiting`}
                        </span>
                      </div>
                    </div>

                    {/* Right: Massive Primary Action Button */}
                    <div className="lg:w-72 shrink-0">
                      <Button
                        size="xl"
                        className="w-full"
                        onClick={() => handleStartBooking(doctor)}
                      >
                        <CalendarCheck className="mr-2.5 h-7 w-7" />
                        Book Appointment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
