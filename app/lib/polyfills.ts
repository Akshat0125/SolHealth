import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  if (typeof (window as any).Buffer === "undefined") {
    (window as any).Buffer = Buffer;
  }
  if (typeof (window as any).global === "undefined") {
    (window as any).global = window;
  }
}

if (typeof globalThis !== "undefined") {
  if (typeof (globalThis as any).Buffer === "undefined") {
    (globalThis as any).Buffer = Buffer;
  }
}

export { Buffer };
