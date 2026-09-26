"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton({ nombre }) {
  const router = useRouter();
  async function salir() {
    await fetch("/api/panel/logout", { method: "POST" });
    router.push("/panel/login");
    router.refresh();
  }
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ fontSize: ".9rem", color: "#8a8578" }}>{nombre}</span>
      <button className="sec" style={{ padding: "7px 14px", fontSize: ".85rem" }} onClick={salir}>
        Salir
      </button>
    </div>
  );
}
