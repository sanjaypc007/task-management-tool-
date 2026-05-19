/**
 * Small HTTP helpers for Vercel serverless functions.
 */

export const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};

export const readJsonBody = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf-8").trim();

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body.");
  }
};

export const getBearerToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const match = typeof header === "string" ? header.match(/^Bearer\s+(.+)$/i) : null;
  return match ? match[1] : "";
};
