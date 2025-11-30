import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const nav = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // login estático — redireciona para gestor de cancela
    nav("/gate");
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4f6f8",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 360,
          padding: 20,
          borderRadius: 8,
          background: "#fff",
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        }}
      >
        <h2 style={{ margin: "0 0 12px 0" }}>Entrar</h2>
        <input
          placeholder="Usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
        />
        <button
          type="submit"
          style={{
            width: "100%",
            padding: 10,
            background: "#0b74de",
            color: "#fff",
            border: "none",
            borderRadius: 4,
          }}
        >
          Entrar
        </button>
        <div style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
          Login estático — redireciona para Gestor de Cancela
        </div>
      </form>
    </div>
  );
}
