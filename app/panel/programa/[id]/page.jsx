import { redirect } from "next/navigation";
import ProgramaView from "./programaView";
const { getSession } = require("@/lib/session");

export const dynamic = "force-dynamic";

export default async function ProgramaPage({ params }) {
  const ses = await getSession();
  if (!ses) redirect("/panel/login");
  return <ProgramaView programaId={parseInt(params.id, 10)} />;
}
