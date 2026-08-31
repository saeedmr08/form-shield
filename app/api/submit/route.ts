import { NextResponse } from "next/server";
import {
  checkRateLimit,
  createSubmission,
  encryptSensitiveFields,
  isHoneypotTriggered,
  validateFields,
} from "@/lib/formshield";
import { getBuckets, listLiveSubmissions, upsertSubmission } from "@/lib/store";

const RULES = [
  { name: "name", required: true, minLength: 2, maxLength: 80 },
  { name: "email", required: true, email: true, maxLength: 120 },
  { name: "message", required: true, minLength: 10, maxLength: 1000 },
];

const ENC_KEY = process.env.FORMSHIELD_KEY ?? "demo-formshield-key";
const RETENTION_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  listLiveSubmissions();

  const body = (await req.json()) as {
    name?: string;
    email?: string;
    message?: string;
    companyHoneypot?: string;
    ip?: string;
  };

  const ip =
    body.ip?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local";

  const limit = checkRateLimit(getBuckets(), ip, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited", remaining: 0 }, { status: 429 });
  }

  const fields: Record<string, string> = {
    name: body.name ?? "",
    email: body.email ?? "",
    message: body.message ?? "",
    companyHoneypot: body.companyHoneypot ?? "",
  };

  if (isHoneypotTriggered(fields, "companyHoneypot")) {
    return NextResponse.json({ ok: true, id: "dropped" });
  }

  const issues = validateFields(fields, RULES);
  if (issues.length) {
    return NextResponse.json({ error: "validation", issues }, { status: 400 });
  }

  const encrypted = encryptSensitiveFields(
    {
      name: fields.name,
      email: fields.email,
      message: fields.message,
    },
    ["email", "message"],
    ENC_KEY,
  );

  const row = createSubmission(encrypted, RETENTION_MS);
  upsertSubmission(row);

  return NextResponse.json({
    ok: true,
    id: row.id,
    remaining: limit.remaining,
    retainUntil: row.retainUntil,
  });
}
