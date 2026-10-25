export type BookingStatus = "waiting" | "in_progress" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "refunded";
export type PaymentMethod = "kpay" | "wavepay" | "credit_points" | "refund";
export type TransactionType = "payment" | "refund" | "credit_topup";

export interface Patient {
  id: string;
  phone: string;
  name: string;
  credit_points: number;
  fcm_token: string | null;
  created_at?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  room_number: string;
  current_queue_number: number;
  consultation_fee: number;
  is_active: boolean;
}

export interface Booking {
  id: string;
  patient_id: string;
  doctor_id: string;
  booking_date: string;
  queue_number: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  created_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface Transaction {
  id: string;
  patient_id: string;
  booking_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  receipt_image_url: string | null;
  type: TransactionType;
  created_at: string;
  patient?: Patient;
  booking?: Booking;
}

export interface PushNotificationLog {
  id: string;
  doctorId: string;
  doctorName: string;
  calledQueueNumber: number;
  notifiedQueueNumbers: number[];
  patientNames: string[];
  timestamp: string;
}
