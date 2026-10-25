# White-Label Poly Clinic Queue & Booking PWA

An elderly-friendly, WCAG AAA high-contrast Progressive Web App (PWA) for Poly Clinics built with **Next.js (App Router)**, **Tailwind CSS**, **shadcn/ui**, **Lucide Icons**, **Supabase (Auth, PostgreSQL, Realtime, Storage)**, **Firebase Cloud Messaging (FCM)**, and **next-pwa**.

## Key Features

1. **White-Label Configuration (`clinic.config.ts`)**
   - Centralizes `CLINIC_NAME`, `PRIMARY_COLOR`, `LOGO_URL`, `CURRENCY`, and KPay/WavePay merchant details.
   - Dynamically wired into `tailwind.config.js`.

2. **Elderly-Friendly Patient Portal (`/`)**
   - **Large Touch Keypad Login**: High-contrast numeric keypad + SMS OTP verification flow.
   - **Today's Specialist Doctors**: Clear room numbers, live queue numbers, and 1-tap appointment booking.
   - **1-Click Credit Points & KPay/WavePay Checkout**: Instant booking using `credit_points` or receipt image upload.
   - **Live Queue Tracker**: Massive color-coded queue display (Green when it's your turn, Amber when within 2 turns, Blue when waiting) powered by Supabase Realtime.

3. **Reception Command Center (`/reception`)**
   - **Live Doctor Grid**: View all doctors, their `current_queue_number`, and waiting patients.
   - **Queue Control (`[Next Patient]`)**: Increments the queue number and dispatches Firebase FCM push notifications to the next 3 waiting patients (`/api/notify-queue`).
   - **Receipt Verification**: Inspect uploaded KPay/WavePay screenshots and confirm bookings.
   - **Atomic Cancellation & Credit Points Refund**: Cancels a booking and automatically refunds the fee as `credit_points` to the patient's account via `cancel_booking_and_refund` PostgreSQL RPC.

4. **Ultra-Minimalist Doctor Portal (`/doctor`)**
   - Displays only the room's current queue number and a massive full-width `[Call Next Patient]` button synced in real time with Reception and Patient portals.

## Quick Start

```bash
cp .env.local.example .env.local
npm install
npm run dev
```
