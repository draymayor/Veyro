import { NextResponse } from "next/server";

interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Partial<ContactPayload>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, subject, message } = body;

  if (
    !name?.trim() ||
    !email?.trim() ||
    !subject?.trim() ||
    !message?.trim() ||
    !EMAIL_PATTERN.test(email.trim())
  ) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  // Placeholder: no backend/notification pipeline wired up yet, this just
  // acknowledges receipt so the frontend can be built and tested end to end.
  return NextResponse.json({ success: true });
}
