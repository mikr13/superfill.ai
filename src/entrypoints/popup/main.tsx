import "@/styles/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { MainContainer } from "@/components/main-container";
import { App } from "./App";

// biome-ignore lint/style/noNonNullAssertion: this is fine in entrypoints
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MainContainer>
      <App />
    </MainContainer>
  </React.StrictMode>
);
