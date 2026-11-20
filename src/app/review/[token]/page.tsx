import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exportByToken } from "@/lib/services/review";
import { ReviewApp } from "@/components/review/review-app";

export const metadata = { title: "Akceptacja rolki", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ex = await exportByToken(token);
  if (!ex) notFound();
  const comments = await db.clientComment.findMany({ where: { exportId: ex.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="min-h-dvh bg-bg">
      <ReviewApp token={token} title={ex.editingProject.project.name} studio={ex.editingProject.project.client?.name ?? null} status={ex.reviewStatus} comments={comments.map((c) => ({ id: c.id, authorName: c.authorName, body: c.body, timeSec: c.timeSec, kind: c.kind, createdAt: c.createdAt.toISOString() }))} />
    </div>
  );
}
