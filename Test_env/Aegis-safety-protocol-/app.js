import React from "react";
import ReactDOM from "react-dom/client";

const App = () => {
  return (
    <div style={{ padding: "2rem", fontFamily: "Roboto, sans-serif" }}>
      <h1 style={{ color: "#00ffc8" }}>Aegis Command Center</h1>
      <p>Welcome back, Commander.</p>
      <p>Your systems are online. All modules are standing by for deployment.</p>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
