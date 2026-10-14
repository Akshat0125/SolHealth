import { NextResponse } from "next/server";

// In-memory fallback cache for development/testing without Pinata API key
declare global {
  // eslint-disable-next-line no-var
  var __mockIpfsStore: Map<string, Uint8Array> | undefined;
}

const ipfsStore = globalThis.__mockIpfsStore || new Map<string, Uint8Array>();
globalThis.__mockIpfsStore = ipfsStore;

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
  try {
    let fileBytes: Uint8Array;
    let fileName = "encrypted-record.bin";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
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
          { error: "No raw bytes received in request body" },
          { status: 400 }
        );
      }
      fileBytes = new Uint8Array(arrayBuffer);
    }

    const jwt = process.env.PINATA_JWT;
    const hasPinataJwt = jwt && jwt !== "PASTE_YOUR_JWT_HERE" && jwt.trim().length > 10;

    let cid: string | null = null;

    if (hasPinataJwt) {
      const blob = new Blob([fileBytes as unknown as BlobPart], {
        type: "application/octet-stream",
      });

      // 1. Try Pinata v3 Files API: POST https://uploads.pinata.cloud/v3/files
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
        }
      } catch (e) {
        console.warn("Pinata v3 upload attempt failed:", e);
      }

      // 2. Fallback to Pinata v1 pinFileToIPFS if v3 did not succeed
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
            const errText = await v1Res.text();
            console.warn(`Pinata v1 returned status ${v1Res.status}: ${errText}`);
          }
        } catch (e) {
          console.warn("Pinata v1 upload attempt failed:", e);
        }
      }
    }

    // Fallback if Pinata is not configured or failed in development
    if (!cid) {
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        fileBytes as unknown as BufferSource
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      // Construct a valid CID-like string of max 64 chars (Anchor constraint)
      cid = `QmLocal${hex.slice(0, 40)}`;
    }

    // Cache locally for immediate fast retrieval
    ipfsStore.set(cid, fileBytes);

    return NextResponse.json({ cid });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Internal server error: ${message}` },
      { status: 500 }
    );
  }
}
