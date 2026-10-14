/**
 * IPFS Helper for retrieving pinned encrypted health records.
 */

const PUBLIC_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

/**
 * Fetch raw encrypted record bytes from IPFS with gateway fallback.
 *
 * @param cid - IPFS content identifier (CID)
 * @returns Decrypted raw bytes as Uint8Array
 */
export async function fetchFromIpfs(cid: string): Promise<Uint8Array> {
  const cleanCid = cid.trim().replace(/^ipfs:\/\//, "");

  // If CID is a local mock or running in browser, try local Next.js cache first
  const localGateway = typeof window !== "undefined"
    ? `${window.location.origin}/api/pin?cid=`
    : "http://127.0.0.1:3000/api/pin?cid=";

  const gateways = cleanCid.startsWith("QmLocal")
    ? [localGateway, ...PUBLIC_GATEWAYS]
    : [...PUBLIC_GATEWAYS, localGateway];

  let lastError: Error | null = null;

  for (const gateway of gateways) {
    const url = `${gateway}${cleanCid}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/octet-stream, */*",
        },
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } else {
        lastError = new Error(
          `Gateway ${gateway} returned status ${response.status}: ${response.statusText}`
        );
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(
    `Failed to fetch CID '${cleanCid}' from any IPFS gateway. Last error: ${
      lastError?.message || "Unknown error"
    }`
  );
}
