// netlify/functions/results.mjs
import { getStore } from "@netlify/blobs";

const STORE_NAME = "family-quiz";
const KEY = "scores";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

export default async (req) => {
  const store = getStore(STORE_NAME);

  // GET — отдаём все сохранённые результаты
  if (req.method === "GET") {
    try {
      const data = await store.get(KEY, { type: "json" });
      return json(data || {});
    } catch (e) {
      console.error("Blobs GET error:", e);
      return json({ error: "storage_error" }, 500);
    }
  }

  // POST — сохраняем результат одного игрока (name + score)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const player = String(body.player || "").trim();
      const score = Number(body.score);

      if (!player || !Number.isFinite(score)) {
        return json({ error: "invalid_payload" }, 400);
      }

      // читаем текущее состояние и мерджим — чтобы результаты разных
      // игроков не перетирали друг друга
      const current = (await store.get(KEY, { type: "json" })) || {};
      current[player] = score;
      await store.setJSON(KEY, current);

      return json({ ok: true, scores: current });
    } catch (e) {
      console.error("Blobs POST error:", e);
      return json({ error: "storage_error" }, 500);
    }
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = {
  path: "/api/results",
};