import "@/styles/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { MainContainer } from "@/components/main-container";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MainContainer>
      <App />
    </MainContainer>
  </React.StrictMode>
);
