"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function NegociosView() {
  const [negocios, setNegocios] = useState(null);
  const [maxNegocios, setMaxNegocios] = useState(1);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({ nombre: "", slug: "", giro: "", pin: "" });
  const [err, setErr] = useState("");

  async function cargar() {
    const r = await fetch("/api/panel/negocios");
    if (r.ok) {
      const data = await r.json();
      setNegocios(data.negocios);
      setMaxNegocios(data.max_negocios ?? 1);
      if (data.negocios.length >= (data.max_negocios ?? 1)) setCreando(false);
    }
  }
  useEffect(() => {
    cargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/panel/negocios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await r.json();
    if (!r.ok) return setErr(data.error || "Error");
    setCreando(false);
    setForm({ nombre: "", slug: "", giro: "", pin: "" });
    cargar();
  }

  if (!negocios) return <p>Cargando…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: "1.35rem" }}>
          {maxNegocios === 1 ? "Mi negocio" : "Mis negocios"}
        </h1>
        {negocios.length < maxNegocios && (
          <button onClick={() => setCreando(!creando)}>
            {creando ? "Cancelar" : "+ Nuevo negocio"}
          </button>
        )}
      </div>

      {creando && (
        <form className="card" style={{ marginBottom: 18 }} onSubmit={crear}>
          <div style={{ display: "grid", gap: 4, gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label className="field">Nombre</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Café Irving"
              />
            </div>
            <div>
              <label className="field">Slug (subdominio)</label>
              <input
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="cafe-irving"
              />
            </div>
            <div>
              <label className="field">Giro</label>
              <input
                value={form.giro}
                onChange={(e) => setForm({ ...form, giro: e.target.value })}
                placeholder="cafetería"
              />
            </div>
            <div>
              <label className="field">PIN del cajero</label>
              <input
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
                placeholder="4 dígitos"
              />
            </div>
          </div>
          <button style={{ marginTop: 14 }}>Crear negocio</button>
          {err && <p className="msg-err" style={{ marginTop: 8 }}>{err}</p>}
        </form>
      )}

      {negocios.length === 0 && !creando && (
        <div className="card">Aún no tienes negocios. Crea el primero con el botón de arriba.</div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {negocios.map((n) => (
          <div className="card" key={n.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h2 style={{ fontSize: "1.1rem" }}>{n.nombre}</h2>
                <p style={{ fontSize: ".85rem", color: "#8a8578" }}>
                  {n.giro || "—"} · slug: <code>{n.slug}</code> · PIN cajero: <code>{n.pin}</code>
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {n.programas.length > 0 && (
                  <Link href={`/panel/programa/${n.programas[0].id}`}>
                    <button style={{ fontSize: ".85rem", padding: "7px 12px" }}>Ver clientes</button>
                  </Link>
                )}
                <a href={`/r/${n.slug}`} target="_blank" rel="noreferrer">
                  <button className="sec" style={{ fontSize: ".85rem", padding: "7px 12px" }}>Ver registro</button>
                </a>
                <a href={`/r/${n.slug}/cajero`} target="_blank" rel="noreferrer">
                  <button className="sec" style={{ fontSize: ".85rem", padding: "7px 12px" }}>Cajero</button>
                </a>
              </div>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {n.programas.map((p) => (
                <Link key={p.id} href={`/panel/programa/${p.id}`} style={{ textDecoration: "none" }}>
                  <button
                    className="sec"
                    style={{
                      padding: "7px 14px",
                      fontSize: ".85rem",
                      opacity: p.activo ? 1 : 0.55,
                    }}
                  >
                    {p.nombre} · {p.meta} sellos → {p.premio} {p.activo ? "" : "· INACTIVA"}
                  </button>
                </Link>
              ))}
              <button
                className="sec"
                style={{ padding: "7px 14px", fontSize: ".85rem" }}
                onClick={async () => {
                  const nombre = prompt("Nombre de la nueva tarjeta (ej. Tarjeta latte):");
                  if (!nombre) return;
                  const r = await fetch("/api/panel/programas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ negocio_id: n.id, nombre }),
                  });
                  if (r.ok) cargar();
                  else alert((await r.json()).error || "Error");
                }}
              >
                + Nueva tarjeta
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
