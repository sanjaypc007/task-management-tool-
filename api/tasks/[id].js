/**
 * /api/tasks/:id
 * - DELETE: delete a task owned by the authenticated user
 */

import { adminDb } from "../_lib/firebaseAdmin";
import { requireAuthUid } from "../_lib/auth";
import { sendJson } from "../_lib/http";

const TASKS_COLLECTION = "tasks";

export default async function handler(req, res) {
  try {
    if (req.method !== "DELETE") {
      res.setHeader("Allow", "DELETE");
      return sendJson(res, 405, { error: `Method ${req.method} Not Allowed` });
    }

    const uid = await requireAuthUid(req);
    const taskId = req.query?.id;

    if (!taskId || typeof taskId !== "string") {
      return sendJson(res, 400, { error: "Validation error - taskId is required." });
    }

    const taskRef = adminDb.collection(TASKS_COLLECTION).doc(taskId);
    const snap = await taskRef.get();

    if (!snap.exists) {
      return sendJson(res, 404, { error: "Task not found." });
    }

    const data = snap.data();
    if (data.userId !== uid) {
      return sendJson(res, 403, { error: "Forbidden." });
    }

    await taskRef.delete();
    return sendJson(res, 204, {});
  } catch (error) {
    const statusCode = typeof error?.statusCode === "number" ? error.statusCode : 500;
    if (statusCode === 401) {
      return sendJson(res, 401, { error: error.message });
    }

    return sendJson(res, 500, { error: "Internal server error." });
  }
}
