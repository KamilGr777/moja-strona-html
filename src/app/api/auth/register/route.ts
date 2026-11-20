import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { HttpError, json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  name: z.string().trim().min(2, "Podaj imię lub nazwę (min. 2 znaki).").max(80),
  email: z.string().trim().toLowerCase().email("Nieprawidłowy adres e-mail."),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków.").max(200),
});

export const POST = route(async (req) => {
  await rateLimit(`register:${req.headers.get("x-forwarded-for") ?? "local"}`, 10, 3600, "rejestracji");
  const body = Body.parse(await readJson(req));
  if (await db.user.findUnique({ where: { email: body.email } })) throw new HttpError(409, "Konto z tym adresem e-mail już istnieje.");
  const user = await db.user.create({ data: { name: body.name, email: body.email, passwordHash: await hashPassword(body.password) } });
  await createSession(user.id);
  return json({ ok: true });
});
