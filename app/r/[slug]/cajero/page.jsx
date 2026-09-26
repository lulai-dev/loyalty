// Panel del cajero de un negocio: escanea el QR del pase y sella.
"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";

export default function CajeroPage() {
  const [serial, setSerial] = useState(null);
  const [pin, setPin] = useState("");
  const [out, setOut] = useState(null); // { ok, texto }
  const [busy, setBusy] = useState(false);
  const [scanReady, setScanReady] = useState(false);
  const [sinCamara, setSinCamara] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    try {
      setPin(sessionStorage.getItem("pin") || "");
    } catch {}
  }, []);

  function startScanner() {
    if (startedRef.current || typeof window === "undefined" || !window.Html5Qrcode) return;
    startedRef.current = true;
    const scanner = new window.Html5Qrcode("reader");
    window.Html5Qrcode.getCameras()
      .then((cams) => {
        if (!cams.length) throw new Error("Sin cámara");
        const cam =
          cams.find((c) => /back|rear|environment|trasera/i.test(c.label)) || cams[0];
        return scanner.start(
          cam.id,
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (texto) => {
            setSerial(texto.trim());
            setOut(null);
          }
        );
      })
      .catch(() => setSinCamara(true));
  }

  useEffect(() => {
    if (scanReady) startScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanReady]);

  async function accion(tipo) {
    try {
      sessionStorage.setItem("pin", pin);
    } catch {}
    setBusy(true);
    setOut({ ok: true, texto: "Procesando…" });
    try {
      const r = await fetch("/api/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial, pin, accion: tipo }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      setOut({ ok: true, texto: data.mensaje });
    } catch (err) {
      setOut({ ok: false, texto: err.message });
    }
    setBusy(false);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#2b2b33", color: "#fff", padding: 16 }}>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js"
        onLoad={() => setScanReady(true)}
        strategy="afterInteractive"
      />
      <div style={{ maxWidth: 440, margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.2rem", textAlign: "center", margin: "8px 0 16px" }}>
          Panel del cajero
        </h1>
        <div id="reader" style={{ borderRadius: 16, overflow: "hidden", background: "#000" }} />
        <div className="card" style={{ marginTop: 16, color: "#2b2b33" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: 8 }}>Tarjeta escaneada</h2>
          <p style={{ fontFamily: "monospace", fontSize: ".85rem", color: "#8a8578", wordBreak: "break-all" }}>
            {serial || (sinCamara ? "Sin cámara: escribe el ID abajo." : "Escanea el QR del pase del cliente…")}
          </p>
          {sinCamara && (
            <input
              placeholder="ID de la tarjeta (serial)"
              onChange={(e) => setSerial(e.target.value.trim())}
              style={{ marginTop: 8 }}
            />
          )}
          <input
            type="password"
            inputMode="numeric"
            placeholder="PIN del cajero"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={{ margin: "10px 0" }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button disabled={!serial || busy} onClick={() => accion("sello")} style={{ flex: 1 }}>
              +1 Sello
            </button>
            <button
              disabled={!serial || busy}
              onClick={() => accion("canjear")}
              className="warn"
              style={{ flex: 1 }}
            >
              Canjear premio
            </button>
          </div>
          {out && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                fontSize: ".95rem",
                background: out.ok ? "#e6f4e6" : "#fbe9e7",
                color: out.ok ? "#2e7d32" : "#b3261e",
              }}
            >
              {out.texto}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
