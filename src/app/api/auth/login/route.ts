import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { HttpError, json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ email: z.string().trim().toLowerCase().email("Nieprawidłowy adres e-mail."), password: z.string().min(1) });

export const POST = route(async (req) => {
  const body = Body.parse(await readJson(req));
  await rateLimit(`login:${body.email}`, 20, 900, "prób logowania");
  const user = await db.user.findUnique({ where: { email: body.email } });
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) throw new HttpError(401, "Nieprawidłowy e-mail lub hasło.");
  await createSession(user.id);
  return json({ ok: true });
});
