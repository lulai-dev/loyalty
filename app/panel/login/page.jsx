"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/panel/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (r.ok) {
      router.push("/panel");
      router.refresh();
    } else {
      const data = await r.json().catch(() => ({}));
      setErr(data.error || "Error al entrar");
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <form className="card" style={{ width: "100%", maxWidth: 380 }} onSubmit={submit}>
        <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Panel de negocios</h1>
        <p style={{ color: "#8a8578", fontSize: ".9rem", marginBottom: 8 }}>
          Entra con la cuenta que te dio el administrador.
        </p>
        <label className="field">Correo</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="field">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button disabled={busy} style={{ width: "100%", marginTop: 18 }}>
          Entrar
        </button>
        {err && <p className="msg-err" style={{ marginTop: 10, fontSize: ".9rem" }}>{err}</p>}
      </form>
    </main>
  );
}
