"use client";
import { toast } from "sonner";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, opts: { method?: string; body?: unknown; silent?: boolean } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers: opts.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? `Błąd ${res.status}`;
    // sesja wygasła — pełne przeładowanie na stronę logowania
    if (res.status === 401) window.location.replace(`${window.location.origin}/login`);
    if (!opts.silent) toast.error(msg);
    throw new ApiError(msg, res.status, (data as { code?: string }).code);
  }
  return data as T;
}

export interface UploadParams {
  role: "SOURCE_REEL" | "RAW_CLIP" | "MUSIC" | "LOGO" | "THUMBNAIL";
  projectId?: string;
  clientId?: string;
  license?: string;
}

/** Upload strumieniowy (PUT) z postępem przez XMLHttpRequest. */
export function uploadFile(file: File | Blob, name: string, params: UploadParams, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<{ asset: { id: string; originalName: string; status: string } }> {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams({ name, role: params.role, ...(params.projectId ? { projectId: params.projectId } : {}), ...(params.clientId ? { clientId: params.clientId } : {}), ...(params.license ? { license: params.license } : {}) });
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/upload?${qs}`);
    xhr.setRequestHeader("content-type", "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data: { error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as never);
      else reject(new ApiError(data.error ?? `Błąd przesyłania (${xhr.status})`, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError("Błąd połączenia podczas przesyłania pliku.", 0));
    xhr.onabort = () => reject(new ApiError("Przesyłanie anulowane.", 0));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}

export const mediaUrl = (id: string, v: "proxy" | "poster" | "sprite" | "original" | "last" | "waveform" = "proxy") => `/api/media/${id}?v=${v}`;
