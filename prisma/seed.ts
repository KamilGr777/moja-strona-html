// Dane startowe: konto demo i przykładowy profil klienta (z dokumentacji projektu).
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const db = new PrismaClient();

function hash(pw: string) {
  const salt = randomBytes(16);
  const key = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt.toString("base64")}$${key.toString("base64")}`;
}

async function main() {
  const email = process.env.SEED_EMAIL ?? "demo@detailreel.local";
  const password = process.env.SEED_PASSWORD ?? "demo-detail-reel";
  const user = await db.user.upsert({ where: { email }, update: {}, create: { email, name: "Demo", passwordHash: hash(password) } });
  const exists = await db.client.findFirst({ where: { userId: user.id, name: "Diamond Detailing Studio" } });
  if (!exists) {
    await db.client.create({
      data: {
        userId: user.id,
        name: "Diamond Detailing Studio",
        brandColors: ["#0B0B0B", "#D4AF37"],
        communicationStyle: "Luxury Premium",
        targetAudience: "Właściciele aut premium",
        services: ["Korekta lakieru", "Folia PPF", "Powłoka ceramiczna"],
        advantages: [],
        preferredReelStyle: "Premium / Cinematic",
        defaultCta: "Umów konsultację",
        notes: "Przykładowy profil — uzupełnij prawdziwymi danymi studia (bez cen i obietnic).",
      },
    });
  }
  console.log(`Konto demo: ${email} / ${password}`);
}

main().finally(() => db.$disconnect());
