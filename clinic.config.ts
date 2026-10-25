export const CLINIC_NAME = "AuraCare Poly Clinic";
export const PRIMARY_COLOR = "#0B5ED7"; // High-contrast WCAG AAA Medical Royal Blue
export const LOGO_URL = "/logo.svg";
export const CURRENCY = "MMK";

export const CLINIC_CONFIG = {
  name: CLINIC_NAME,
  primaryColor: PRIMARY_COLOR,
  logoUrl: LOGO_URL,
  currency: CURRENCY,
  tagline: "Compassionate, Fast & Accessible Specialist Care",
  supportPhone: "09-777-888-999",
  address: "No. 124, Pyay Road, Kamayut Township, Yangon",
  defaultConsultationFee: 15000,
  paymentAccounts: {
    kpay: {
      provider: "KBZPay (KPay)",
      accountName: "AuraCare Poly Clinic Co., Ltd.",
      accountNumber: "09-777-888-999",
      qrCodeHint: "Scan or transfer to KPay 09-777-888-999",
    },
    wavepay: {
      provider: "WavePay",
      accountName: "AuraCare Poly Clinic Co., Ltd.",
      accountNumber: "09-777-888-999",
      qrCodeHint: "Scan or transfer to WavePay 09-777-888-999",
    },
  },
} as const;

export default CLINIC_CONFIG;
