import { NextRequest, NextResponse } from "next/server";
import { CLINIC_NAME } from "@/clinic.config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      doctorId,
      doctorName,
      roomNumber,
      currentQueueNumber,
      recipients = [],
    } = body as {
      doctorId: string;
      doctorName: string;
      roomNumber: string;
      currentQueueNumber: number;
      recipients: Array<{
        patientId: string;
        patientName: string;
        phone: string;
        queueNumber: number;
        fcmToken: string | null;
      }>;
    };

    const hasFirebaseAdminEnv = Boolean(
      process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY &&
        !process.env.FIREBASE_PROJECT_ID.includes("your-project-id")
    );

    const results: Array<{
      patientName: string;
      queueNumber: number;
      message: string;
      deliveredVia: "fcm_admin" | "realtime_pwa_push";
    }> = [];

    if (hasFirebaseAdminEnv && recipients.length > 0) {
      const admin = await import("firebase-admin");
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          }),
        });
      }

      for (const r of recipients) {
        const diff = r.queueNumber - currentQueueNumber;
        const title =
          diff === 0
            ? `It's Your Turn! Queue #${r.queueNumber}`
            : `Queue Update: #${currentQueueNumber} Called (${diff} ahead of you)`;
        const msgBody =
          diff === 0
            ? `Dear ${r.patientName}, please proceed to ${roomNumber} for ${doctorName}.`
            : `Dear ${r.patientName}, ${doctorName} is now at Queue #${currentQueueNumber}. Your number is #${r.queueNumber}. Please get ready near ${roomNumber}.`;

        if (r.fcmToken && !r.fcmToken.startsWith("fcm_device_")) {
          try {
            await admin.messaging().send({
              token: r.fcmToken,
              notification: {
                title: `${CLINIC_NAME}: ${title}`,
                body: msgBody,
              },
              data: {
                doctorId,
                queueNumber: String(r.queueNumber),
                currentQueueNumber: String(currentQueueNumber),
              },
            });
            results.push({
              patientName: r.patientName,
              queueNumber: r.queueNumber,
              message: msgBody,
              deliveredVia: "fcm_admin",
            });
            continue;
          } catch {
            // Fall through to realtime push log
          }
        }

        results.push({
          patientName: r.patientName,
          queueNumber: r.queueNumber,
          message: msgBody,
          deliveredVia: "realtime_pwa_push",
        });
      }
    } else {
      for (const r of recipients) {
        const diff = r.queueNumber - currentQueueNumber;
        const msgBody =
          diff === 0
            ? `Dear ${r.patientName}, it is your turn now (Queue #${r.queueNumber}). Please enter ${roomNumber} for ${doctorName}.`
            : `Dear ${r.patientName}, ${doctorName} is now serving #${currentQueueNumber}. Your Queue #${r.queueNumber} is ${diff} away. Please be ready near ${roomNumber}.`;

        results.push({
          patientName: r.patientName,
          queueNumber: r.queueNumber,
          message: msgBody,
          deliveredVia: "realtime_pwa_push",
        });
      }
    }

    return NextResponse.json({
      success: true,
      doctorId,
      currentQueueNumber,
      notifiedCount: results.length,
      notifications: results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to dispatch FCM notifications";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
