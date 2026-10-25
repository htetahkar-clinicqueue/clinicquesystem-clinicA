"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  Patient,
  Doctor,
  Booking,
  Transaction,
  PaymentMethod,
  PushNotificationLog,
} from "@/lib/types";
import {
  supabase,
  isSupabaseConfigured,
  uploadReceiptImage,
} from "@/lib/supabase";
import {
  requestFcmToken,
  triggerLocalBrowserNotification,
} from "@/lib/firebase";
import { CLINIC_CONFIG } from "@/clinic.config";

const STORAGE_KEY = "auracare_clinic_state_v1";
const PATIENT_SESSION_KEY = "auracare_current_patient_id_v1";
const CHANNEL_NAME = "auracare_realtime_channel";

const SAMPLE_RECEIPT_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640">
  <rect width="480" height="640" rx="24" fill="#F8FAFC"/>
  <rect x="24" y="24" width="432" height="592" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
  <rect x="24" y="24" width="432" height="110" rx="16" fill="#0B5ED7"/>
  <text x="240" y="72" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="24" font-weight="bold">KBZPay Transfer Receipt</text>
  <text x="240" y="106" text-anchor="middle" fill="#E2E8F0" font-family="sans-serif" font-size="16">Payment Successful</text>
  <circle cx="240" cy="190" r="34" fill="#16A34A"/>
  <path d="M224 190L235 202L258 178" stroke="white" stroke-width="6" fill="none" stroke-linecap="round"/>
  <text x="240" y="268" text-anchor="middle" fill="#0F172A" font-family="sans-serif" font-size="34" font-weight="bold">-15,000 MMK</text>
  <line x1="56" y1="310" x2="424" y2="310" stroke="#E2E8F0" stroke-width="2"/>
  <text x="56" y="355" fill="#475569" font-family="sans-serif" font-size="16">Merchant</text>
  <text x="424" y="355" text-anchor="end" fill="#0F172A" font-family="sans-serif" font-size="16" font-weight="bold">AuraCare Poly Clinic</text>
  <text x="56" y="405" fill="#475569" font-family="sans-serif" font-size="16">Transaction No.</text>
  <text x="424" y="405" text-anchor="end" fill="#0F172A" font-family="sans-serif" font-size="16" font-weight="bold">KPAY-20261025-88392</text>
  <text x="56" y="455" fill="#475569" font-family="sans-serif" font-size="16">Account Phone</text>
  <text x="424" y="455" text-anchor="end" fill="#0F172A" font-family="sans-serif" font-size="16" font-weight="bold">09-777-888-999</text>
  <text x="56" y="505" fill="#475569" font-family="sans-serif" font-size="16">Notes</text>
  <text x="424" y="505" text-anchor="end" fill="#0F172A" font-family="sans-serif" font-size="16" font-weight="bold">Clinic Consultation Fee</text>
</svg>
`)}`;

const TODAY_STR = new Date().toISOString().split("T")[0];

const INITIAL_DOCTORS: Doctor[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    name: "Dr. Aung Kyaw Moe",
    specialty: "Heart & Blood Pressure Specialist (Cardiology)",
    room_number: "Room 101 • Ground Floor",
    current_queue_number: 3,
    consultation_fee: CLINIC_CONFIG.defaultConsultationFee,
    is_active: true,
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    name: "Dr. May Thuzar Win",
    specialty: "General Physician & Senior Citizen Care",
    room_number: "Room 102 • Ground Floor",
    current_queue_number: 5,
    consultation_fee: CLINIC_CONFIG.defaultConsultationFee,
    is_active: true,
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    name: "Dr. Zaw Min Tun",
    specialty: "Bone, Knee & Joint Specialist (Orthopedics)",
    room_number: "Room 105 • Ground Floor",
    current_queue_number: 1,
    consultation_fee: CLINIC_CONFIG.defaultConsultationFee,
    is_active: true,
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    name: "Dr. Khin Myat Noe",
    specialty: "Eye & Cataract Specialist (Ophthalmology)",
    room_number: "Room 201 • Lift Accessible",
    current_queue_number: 2,
    consultation_fee: CLINIC_CONFIG.defaultConsultationFee,
    is_active: true,
  },
];

const INITIAL_PATIENTS: Patient[] = [
  {
    id: "22222222-2222-4222-8222-222222222201",
    phone: "095123456",
    name: "U Ba Hlaing",
    credit_points: 30000,
    fcm_token: "fcm_device_ubahlaing",
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    phone: "0942001122",
    name: "Daw Mya Sein",
    credit_points: 15000,
    fcm_token: "fcm_device_dawmyasein",
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    phone: "0979887766",
    name: "U Tin Oo",
    credit_points: 0,
    fcm_token: "fcm_device_utinoo",
  },
  {
    id: "22222222-2222-4222-8222-222222222204",
    phone: "0997112233",
    name: "Daw Khin Saw",
    credit_points: 45000,
    fcm_token: "fcm_device_dawkhinsaw",
  },
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "33333333-3333-4333-8333-333333333301",
    patient_id: "22222222-2222-4222-8222-222222222202",
    doctor_id: "11111111-1111-4111-8111-111111111101",
    booking_date: TODAY_STR,
    queue_number: 3,
    status: "in_progress",
    payment_status: "paid",
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: "33333333-3333-4333-8333-333333333302",
    patient_id: "22222222-2222-4222-8222-222222222203",
    doctor_id: "11111111-1111-4111-8111-111111111101",
    booking_date: TODAY_STR,
    queue_number: 4,
    status: "waiting",
    payment_status: "pending",
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: "33333333-3333-4333-8333-333333333303",
    patient_id: "22222222-2222-4222-8222-222222222204",
    doctor_id: "11111111-1111-4111-8111-111111111101",
    booking_date: TODAY_STR,
    queue_number: 5,
    status: "waiting",
    payment_status: "paid",
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: "33333333-3333-4333-8333-333333333304",
    patient_id: "22222222-2222-4222-8222-222222222202",
    doctor_id: "11111111-1111-4111-8111-111111111102",
    booking_date: TODAY_STR,
    queue_number: 6,
    status: "waiting",
    payment_status: "paid",
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "44444444-4444-4444-8444-444444444401",
    patient_id: "22222222-2222-4222-8222-222222222203",
    booking_id: "33333333-3333-4333-8333-333333333302",
    amount: 15000,
    payment_method: "kpay",
    receipt_image_url: SAMPLE_RECEIPT_SVG,
    type: "payment",
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: "44444444-4444-4444-8444-444444444402",
    patient_id: "22222222-2222-4222-8222-222222222204",
    booking_id: "33333333-3333-4333-8333-333333333303",
    amount: 15000,
    payment_method: "credit_points",
    receipt_image_url: null,
    type: "payment",
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
];

interface LocalPersistedState {
  patients: Patient[];
  doctors: Doctor[];
  bookings: Booking[];
  transactions: Transaction[];
  pushLogs: PushNotificationLog[];
}

interface ClinicContextValue {
  patients: Patient[];
  doctors: Doctor[];
  bookings: Booking[];
  transactions: Transaction[];
  pushLogs: PushNotificationLog[];
  currentPatient: Patient | null;
  isLoading: boolean;
  isRealtimeConnected: boolean;
  loginWithPhoneOtp: (phone: string, name?: string) => Promise<Patient>;
  logoutPatient: () => void;
  createBooking: (params: {
    doctorId: string;
    paymentMethod: "kpay" | "wavepay" | "credit_points";
    receiptFile?: File | null;
  }) => Promise<Booking>;
  advanceDoctorQueue: (doctorId: string) => Promise<{
    newQueueNumber: number;
    notifiedPatients: string[];
  }>;
  verifyReceiptAndConfirmBooking: (bookingId: string) => Promise<void>;
  cancelBookingAndRefund: (bookingId: string) => Promise<{
    refundedAmount: number;
    patientName: string;
  }>;
  addDemoCreditPoints: (amount: number) => Promise<void>;
}

const ClinicContext = createContext<ClinicContextValue | null>(null);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [pushLogs, setPushLogs] = useState<PushNotificationLog[]>([]);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);

  const broadcastRef = useRef<BroadcastChannel | null>(null);

  const persistState = useCallback((next: LocalPersistedState) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      broadcastRef.current?.postMessage({
        type: "SYNC_STATE",
        payload: next,
      });
    } catch {
      // Ignore quota errors
    }
  }, []);

  const fetchSupabaseData = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) return;
    try {
      const [
        { data: docs },
        { data: pats },
        { data: bks },
        { data: txs },
      ] = await Promise.all([
        supabase.from("doctors").select("*").order("room_number"),
        supabase.from("patients").select("*"),
        supabase
          .from("bookings")
          .select("*")
          .eq("booking_date", TODAY_STR)
          .order("queue_number", { ascending: true }),
        supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (docs && docs.length > 0) {
        setDoctors(
          docs.map((d) => ({
            ...d,
            consultation_fee:
              Number(d.consultation_fee) || CLINIC_CONFIG.defaultConsultationFee,
          }))
        );
      }
      if (pats) {
        setPatients(
          pats.map((p) => ({
            ...p,
            credit_points: Number(p.credit_points) || 0,
          }))
        );
      }
      if (bks) setBookings(bks);
      if (txs) {
        setTransactions(
          txs.map((t) => ({
            ...t,
            amount: Number(t.amount) || 0,
          }))
        );
      }
    } catch {
      // Keep local fallback state
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Hydrate from localStorage
    const savedStateRaw = localStorage.getItem(STORAGE_KEY);
    if (savedStateRaw) {
      try {
        const parsed = JSON.parse(savedStateRaw) as LocalPersistedState;
        if (parsed.doctors?.length) setDoctors(parsed.doctors);
        if (parsed.patients?.length) setPatients(parsed.patients);
        if (parsed.bookings) setBookings(parsed.bookings);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.pushLogs) setPushLogs(parsed.pushLogs);
      } catch {
        // Ignore invalid storage
      }
    } else {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          patients: INITIAL_PATIENTS,
          doctors: INITIAL_DOCTORS,
          bookings: INITIAL_BOOKINGS,
          transactions: INITIAL_TRANSACTIONS,
          pushLogs: [],
        })
      );
    }

    const savedPatientId = localStorage.getItem(PATIENT_SESSION_KEY);
    if (savedPatientId) {
      setCurrentPatientId(savedPatientId);
    }

    setIsLoading(false);

    // 2. Setup Cross-Tab BroadcastChannel Realtime Sync
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data?.type === "SYNC_STATE" && event.data?.payload) {
          const p = event.data.payload as LocalPersistedState;
          setDoctors(p.doctors);
          setPatients(p.patients);
          setBookings(p.bookings);
          setTransactions(p.transactions);
          setPushLogs(p.pushLogs || []);
        }
      };
      broadcastRef.current = bc;
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const p = JSON.parse(e.newValue) as LocalPersistedState;
          setDoctors(p.doctors);
          setPatients(p.patients);
          setBookings(p.bookings);
          setTransactions(p.transactions);
          setPushLogs(p.pushLogs || []);
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    // 3. Setup Supabase Realtime Subscription if configured
    let supabaseChannel: ReturnType<NonNullable<typeof supabase>["channel"]> | null =
      null;

    if (supabase && isSupabaseConfigured) {
      fetchSupabaseData();
      supabaseChannel = supabase
        .channel("clinic-realtime-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "doctors" },
          () => fetchSupabaseData()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bookings" },
          () => fetchSupabaseData()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "patients" },
          () => fetchSupabaseData()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "transactions" },
          () => fetchSupabaseData()
        )
        .subscribe((status) => {
          setIsRealtimeConnected(status === "SUBSCRIBED" || true);
        });
    }

    return () => {
      window.removeEventListener("storage", handleStorageEvent);
      broadcastRef.current?.close();
      if (supabase && supabaseChannel) {
        supabase.removeChannel(supabaseChannel);
      }
    };
  }, [fetchSupabaseData]);

  const currentPatient =
    patients.find((p) => p.id === currentPatientId) || null;

  const loginWithPhoneOtp = useCallback(
    async (phone: string, name?: string): Promise<Patient> => {
      const normalizedPhone = phone.replace(/\D/g, "");
      const fcmToken = await requestFcmToken();

      if (supabase && isSupabaseConfigured) {
        const { data: existing } = await supabase
          .from("patients")
          .select("*")
          .eq("phone", normalizedPhone)
          .maybeSingle();

        if (existing) {
          const updatedName =
            name && name.trim().length > 0 ? name.trim() : existing.name;
          const { data: updated } = await supabase
            .from("patients")
            .update({
              name: updatedName,
              fcm_token: fcmToken || existing.fcm_token,
            })
            .eq("id", existing.id)
            .select("*")
            .single();

          const patientObj: Patient = {
            ...(updated || existing),
            credit_points: Number((updated || existing).credit_points) || 0,
          };
          setCurrentPatientId(patientObj.id);
          localStorage.setItem(PATIENT_SESSION_KEY, patientObj.id);
          await fetchSupabaseData();
          return patientObj;
        } else {
          const { data: created, error } = await supabase
            .from("patients")
            .insert({
              phone: normalizedPhone,
              name: name?.trim() || `Patient (${normalizedPhone.slice(-4)})`,
              credit_points: 30000, // Welcome credit points for instant testing
              fcm_token: fcmToken,
            })
            .select("*")
            .single();

          if (!error && created) {
            const patientObj: Patient = {
              ...created,
              credit_points: Number(created.credit_points) || 0,
            };
            setCurrentPatientId(patientObj.id);
            localStorage.setItem(PATIENT_SESSION_KEY, patientObj.id);
            await fetchSupabaseData();
            return patientObj;
          }
        }
      }

      // Local / Hybrid state handling
      let matched = patients.find(
        (p) => p.phone.replace(/\D/g, "") === normalizedPhone
      );

      let nextPatients: Patient[];
      if (matched) {
        matched = {
          ...matched,
          name: name?.trim() ? name.trim() : matched.name,
          fcm_token: fcmToken || matched.fcm_token,
        };
        nextPatients = patients.map((p) =>
          p.id === matched!.id ? matched! : p
        );
      } else {
        matched = {
          id: crypto.randomUUID(),
          phone: normalizedPhone,
          name: name?.trim() || `Daw / U (${normalizedPhone.slice(-4)})`,
          credit_points: 30000, // Pre-loaded 30,000 MMK credit points for 1-click checkout testing
          fcm_token: fcmToken,
          created_at: new Date().toISOString(),
        };
        nextPatients = [...patients, matched];
      }

      setPatients(nextPatients);
      setCurrentPatientId(matched.id);
      localStorage.setItem(PATIENT_SESSION_KEY, matched.id);

      persistState({
        patients: nextPatients,
        doctors,
        bookings,
        transactions,
        pushLogs,
      });

      return matched;
    },
    [patients, doctors, bookings, transactions, pushLogs, persistState, fetchSupabaseData]
  );

  const logoutPatient = useCallback(() => {
    setCurrentPatientId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(PATIENT_SESSION_KEY);
    }
  }, []);

  const createBooking = useCallback(
    async ({
      doctorId,
      paymentMethod,
      receiptFile,
    }: {
      doctorId: string;
      paymentMethod: "kpay" | "wavepay" | "credit_points";
      receiptFile?: File | null;
    }): Promise<Booking> => {
      if (!currentPatient) {
        throw new Error("Please sign in with your phone number first.");
      }

      const doctor = doctors.find((d) => d.id === doctorId);
      if (!doctor) {
        throw new Error("Selected doctor was not found.");
      }

      const fee = doctor.consultation_fee || CLINIC_CONFIG.defaultConsultationFee;

      if (
        paymentMethod === "credit_points" &&
        currentPatient.credit_points < fee
      ) {
        throw new Error("Insufficient Credit Points for 1-click checkout.");
      }

      let receiptImageUrl: string | null = null;
      if (paymentMethod !== "credit_points") {
        if (receiptFile) {
          receiptImageUrl = await uploadReceiptImage(
            receiptFile,
            currentPatient.id
          );
        } else {
          receiptImageUrl = SAMPLE_RECEIPT_SVG;
        }
      }

      // Compute next queue number for this doctor today
      const doctorBookingsToday = bookings.filter(
        (b) => b.doctor_id === doctorId && b.booking_date === TODAY_STR
      );
      const highestBookedQueue = doctorBookingsToday.reduce(
        (max, b) => Math.max(max, b.queue_number),
        doctor.current_queue_number
      );
      const nextQueueNumber = highestBookedQueue + 1;

      const isInstantPaid = paymentMethod === "credit_points";

      if (supabase && isSupabaseConfigured) {
        const { data: insertedBooking, error: bErr } = await supabase
          .from("bookings")
          .insert({
            patient_id: currentPatient.id,
            doctor_id: doctorId,
            booking_date: TODAY_STR,
            queue_number: nextQueueNumber,
            status: "waiting",
            payment_status: isInstantPaid ? "paid" : "pending",
          })
          .select("*")
          .single();

        if (!bErr && insertedBooking) {
          if (isInstantPaid) {
            await supabase
              .from("patients")
              .update({
                credit_points: Math.max(0, currentPatient.credit_points - fee),
              })
              .eq("id", currentPatient.id);
          }

          await supabase.from("transactions").insert({
            patient_id: currentPatient.id,
            booking_id: insertedBooking.id,
            amount: fee,
            payment_method: paymentMethod,
            receipt_image_url: receiptImageUrl,
            type: "payment",
          });

          await fetchSupabaseData();
          return insertedBooking as Booking;
        }
      }

      const newBooking: Booking = {
        id: crypto.randomUUID(),
        patient_id: currentPatient.id,
        doctor_id: doctorId,
        booking_date: TODAY_STR,
        queue_number: nextQueueNumber,
        status: "waiting",
        payment_status: isInstantPaid ? "paid" : "pending",
        created_at: new Date().toISOString(),
      };

      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        patient_id: currentPatient.id,
        booking_id: newBooking.id,
        amount: fee,
        payment_method: paymentMethod,
        receipt_image_url: receiptImageUrl,
        type: "payment",
        created_at: new Date().toISOString(),
      };

      const nextPatients = isInstantPaid
        ? patients.map((p) =>
            p.id === currentPatient.id
              ? { ...p, credit_points: Math.max(0, p.credit_points - fee) }
              : p
          )
        : patients;

      const nextBookings = [...bookings, newBooking];
      const nextTransactions = [newTransaction, ...transactions];

      setPatients(nextPatients);
      setBookings(nextBookings);
      setTransactions(nextTransactions);

      persistState({
        patients: nextPatients,
        doctors,
        bookings: nextBookings,
        transactions: nextTransactions,
        pushLogs,
      });

      return newBooking;
    },
    [
      currentPatient,
      doctors,
      bookings,
      patients,
      transactions,
      pushLogs,
      persistState,
      fetchSupabaseData,
    ]
  );

  const advanceDoctorQueue = useCallback(
    async (
      doctorId: string
    ): Promise<{ newQueueNumber: number; notifiedPatients: string[] }> => {
      const doctor = doctors.find((d) => d.id === doctorId);
      if (!doctor) {
        throw new Error("Doctor not found");
      }

      const newQueueNumber = doctor.current_queue_number + 1;

      if (supabase && isSupabaseConfigured) {
        await supabase.rpc("advance_doctor_queue", { p_doctor_id: doctorId });
        await fetchSupabaseData();
      }

      const nextDoctors = doctors.map((d) =>
        d.id === doctorId ? { ...d, current_queue_number: newQueueNumber } : d
      );

      const nextBookings = bookings.map((b) => {
        if (b.doctor_id !== doctorId || b.booking_date !== TODAY_STR) return b;
        if (b.status === "cancelled") return b;
        if (b.queue_number < newQueueNumber) {
          return { ...b, status: "completed" as const };
        }
        if (b.queue_number === newQueueNumber) {
          return { ...b, status: "in_progress" as const };
        }
        return b;
      });

      // Find the next 3 upcoming waiting/in_progress patients (queueNumber through queueNumber + 2)
      const upcomingBookings = nextBookings
        .filter(
          (b) =>
            b.doctor_id === doctorId &&
            b.booking_date === TODAY_STR &&
            b.status !== "cancelled" &&
            b.queue_number >= newQueueNumber &&
            b.queue_number <= newQueueNumber + 2
        )
        .sort((a, b) => a.queue_number - b.queue_number)
        .slice(0, 3);

      const recipients = upcomingBookings.map((b) => {
        const pat = patients.find((p) => p.id === b.patient_id);
        return {
          patientId: b.patient_id,
          patientName: pat?.name || `Queue #${b.queue_number}`,
          phone: pat?.phone || "",
          queueNumber: b.queue_number,
          fcmToken: pat?.fcm_token || null,
        };
      });

      // Trigger Firebase FCM push notification API route for the next 3 patients
      try {
        await fetch("/api/notify-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId: doctor.id,
            doctorName: doctor.name,
            roomNumber: doctor.room_number,
            currentQueueNumber: newQueueNumber,
            recipients,
          }),
        });
      } catch {
        // Non-blocking fallback
      }

      // If current logged-in patient is in the notified group, trigger browser notification
      if (currentPatient) {
        const myUpcoming = recipients.find(
          (r) => r.patientId === currentPatient.id
        );
        if (myUpcoming) {
          if (myUpcoming.queueNumber === newQueueNumber) {
            triggerLocalBrowserNotification(
              `It's Your Turn! Queue #${myUpcoming.queueNumber}`,
              `Please enter ${doctor.room_number} for ${doctor.name}.`
            );
          } else {
            triggerLocalBrowserNotification(
              `Queue #${newQueueNumber} Called`,
              `Your Queue #${myUpcoming.queueNumber} is coming up soon at ${doctor.room_number}.`
            );
          }
        }
      }

      const newLog: PushNotificationLog = {
        id: crypto.randomUUID(),
        doctorId: doctor.id,
        doctorName: doctor.name,
        calledQueueNumber: newQueueNumber,
        notifiedQueueNumbers: recipients.map((r) => r.queueNumber),
        patientNames: recipients.map((r) => r.patientName),
        timestamp: new Date().toISOString(),
      };

      const nextLogs = [newLog, ...pushLogs].slice(0, 15);

      setDoctors(nextDoctors);
      setBookings(nextBookings);
      setPushLogs(nextLogs);

      persistState({
        patients,
        doctors: nextDoctors,
        bookings: nextBookings,
        transactions,
        pushLogs: nextLogs,
      });

      return {
        newQueueNumber,
        notifiedPatients: recipients.map(
          (r) => `#${r.queueNumber} ${r.patientName}`
        ),
      };
    },
    [
      doctors,
      bookings,
      patients,
      transactions,
      pushLogs,
      currentPatient,
      persistState,
      fetchSupabaseData,
    ]
  );

  const verifyReceiptAndConfirmBooking = useCallback(
    async (bookingId: string) => {
      if (supabase && isSupabaseConfigured) {
        await supabase
          .from("bookings")
          .update({ payment_status: "paid" })
          .eq("id", bookingId);
        await fetchSupabaseData();
      }

      const nextBookings = bookings.map((b) =>
        b.id === bookingId ? { ...b, payment_status: "paid" as const } : b
      );
      setBookings(nextBookings);

      persistState({
        patients,
        doctors,
        bookings: nextBookings,
        transactions,
        pushLogs,
      });
    },
    [bookings, patients, doctors, transactions, pushLogs, persistState, fetchSupabaseData]
  );

  const cancelBookingAndRefund = useCallback(
    async (
      bookingId: string
    ): Promise<{ refundedAmount: number; patientName: string }> => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }

      const doctor = doctors.find((d) => d.id === booking.doctor_id);
      const refundAmount =
        doctor?.consultation_fee || CLINIC_CONFIG.defaultConsultationFee;
      const patient = patients.find((p) => p.id === booking.patient_id);

      if (supabase && isSupabaseConfigured) {
        await supabase.rpc("cancel_booking_and_refund", {
          p_booking_id: bookingId,
          p_refund_amount: refundAmount,
        });
        await fetchSupabaseData();
      }

      const nextBookings = bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: "cancelled" as const,
              payment_status: "refunded" as const,
            }
          : b
      );

      const nextPatients = patients.map((p) =>
        p.id === booking.patient_id
          ? { ...p, credit_points: p.credit_points + refundAmount }
          : p
      );

      const refundTransaction: Transaction = {
        id: crypto.randomUUID(),
        patient_id: booking.patient_id,
        booking_id: booking.id,
        amount: refundAmount,
        payment_method: "refund" as PaymentMethod,
        receipt_image_url: null,
        type: "refund",
        created_at: new Date().toISOString(),
      };

      const nextTransactions = [refundTransaction, ...transactions];

      setBookings(nextBookings);
      setPatients(nextPatients);
      setTransactions(nextTransactions);

      persistState({
        patients: nextPatients,
        doctors,
        bookings: nextBookings,
        transactions: nextTransactions,
        pushLogs,
      });

      return {
        refundedAmount: refundAmount,
        patientName: patient?.name || "Patient",
      };
    },
    [
      bookings,
      doctors,
      patients,
      transactions,
      pushLogs,
      persistState,
      fetchSupabaseData,
    ]
  );

  const addDemoCreditPoints = useCallback(
    async (amount: number) => {
      if (!currentPatient) return;

      if (supabase && isSupabaseConfigured) {
        await supabase
          .from("patients")
          .update({ credit_points: currentPatient.credit_points + amount })
          .eq("id", currentPatient.id);
        await fetchSupabaseData();
      }

      const nextPatients = patients.map((p) =>
        p.id === currentPatient.id
          ? { ...p, credit_points: p.credit_points + amount }
          : p
      );

      setPatients(nextPatients);
      persistState({
        patients: nextPatients,
        doctors,
        bookings,
        transactions,
        pushLogs,
      });
    },
    [
      currentPatient,
      patients,
      doctors,
      bookings,
      transactions,
      pushLogs,
      persistState,
      fetchSupabaseData,
    ]
  );

  return (
    <ClinicContext.Provider
      value={{
        patients,
        doctors,
        bookings,
        transactions,
        pushLogs,
        currentPatient,
        isLoading,
        isRealtimeConnected,
        loginWithPhoneOtp,
        logoutPatient,
        createBooking,
        advanceDoctorQueue,
        verifyReceiptAndConfirmBooking,
        cancelBookingAndRefund,
        addDemoCreditPoints,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const ctx = useContext(ClinicContext);
  if (!ctx) {
    throw new Error("useClinic must be used within a ClinicProvider");
  }
  return ctx;
}
