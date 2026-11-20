import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env, aiEnabled } from "@/lib/env";
import { requireApiUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { ownedClient } from "@/lib/services/guard";
import { ideasWithAi } from "@/lib/ai/features";
import { describeAiError } from "@/lib/ai/client";
import { ideasFromTemplates, type Idea } from "@/lib/analysis/templates";
import { GOALS, MONTAGE_STYLES, SERVICES, type ServiceKey } from "@/lib/constants";
import type { ClientProfile } from "@/lib/ai/prompts";
import { clamp } from "@/lib/utils";

const Body = z.object({
  service: z.enum(Object.keys(SERVICES) as [string, ...string[]]),
  goal: z.enum(Object.keys(GOALS) as [string, ...string[]]),
  car: z.string().trim().max(80).nullish(),
  style: z.enum(Object.keys(MONTAGE_STYLES) as [string, ...string[]]),
  durationSec: z.number().min(6).max(90),
  footage: z.enum(["existing", "new"]),
  clientId: z.string().nullish(),
});

export const POST = route(async (req) => {
  const user = await requireApiUser();
  const body = Body.parse(await readJson(req));
  const client = body.clientId ? await ownedClient(user.id, body.clientId) : null;
  let ideas: Idea[];
  let source: "ai" | "template" = "template";
  let warning: string | null = null;
  if (aiEnabled()) {
    await rateLimit(`ai:${user.id}`, env().RATE_LIMIT_AI_PER_HOUR, 3600, "zapytań AI");
    try {
      const r = await ideasWithAi({ ...body, client: client as ClientProfile | null });
      ideas = r.data.ideas.map((i) => ({ ...i, durationSec: clamp(i.durationSec, 5, 120) }));
      source = "ai";
      await db.usageEvent.create({ data: { userId: user.id, kind: "ai_ideas", units: r.usage.input + r.usage.output } });
    } catch (e) {
      warning = `AI niedostępne (${describeAiError(e)}) — pokazano pomysły z biblioteki szablonów.`;
      ideas = ideasFromTemplates({ ...body, service: body.service as ServiceKey, style: body.style as keyof typeof MONTAGE_STYLES, cta: client?.defaultCta });
    }
  } else {
    ideas = ideasFromTemplates({ ...body, service: body.service as ServiceKey, style: body.style as keyof typeof MONTAGE_STYLES, cta: client?.defaultCta });
  }
  const created = await db.$transaction(
    ideas.map((i) =>
      db.contentIdea.create({
        data: {
          userId: user.id,
          clientId: client?.id ?? null,
          title: i.title,
          hook: i.hook,
          service: body.service,
          goal: body.goal,
          style: body.style,
          durationSec: i.durationSec,
          data: i as unknown as Prisma.InputJsonValue,
          source,
        },
      }),
    ),
  );
  return json({ ideas: created, source, warning }, { status: 201 });
});
