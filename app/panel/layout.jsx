import Link from "next/link";
import LogoutButton from "./logoutButton";
const { getSession } = require("@/lib/session");

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }) {
  const ses = await getSession();
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "18px 16px 60px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 22,
        }}
      >
        <Link href="/panel" style={{ fontWeight: 800, textDecoration: "none", fontSize: "1.05rem" }}>
          ● Lealtad
        </Link>
        {ses ? <LogoutButton nombre={ses.nombre} /> : null}
      </header>
      {children}
    </div>
  );
}
