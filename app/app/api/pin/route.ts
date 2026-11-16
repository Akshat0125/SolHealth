import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

// In-memory fallback cache for development/testing without Pinata API key
declare global {
  // eslint-disable-next-line no-var
  var __mockIpfsStore: Map<string, Uint8Array> | undefined;
}

const ipfsStore = globalThis.__mockIpfsStore || new Map<string, Uint8Array>();
globalThis.__mockIpfsStore = ipfsStore;

// In-memory per-IP rate limit map
// Note: In serverless environments (such as Vercel), instances are ephemeral and state is not shared
// across isolated execution environments, making in-memory rate limiting approximate (best-effort).
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_UPLOADS_PER_WINDOW = 10;

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_UPLOADS_PER_WINDOW) {
    const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  return { allowed: true };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cid = url.searchParams.get("cid");
  if (!cid) {
    return NextResponse.json({ error: "Missing cid parameter" }, { status: 400 });
  }

  const cleanCid = cid.trim().replace(/^ipfs:\/\//, "");
  const data = ipfsStore.get(cleanCid);
  if (!data) {
    return NextResponse.json({ error: "CID not found in local cache" }, { status: 404 });
  }

  return new NextResponse(data as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function POST(request: Request) {
  // 1. Kill switch check
  if (process.env.UPLOADS_ENABLED === "false") {
    return NextResponse.json(
      { error: "File uploads are currently disabled by the administrator" },
      { status: 503 }
    );
  }

  // 2. Best-effort per-IP rate limit
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "127.0.0.1";

  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Upload rate limit exceeded. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter),
        },
      }
    );
  }

  // 3. Early Content-Length size check
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Payload exceeds 4 MB maximum limit" },
      { status: 413 }
    );
  }

  // 4. Content-Type check (reject non-binary)
  const contentType = request.headers.get("content-type") || "";
  const isMultipart = contentType.includes("multipart/form-data");
  const isOctet = contentType.includes("application/octet-stream");

  if (!isMultipart && !isOctet) {
    return NextResponse.json(
      { error: "Only binary encrypted files (application/octet-stream or multipart/form-data) are accepted" },
      { status: 415 }
    );
  }

  try {
    let fileBytes: Uint8Array;
    let fileName = "encrypted-record.bin";

    if (isMultipart) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { error: "No file provided in form-data payload" },
          { status: 400 }
        );
      }
      if ("name" in file && typeof file.name === "string") {
        fileName = file.name;
      }
      fileBytes = new Uint8Array(await file.arrayBuffer());
    } else {
      const arrayBuffer = await request.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return NextResponse.json(
          { error: "Upload payload cannot be empty" },
          { status: 400 }
        );
      }
      fileBytes = new Uint8Array(arrayBuffer);
    }

    // 5. Payload size and empty checks
    if (fileBytes.length === 0) {
      return NextResponse.json(
        { error: "Upload payload cannot be empty" },
        { status: 400 }
      );
    }

    if (fileBytes.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Payload exceeds 4 MB maximum limit" },
        { status: 413 }
      );
    }

    const jwt = process.env.PINATA_JWT;
    const hasPinataJwt = jwt && jwt !== "PASTE_YOUR_JWT_HERE" && jwt.trim().length > 10;

    let cid: string | null = null;

    if (hasPinataJwt) {
      const blob = new Blob([fileBytes as unknown as BlobPart], {
        type: "application/octet-stream",
      });

      // Try Pinata v3 Files API: POST https://uploads.pinata.cloud/v3/files
      try {
        const v3FormData = new FormData();
        v3FormData.append("file", blob, fileName);
        v3FormData.append("name", fileName);
        v3FormData.append("network", "public");

        const v3Res = await fetch("https://uploads.pinata.cloud/v3/files", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
          body: v3FormData,
        });

        if (v3Res.ok) {
          const v3Data = await v3Res.json();
          cid = v3Data?.data?.cid || v3Data?.cid || null;
        } else {
          // Log status without printing headers or tokens
          console.warn(`Pinata v3 returned HTTP status ${v3Res.status}`);
        }
      } catch {
        console.warn("Pinata v3 upload request failed");
      }

      // Fallback to Pinata v1 pinFileToIPFS if v3 did not succeed
      if (!cid) {
        try {
          const v1FormData = new FormData();
          v1FormData.append("file", blob, fileName);

          const v1Res = await fetch(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${jwt}`,
              },
              body: v1FormData,
            }
          );

          if (v1Res.ok) {
            const v1Data = await v1Res.json();
            cid = v1Data.IpfsHash;
          } else {
            console.warn(`Pinata v1 returned HTTP status ${v1Res.status}`);
          }
        } catch {
          console.warn("Pinata v1 upload request failed");
        }
      }
    }

    // Fallback in-memory hash if Pinata is not configured or failed in development
    if (!cid) {
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        fileBytes as unknown as BufferSource
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      cid = `QmLocal${hex.slice(0, 40)}`;
    }

    // Cache locally for immediate fast retrieval
    ipfsStore.set(cid, fileBytes);

    return NextResponse.json({ cid });
  } catch (err: unknown) {
    // Keep error details strictly server-side, return generic message to client
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Upload handler error:", errMessage);
    return NextResponse.json(
      { error: "Failed to process or pin encrypted file" },
      { status: 500 }
    );
  }
}
