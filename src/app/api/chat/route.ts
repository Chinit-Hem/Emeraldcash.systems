import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth-helpers";
import { dbManager } from "@/lib/db-singleton";

type ChatRow = Record<string, unknown>;

let tablesReady: Promise<void> | null = null;

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized - Please log in" }, { status: 401 });
}

async function ensureChatTable() {
  if (!tablesReady) {
    tablesReady = Promise.all([
      dbManager.executeUnsafe(`CREATE TABLE IF NOT EXISTS internal_chat_messages (
        id BIGSERIAL PRIMARY KEY,
        sender_username VARCHAR(128) NOT NULL,
        recipient_username VARCHAR(128) NOT NULL,
        body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )`, [], 10_000),
      dbManager.executeUnsafe(`CREATE INDEX IF NOT EXISTS idx_internal_chat_recipient ON internal_chat_messages(recipient_username, read_at, created_at DESC)`, [], 10_000),
      dbManager.executeUnsafe(`CREATE INDEX IF NOT EXISTS idx_internal_chat_thread ON internal_chat_messages(sender_username, recipient_username, created_at DESC)`, [], 10_000),
    ]).then(() => undefined).catch((error) => {
      tablesReady = null;
      throw error;
    });
  }
  await tablesReady;
}

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) return unauthorized();
    await ensureChatTable();
    const otherUser = new URL(req.url).searchParams.get("with")?.trim() || "";
    const [participants, unreadRows, messages] = await Promise.all([
      dbManager.executeUnsafe<ChatRow>(`SELECT username, COALESCE(full_name, username) AS full_name FROM users WHERE username <> $1 ORDER BY COALESCE(full_name, username), username LIMIT 100`, [session.username], 10_000),
      dbManager.executeUnsafe<ChatRow>(`SELECT COUNT(*) AS count FROM internal_chat_messages WHERE LOWER(recipient_username) = LOWER($1) AND read_at IS NULL`, [session.username], 10_000),
      otherUser ? dbManager.executeUnsafe<ChatRow>(`SELECT id, sender_username, recipient_username, body, read_at, created_at FROM internal_chat_messages WHERE (LOWER(sender_username) = LOWER($1) AND LOWER(recipient_username) = LOWER($2)) OR (LOWER(sender_username) = LOWER($2) AND LOWER(recipient_username) = LOWER($1)) ORDER BY created_at DESC LIMIT 100`, [session.username, otherUser], 10_000) : Promise.resolve([]),
    ]);
    if (otherUser) {
      await dbManager.executeUnsafe(`UPDATE internal_chat_messages SET read_at = COALESCE(read_at, NOW()) WHERE LOWER(sender_username) = LOWER($1) AND LOWER(recipient_username) = LOWER($2)`, [otherUser, session.username], 10_000);
    }
    return NextResponse.json({ success: true, data: {
      participants: participants.map((row) => ({ username: text(row.username), fullName: text(row.full_name) })),
      unreadCount: Number(unreadRows[0]?.count ?? 0),
      messages: messages.reverse().map((row) => ({ id: text(row.id), senderUsername: text(row.sender_username), recipientUsername: text(row.recipient_username), body: text(row.body), readAt: row.read_at ? text(row.read_at) : null, createdAt: text(row.created_at) })),
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not load chat" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) return unauthorized();
    await ensureChatTable();
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const recipient = text(body.recipient).trim();
    const message = text(body.message).trim();
    if (!recipient || recipient.toLowerCase() === session.username.toLowerCase()) return NextResponse.json({ success: false, error: "Choose another user" }, { status: 400 });
    if (!message || message.length > 2000) return NextResponse.json({ success: false, error: "Message must be between 1 and 2,000 characters" }, { status: 400 });
    const recipientRows = await dbManager.executeUnsafe<ChatRow>(`SELECT username FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`, [recipient], 10_000);
    if (!recipientRows[0]) return NextResponse.json({ success: false, error: "Recipient not found" }, { status: 404 });
    const rows = await dbManager.executeUnsafe<ChatRow>(`INSERT INTO internal_chat_messages (sender_username, recipient_username, body) VALUES ($1, $2, $3) RETURNING id, sender_username, recipient_username, body, read_at, created_at`, [session.username, text(recipientRows[0].username), message], 10_000);
    const row = rows[0];
    return NextResponse.json({ success: true, data: { id: text(row.id), senderUsername: text(row.sender_username), recipientUsername: text(row.recipient_username), body: text(row.body), readAt: row.read_at ? text(row.read_at) : null, createdAt: text(row.created_at) } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not send message" }, { status: 500 });
  }
}
