import https from "https";
import http from "http";
import tls from "tls";
import { URL } from "url";
import dns from "dns/promises";
import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  res.setHeader("Content-Type", "application/json");

  try {
    const reqUrl = new URL(req.url || "", "http://localhost");
    const target = reqUrl.searchParams.get("url");

    if (!target) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Target URL is required" }));
      return;
    }

    const url = new URL(
      target.startsWith("http://") || target.startsWith("https://")
        ? target
        : `https://${target}`
    );

    const client = url.protocol === "https:" ? https : http;

    const request = client.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname || "/"}${url.search || ""}`,
        method: "GET",
        rejectUnauthorized: false,
        headers: {
          "User-Agent": "PascoAI-WebSecurity/1.0",
          Accept: "*/*",
          Connection: "close" // 🔑 prevents hanging
        },
        timeout: 10000 // 🔑 hard safety
      },
      async (resp) => {
        // 🔑 Drain response (VERY IMPORTANT)
        resp.resume();

        resp.once("end", async () => {
          // TLS certificate
          let certificate: null | {
            issuer: string;
            validFrom: string;
            validTo: string;
            expired: boolean;
            daysRemaining: number;
          } = null;

          if (url.protocol === "https:" && resp.socket instanceof tls.TLSSocket) {
            const cert = resp.socket.getPeerCertificate();
            if (cert?.valid_to) {
              const validTo = new Date(cert.valid_to);
              certificate = {
                issuer: cert.issuer?.O || "Unknown",
                validFrom: cert.valid_from,
                validTo: cert.valid_to,
                expired: validTo.getTime() < Date.now(),
                daysRemaining: Math.ceil(
                  (validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )
              };
            }
          }

          // DNS records
          const dnsRecords = await dns
            .resolveAny(url.hostname)
            .catch(() => []);

          res.statusCode = 200;
          res.end(
            JSON.stringify({
              url: url.href,
              finalUrl: url.href,
              redirects: [url.href],
              https: url.protocol === "https:",
              statusCode: resp.statusCode || 0,
              headers: resp.headers,
              certificate,
              dns: dnsRecords,
              allow: resp.headers["allow"] || "",
              scannedAt: new Date().toISOString()
            })
          );
        });
      }
    );

    request.on("timeout", () => {
      request.destroy();
      res.statusCode = 504;
      res.end(JSON.stringify({ error: "Target timed out" }));
    });

    request.on("error", (err) => {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    });

    request.end();
  } catch (err: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message || "Unknown error" }));
  }
}
