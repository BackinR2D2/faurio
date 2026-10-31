import { authorizedEmailDispatch } from "@/lib/email/authorization";
import { dispatchOrderEmails } from "@/lib/email/server";

export const runtime = "nodejs";
export const maxDuration = 60;

async function dispatch(request: Request) {
  if (!authorizedEmailDispatch(request.headers.get("authorization"), process.env.CRON_SECRET)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await dispatchOrderEmails();
    return Response.json(result, { status: result.configured ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "EMAIL_QUEUE_UNAVAILABLE_CHECK_MIGRATION" }, { status: 503 }); }
}

export const GET = dispatch;
export const POST = dispatch;
