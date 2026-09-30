"use client";
import { useEffect, useState } from "react";

const D = { bg: "#3c2d23", fg: "#ffffff", label: "#ebdcc8", logo: null, hero: null, como: null };

export default function ProgramaView({ programaId }) {
  const [pr, setPr] = useState(null);
  const [tab, setTab] = useState("clientes");

  async function cargar() {
    const r = await fetch(`/api/panel/programas?id=${programaId}`);
    if (r.ok) setPr((await r.json()).programa);
  }
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programaId]);

  if (!pr) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ fontSize: "1.3rem", marginBottom: 2 }}>
        {pr.nombre} <span style={{ color: "#8a8578", fontWeight: 400 }}>· {pr.negocio_nombre}</span>
      </h1>
      <p style={{ color: "#8a8578", fontSize: ".9rem", marginBottom: 16 }}>
        {pr.meta} sellos → {pr.premio}
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {["clientes", "diseño"].map((t) => (
          <button
            key={t}
            className={tab === t ? "" : "sec"}
            style={{ padding: "8px 16px", fontSize: ".9rem" }}
            onClick={() => setTab(t)}
          >
            {t === "clientes" ? "Clientes" : "Diseño de la tarjeta"}
          </button>
        ))}
      </div>
      {tab === "clientes" ? (
        <Clientes programaId={programaId} meta={pr.meta} />
      ) : (
        <Disenador pr={pr} onSaved={cargar} />
      )}
    </div>
  );
}

/* ───────────────────────── Clientes ───────────────────────── */

function Clientes({ programaId, meta }) {
  const [clientes, setClientes] = useState(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState(null);
  const [editando, setEditando] = useState(null); // serial en edición

  async function cargar(query = q) {
    const r = await fetch(
      `/api/panel/clientes?programa=${programaId}&q=${encodeURIComponent(query)}`
    );
    if (r.ok) setClientes((await r.json()).clientes);
  }
  useEffect(() => {
    cargar("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programaId]);

  async function accion(serial, accion, valor) {
    setMsg(null);
    const r = await fetch("/api/panel/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial, accion, valor }),
    });
    const data = await r.json();
    setMsg({ ok: r.ok, texto: r.ok ? data.mensaje : data.error });
    cargar();
  }

  async function guardarEdicion(serial, nombre, telefono) {
    await fetch("/api/panel/clientes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial, nombre, telefono }),
    });
    setEditando(null);
    cargar();
  }

  if (!clientes) return <p>Cargando clientes…</p>;

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <input
          placeholder="Buscar por nombre, teléfono o ID…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            cargar(e.target.value);
          }}
        />
      </div>
      {msg && (
        <p className={msg.ok ? "msg-ok" : "msg-err"} style={{ marginBottom: 10, fontSize: ".9rem" }}>
          {msg.texto}
        </p>
      )}
      {clientes.length === 0 ? (
        <p style={{ color: "#8a8578" }}>Sin clientes todavía.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Wallet</th>
                <th>Sellos</th>
                <th>Premios</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) =>
                editando === c.serial ? (
                  <FilaEdicion key={c.serial} c={c} onSave={guardarEdicion} onCancel={() => setEditando(null)} />
                ) : (
                  <tr key={c.serial}>
                    <td>{c.nombre}</td>
                    <td>{c.telefono || "—"}</td>
                    <td>{c.plataforma === "apple" ? "" : "▲"} {c.plataforma}</td>
                    <td>
                      <b>{c.sellos}</b>/{meta}
                    </td>
                    <td>{c.premios}</td>
                    <td>
                      <div className="fila-acciones">
                        <button onClick={() => accion(c.serial, "sello")}>+1</button>
                        <button
                          className="sec"
                          onClick={() => {
                            const v = prompt(`Sellos exactos (0-${meta}):`, c.sellos);
                            if (v !== null) accion(c.serial, "ajuste", parseInt(v, 10));
                          }}
                        >
                          Ajustar
                        </button>
                        <button className="warn" onClick={() => accion(c.serial, "canjear")}>
                          Canjear
                        </button>
                        <button className="sec" onClick={() => accion(c.serial, "reset")}>
                          Reset
                        </button>
                        <button className="sec" onClick={() => setEditando(c.serial)}>
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilaEdicion({ c, onSave, onCancel }) {
  const [nombre, setNombre] = useState(c.nombre);
  const [telefono, setTelefono] = useState(c.telefono || "");
  return (
    <tr>
      <td>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ padding: 6 }} />
      </td>
      <td>
        <input value={telefono} onChange={(e) => setTelefono(e.target.value)} style={{ padding: 6 }} />
      </td>
      <td colSpan={3} style={{ color: "#8a8578", fontSize: ".8rem" }}>
        ID: {c.serial.slice(0, 8)}…
      </td>
      <td>
        <div className="fila-acciones">
          <button onClick={() => onSave(c.serial, nombre, telefono)}>Guardar</button>
          <button className="sec" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ───────────────────────── Diseñador ───────────────────────── */

function Disenador({ pr, onSaved }) {
  const [d, setD] = useState({ ...D, ...(pr.diseno || {}) });
  const [meta, setMeta] = useState(pr.meta);
  const [premio, setPremio] = useState(pr.premio);
  const [activo, setActivo] = useState(pr.activo);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  // Sube una imagen → la normaliza a PNG (máx 480px) vía canvas → dataURL.
  function subirImagen(e, campo) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const max = campo === "hero" ? 1032 : 480;
      const scale = Math.min(1, max / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      setD((prev) => ({ ...prev, [campo]: canvas.toDataURL("image/png") }));
    };
    img.src = URL.createObjectURL(file);
  }

  async function guardar() {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/panel/programas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pr.id, meta: parseInt(meta, 10), premio, activo, diseno: d }),
    });
    const data = await r.json();
    setMsg(
      r.ok
        ? { ok: true, texto: "Guardado. Las tarjetas nuevas y las que se actualicen tomarán el diseño." }
        : { ok: false, texto: data.error || "Error al guardar" }
    );
    setBusy(false);
    if (r.ok) onSaved();
  }

  const sellosDemo = Math.min(2, meta);
  const visual = "● ".repeat(sellosDemo) + "○ ".repeat(Math.max(0, meta - sellosDemo));

  return (
    <div style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(280px, 380px) 1fr", alignItems: "start" }}>
      {/* Controles */}
      <div className="card">
        <label className="field">Meta de sellos</label>
        <input type="number" min={1} max={20} value={meta} onChange={(e) => setMeta(e.target.value)} />
        <label className="field">Premio</label>
        <input value={premio} onChange={(e) => setPremio(e.target.value)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 4 }}>
          {[
            ["bg", "Fondo"],
            ["fg", "Texto"],
            ["label", "Etiquetas"],
          ].map(([k, lbl]) => (
            <div key={k}>
              <label className="field">{lbl}</label>
              <input
                type="color"
                value={d[k]}
                onChange={(e) => setD({ ...d, [k]: e.target.value })}
                style={{ height: 42, padding: 4 }}
              />
            </div>
          ))}
        </div>
        <label className="field">Logo (PNG/JPG, se convierte solo)</label>
        <input type="file" accept="image/*" onChange={(e) => subirImagen(e, "logo")} />
        <label className="field">Banner Google (opcional, ancho)</label>
        <input type="file" accept="image/*" onChange={(e) => subirImagen(e, "hero")} />
        <label className="field">Texto “¿Cómo funciona?” (opcional)</label>
        <textarea
          rows={3}
          value={d.como || ""}
          placeholder={`Junta ${meta} sellos y llévate ${premio}…`}
          onChange={(e) => setD({ ...d, como: e.target.value || null })}
        />
        <label
          className="field"
          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            style={{ width: "auto" }}
          />
          Tarjeta activa (los clientes nuevos se registran en ella)
        </label>
        <p style={{ fontSize: ".78rem", color: "#8a8578", marginTop: 4 }}>
          Al desactivarla, las tarjetas ya emitidas siguen funcionando (sellar y canjear),
          pero el registro público usa la siguiente tarjeta activa del negocio. Así cambias
          de promo sin afectar a quien va a la mitad.
        </p>
        <button disabled={busy} style={{ width: "100%", marginTop: 12 }} onClick={guardar}>
          Guardar diseño
        </button>
        {msg && (
          <p className={msg.ok ? "msg-ok" : "msg-err"} style={{ marginTop: 10, fontSize: ".9rem" }}>
            {msg.texto}
          </p>
        )}
      </div>

      {/* Previews */}
      <div style={{ display: "grid", gap: 16 }}>
        <PreviewApple d={d} meta={meta} negocio={pr.negocio_nombre} visual={visual} sellos={sellosDemo} />
        <PreviewGoogle d={d} meta={meta} negocio={pr.negocio_nombre} visual={visual} sellos={sellosDemo} />
        <p style={{ fontSize: ".82rem", color: "#8a8578" }}>
          Los previews son aproximados: cada wallet impone su propio layout, por eso la tarjeta
          nunca se ve idéntica en iPhone y Android — pero comparte tus colores, logo y textos.
        </p>
      </div>
    </div>
  );
}

function PreviewApple({ d, meta, negocio, visual, sellos }) {
  return (
    <div>
      <p style={{ fontSize: ".8rem", fontWeight: 700, color: "#8a8578", marginBottom: 6 }}> iPhone (Apple Wallet)</p>
      <div style={{ background: d.bg, color: d.fg, borderRadius: 14, padding: 16, maxWidth: 380, boxShadow: "0 6px 20px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {d.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.logo} alt="" style={{ height: 26, borderRadius: 6 }} />
            ) : (
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: d.label, display: "inline-block" }} />
            )}
            <b style={{ fontSize: ".95rem" }}>{negocio}</b>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: ".6rem", color: d.label }}>SELLOS</div>
            <b>{sellos}/{meta}</b>
          </div>
        </div>
        <div style={{ margin: "22px 0 4px" }}>
          <div style={{ fontSize: ".6rem", color: d.label }}>PROGRESO</div>
          <div style={{ fontSize: "1.5rem", letterSpacing: 2 }}>{visual}</div>
        </div>
        <div style={{ fontSize: ".6rem", color: d.label, marginTop: 14 }}>CLIENTE</div>
        <div>Nombre del cliente</div>
        <div style={{ background: "#fff", borderRadius: 8, width: 110, height: 110, margin: "16px auto 0", display: "grid", placeItems: "center", color: "#000", fontSize: ".65rem" }}>
          QR
        </div>
      </div>
    </div>
  );
}

function PreviewGoogle({ d, meta, negocio, visual, sellos }) {
  return (
    <div>
      <p style={{ fontSize: ".8rem", fontWeight: 700, color: "#8a8578", marginBottom: 6 }}>▲ Android (Google Wallet)</p>
      <div style={{ background: d.bg, color: "#fff", borderRadius: 22, padding: 18, maxWidth: 380, boxShadow: "0 6px 20px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {d.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.logo} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", background: "#fff" }} />
          ) : (
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: "#fff3", display: "inline-block" }} />
          )}
          <div>
            <div style={{ fontSize: ".8rem", opacity: 0.85 }}>{negocio}</div>
            <b style={{ fontSize: ".95rem" }}>Tarjeta de sellos</b>
          </div>
        </div>
        <div style={{ margin: "18px 0 2px", fontSize: ".8rem", opacity: 0.85 }}>Tus sellos</div>
        <div style={{ fontSize: "1.4rem", letterSpacing: 2 }}>{visual}</div>
        <div style={{ fontSize: ".8rem", opacity: 0.85, marginTop: 6 }}>Progreso: {sellos} de {meta}</div>
        <div style={{ background: "#fff", borderRadius: 12, width: 130, height: 130, margin: "16px auto", display: "grid", placeItems: "center", color: "#000", fontSize: ".65rem" }}>
          QR
        </div>
        {d.hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.hero} alt="" style={{ width: "100%", borderRadius: 12, display: "block" }} />
        ) : null}
      </div>
    </div>
  );
}
