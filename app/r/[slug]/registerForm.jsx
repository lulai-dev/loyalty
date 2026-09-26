"use client";
import { useState } from "react";

export default function RegisterForm({ slug, negocio, meta, premio, design }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    setMsg("Creando tu tarjeta…");
    const esApple =
      /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          nombre,
          telefono,
          plataforma: esApple ? "apple" : "google",
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      setMsg(esApple ? "Abriendo tu pase… tócalo y elige “Agregar”." : "Abriendo Google Wallet…");
      window.location.href = data.url;
    } catch (err) {
      setMsg("No se pudo crear la tarjeta: " + err.message);
      setError(true);
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: design.bg,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 400 }}>
        {design.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={design.logo}
            alt=""
            style={{ height: 48, borderRadius: 10, marginBottom: 10 }}
          />
        ) : null}
        <h1 style={{ fontSize: "1.35rem", marginBottom: 4 }}>{negocio}</h1>
        <p style={{ color: "#8a8578", fontSize: ".95rem", marginBottom: 16 }}>
          Junta {meta} sellos y llévate {premio}. Tu tarjeta se guarda en el wallet de tu
          teléfono — sin apps.
        </p>
        <form onSubmit={submit}>
          <label className="field" htmlFor="nombre">Tu nombre</label>
          <input
            id="nombre"
            required
            maxLength={60}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Eduardo"
          />
          <label className="field" htmlFor="tel">Teléfono (opcional)</label>
          <input
            id="tel"
            type="tel"
            maxLength={20}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="55 1234 5678"
          />
          <button
            disabled={busy}
            style={{ width: "100%", marginTop: 20, background: design.bg }}
          >
            Obtener mi tarjeta
          </button>
        </form>
        <p
          className={error ? "msg-err" : "msg-ok"}
          style={{ marginTop: 12, fontSize: ".9rem", textAlign: "center", minHeight: "1.2em" }}
        >
          {msg}
        </p>
      </div>
    </main>
  );
}
