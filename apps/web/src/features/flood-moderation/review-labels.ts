import type { FloodReviewReason, FloodReviewStatus, VerificationStatus } from "@floodaid/contracts";

export const verificationLabels: Record<VerificationStatus, string> = {
  UNVERIFIED: "ยังไม่ตรวจสอบ",
  VERIFIED: "ยืนยันแล้ว",
  REJECTED: "ปฏิเสธแล้ว",
};

export const reviewReasons: Record<FloodReviewStatus, Partial<Record<FloodReviewReason, string>>> = {
  VERIFIED: { FIELD_CONFIRMED: "ตรวจสอบจากพื้นที่แล้ว", TRUSTED_SOURCE: "ยืนยันจากแหล่งข้อมูลที่เชื่อถือได้" },
  REJECTED: {
    INSUFFICIENT_EVIDENCE: "หลักฐานไม่เพียงพอ",
    LOCATION_MISMATCH: "ตำแหน่งไม่ตรงกับข้อมูล",
    DUPLICATE_REPORT: "รายงานซ้ำ",
  },
};
