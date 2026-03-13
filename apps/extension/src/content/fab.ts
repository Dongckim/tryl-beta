import type { ExtractedProduct } from "../adapters";

const HOST_ID = "tryl-fab-host";
const TOAST_Z = 2147483646;

/** Show a short-lived toast on the page (e.g. when background is unreachable). */
function showTrylToast(message: string, _type?: "error" | "info"): void {
  const el = document.createElement("div");
  el.setAttribute("data-tryl-toast", "1");
  el.style.cssText = [
    "position:fixed",
    "bottom:24px",
    "left:50%",
    "transform:translateX(-50%)",
    "z-index:" + TOAST_Z,
    "max-width:90%",
    "padding:12px 20px",
    "font-family:system-ui,sans-serif",
    "font-size:14px",
    "font-weight:500",
    "color:#fff",
    "background:#1a1a1a",
    "border:1px solid rgba(255,255,255,0.1)",
    "box-shadow:0 4px 20px rgba(0,0,0,0.35)",
    "border-radius:8px",
    "pointer-events:none",
  ].join(";");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

let host: HTMLDivElement | null = null;
let fabButton: HTMLButtonElement | null = null;
let getProduct: () => ExtractedProduct | null = () => null;

const styles = `
  :host, .tryl-fab-wrap {
    all: initial;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }
  .tryl-fab-wrap {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 2147483647;
    display: block;
  }
  .tryl-fab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 24px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #fff;
    background: #1a1a1a;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 0;
    cursor: pointer;
    box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08);
    transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
  }
  .tryl-fab:hover {
    background: #2d2d2d;
    box-shadow: 0 6px 28px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06);
    transform: translateY(-1px);
  }
  .tryl-fab:active {
    transform: translateY(0);
  }
  .tryl-fab.hidden {
    display: none;
  }
`;

function createButton(shadow: ShadowRoot): HTMLButtonElement {
  const wrap = document.createElement("div");
  wrap.className = "tryl-fab-wrap";
  const style = document.createElement("style");
  style.textContent = styles;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tryl-fab hidden";
  btn.textContent = "Try On";
  wrap.appendChild(style);
  wrap.appendChild(btn);
  shadow.appendChild(wrap);
  return btn;
}

export function initFAB(getProductFn: () => ExtractedProduct | null): void {
  getProduct = getProductFn;
  if (host) return;

  host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText = "display:block !important;z-index:2147483647 !important;";
  const shadow = host.attachShadow({ mode: "closed" });
  const btn = createButton(shadow);
  fabButton = btn;

  btn.addEventListener("click", () => {
    const product = getProduct();
    if (!product) return;
    chrome.runtime.sendMessage({ type: "TRY_ON", product }).catch((err) => {
      console.warn("[Tryl] Send message failed", err);
      showTrylToast(
        "Tryl connection lost. Please refresh the page (F5).",
        "error"
      );
    });
  });

  document.body.appendChild(host);
}

export function updateFABVisibility(): void {
  if (!fabButton) return;
  const product = getProduct();
  fabButton.classList.toggle("hidden", !product);
}
