import { MainContainer } from "@/components/main-container";
import { queryClient } from "@/lib/query";
import "@/styles/globals.css";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

// biome-ignore lint/style/noNonNullAssertion: this is fine in entrypoints
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MainContainer>
        <App />
      </MainContainer>
    </QueryClientProvider>
  </React.StrictMode>,
);
