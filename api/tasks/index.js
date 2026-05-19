/**
 * /api/tasks
 * - GET: list tasks for the authenticated user (newest first)
 * - POST: create a task for the authenticated user
 */

import { adminDb, adminFieldValue } from "../_lib/firebaseAdmin";
import { requireAuthUid } from "../_lib/auth";
import { readJsonBody, sendJson } from "../_lib/http";

const TASKS_COLLECTION = "tasks";
const ALLOWED_STATUSES = ["Planned", "In Progress", "Complete"];
const ALLOWED_PRIORITIES = ["High", "Medium", "Low"];

const normalizePriority = (priority) => {
  const candidate = typeof priority === "string" ? priority.trim() : "";
  if (!candidate) return "Medium";
  return ALLOWED_PRIORITIES.includes(candidate) ? candidate : "Medium";
};

const normalizeFirestoreTask = (docSnap) => {
  const data = docSnap.data();
  const createdAtIso = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null;

  return {
    id: docSnap.id,
    title: data.title,
    status: data.status,
    priority: normalizePriority(data.priority),
    userId: data.userId,
    createdAt: createdAtIso,
  };
};

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const uid = await requireAuthUid(req);

      const snapshot = await adminDb
        .collection(TASKS_COLLECTION)
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc")
        .get();

      const tasks = snapshot.docs.map(normalizeFirestoreTask);
      return sendJson(res, 200, { tasks });
    }

    if (req.method === "POST") {
      const uid = await requireAuthUid(req);
      const body = await readJsonBody(req);

      const titleRaw = typeof body.title === "string" ? body.title : "";
      const title = titleRaw.trim();

      if (!title) {
        return sendJson(res, 400, { error: "Validation error - title is required." });
      }

      if (title.length > 200) {
        return sendJson(res, 400, {
          error: "Validation error - title must be 200 characters or less.",
        });
      }

      const priorityRaw = typeof body.priority === "string" ? body.priority.trim() : "";
      if (body.priority != null && priorityRaw && !ALLOWED_PRIORITIES.includes(priorityRaw)) {
        return sendJson(res, 400, {
          error: `Validation error - priority must be one of: ${ALLOWED_PRIORITIES.join(
            ", "
          )}.`,
        });
      }

      const priority = normalizePriority(body.priority);

      const docRef = await adminDb.collection(TASKS_COLLECTION).add({
        title,
        status: "Planned",
        priority,
        userId: uid,
        createdAt: adminFieldValue.serverTimestamp(),
      });

      return sendJson(res, 201, {
        id: docRef.id,
        title,
        status: "Planned",
        priority,
        userId: uid,
      });
    }

    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    const statusCode = typeof error?.statusCode === "number" ? error.statusCode : 500;

    if (error?.message?.includes("index") || error?.code === 9) {
      return sendJson(res, 500, {
        error:
          "Firestore query requires an index. Create the suggested composite index for tasks (userId + createdAt desc).",
      });
    }

    if (statusCode === 401) {
      return sendJson(res, 401, { error: error.message });
    }

    if (error?.message?.includes("Invalid JSON")) {
      return sendJson(res, 400, { error: error.message });
    }

    return sendJson(res, 500, { error: "Internal server error." });
  }
}
