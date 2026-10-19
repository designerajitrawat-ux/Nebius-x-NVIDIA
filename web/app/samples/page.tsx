import type { Metadata } from "next";
import { SamplesScreen } from "@/components/samples/SamplesScreen";

export const metadata: Metadata = { title: "Sample reports" };

export default function SamplesPage() {
  return <SamplesScreen />;
}
