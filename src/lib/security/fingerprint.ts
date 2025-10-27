export async function getBrowserFingerprint(): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error(
      "getBrowserFingerprint must be called from a browser context (popup/options/content script), not from background script",
    );
  }

  const components = [
    navigator.userAgent,
    navigator.language,
    `${window.screen.width}x${window.screen.height}`,
    await getCanvasFingerprint(),
    await getWebGLFingerprint(),
  ];

  const fingerprint = components.join("|");
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getCanvasFingerprint(): Promise<string> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.textBaseline = "top";
  ctx.font = "14px Arial";
  ctx.fillText("CANVAS_FINGERPRINT", 0, 0);
  return canvas.toDataURL();
}

async function getWebGLFingerprint(): Promise<string> {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) return "";

  return [
    gl.getParameter(gl.VENDOR),
    gl.getParameter(gl.RENDERER),
    gl.getParameter(gl.VERSION),
  ].join("|");
}
