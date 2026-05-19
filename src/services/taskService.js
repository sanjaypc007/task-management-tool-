/**
 * Task service layer for Firestore CRUD operations.
 *
 * This module intentionally mirrors a REST-style API (POST/GET/PATCH/DELETE)
 * but executes against Firebase Firestore.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebase";

const TASKS_COLLECTION = "tasks";
const ALLOWED_STATUSES = ["Planned", "In Progress", "Complete"];

const validateUserId = (userId) => {
  if (!userId || typeof userId !== "string") {
    throw new Error("Unauthorized - userId is required.");
  }
};

const validateTitle = (title) => {
  const trimmedTitle = typeof title === "string" ? title.trim() : "";

  if (!trimmedTitle) {
    throw new Error("Validation error - title is required.");
  }

  if (trimmedTitle.length > 200) {
    throw new Error("Validation error - title must be 200 characters or less.");
  }

  return trimmedTitle;
};

const validateStatus = (status) => {
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error(
      `Validation error - status must be one of: ${ALLOWED_STATUSES.join(
        ", "
      )}.`
    );
  }
};

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     description: Adds a new task document to Firestore for the authenticated user
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, title]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Firebase Auth UID of the logged-in user
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 description: Task title text
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation error - empty or too long title
 *       401:
 *         description: Unauthorized - user not authenticated
 *       500:
 *         description: Firestore write error
 */
export const createTask = async (userId, title) => {
  try {
    validateUserId(userId);
    const validatedTitle = validateTitle(title);

    const docRef = await addDoc(collection(db, TASKS_COLLECTION), {
      title: validatedTitle,
      status: "Planned",
      userId,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("createTask failed:", error);
    throw error;
  }
};

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get tasks for a user (real-time)
 *     description: Subscribes to the authenticated user's tasks in Firestore ordered by newest first
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase Auth UID of the logged-in user
 *     responses:
 *       200:
 *         description: Task list stream started successfully
 *       401:
 *         description: Unauthorized - user not authenticated
 *       500:
 *         description: Firestore read/listen error
 */
export const getUserTasks = (userId, callback, errorCallback) => {
  try {
    validateUserId(userId);

    if (typeof callback !== "function") {
      throw new Error("Validation error - callback must be a function.");
    }

    if (errorCallback && typeof errorCallback !== "function") {
      throw new Error("Validation error - errorCallback must be a function.");
    }

    const tasksQuery = query(
      collection(db, TASKS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        try {
          const tasks = snapshot.docs.map((taskDoc) => ({
            id: taskDoc.id,
            ...taskDoc.data(),
          }));

          callback(tasks);
        } catch (error) {
          console.error("getUserTasks snapshot processing failed:", error);
          if (errorCallback) errorCallback(error);
          callback([]);
        }
      },
      (error) => {
        console.error("getUserTasks listener failed:", error);
        if (errorCallback) errorCallback(error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("getUserTasks failed:", error);
    throw error;
  }
};

/**
 * @swagger
 * /tasks/{id}/status:
 *   patch:
 *     summary: Update task status
 *     description: Updates the status field of a task document in Firestore
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Firestore document ID for the task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Planned, In Progress, Complete]
 *                 description: New status for the task
 *     responses:
 *       204:
 *         description: Task status updated successfully
 *       400:
 *         description: Validation error - invalid status
 *       401:
 *         description: Unauthorized - user not authenticated
 *       404:
 *         description: Task not found
 *       500:
 *         description: Firestore update error
 */
export const updateTaskStatus = async (taskId, status) => {
  try {
    if (!taskId || typeof taskId !== "string") {
      throw new Error("Validation error - taskId is required.");
    }

    validateStatus(status);

    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, { status });
  } catch (error) {
    console.error("updateTaskStatus failed:", error);
    throw error;
  }
};

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     description: Deletes a task document from Firestore
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Firestore document ID for the task
 *     responses:
 *       204:
 *         description: Task deleted successfully
 *       401:
 *         description: Unauthorized - user not authenticated
 *       404:
 *         description: Task not found
 *       500:
 *         description: Firestore delete error
 */
export const deleteTask = async (taskId) => {
  try {
    if (!taskId || typeof taskId !== "string") {
      throw new Error("Validation error - taskId is required.");
    }

    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error("deleteTask failed:", error);
    throw error;
  }
};
