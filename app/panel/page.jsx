// Home del panel: negocios del dueño con sus programas.
import { redirect } from "next/navigation";
import NegociosView from "./negociosView";
const { getSession } = require("@/lib/session");

export const dynamic = "force-dynamic";

export default async function PanelHome() {
  const ses = await getSession();
  if (!ses) redirect("/panel/login");
  return <NegociosView />;
}
