import type { Metadata } from "next";
import { RunScreen } from "@/components/run/RunScreen";

export const metadata: Metadata = { title: "Live test" };

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RunScreen key={id} id={decodeURIComponent(id)} />;
}
