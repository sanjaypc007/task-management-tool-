/**
 * Swagger/OpenAPI specification for Task Manager.
 *
 * This is a Firebase-only app (no REST server), so this spec documents the
 * service-layer functions as if they were HTTP endpoints to demonstrate
 * API-first documentation habits.
 */

export const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Task Manager API",
    version: "1.0.0",
    description:
      "Service layer API for Task Manager — Firebase Firestore operations",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Tasks", description: "Task CRUD operations" },
    { name: "Auth", description: "Authentication info" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Firebase ID token as `Authorization: Bearer <token>` (get via auth.currentUser.getIdToken())",
      },
    },
    schemas: {
      Task: {
        type: "object",
        properties: {
          id: { type: "string", description: "Firestore document ID" },
          title: { type: "string", maxLength: 200 },
          status: {
            type: "string",
            enum: ["Planned", "In Progress", "Complete"],
          },
          userId: { type: "string", description: "Firebase Auth UID" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
};

/**
 * A fully self-contained spec object for Swagger UI.
 *
 * Note: swagger-jsdoc is typically used to generate `paths` from JSDoc blocks,
 * but in a Vite client app we keep a runnable spec here for Swagger UI.
 */
export const swaggerSpec = {
  ...swaggerDefinition,
  security: [{ bearerAuth: [] }],
  paths: {
    "/api/tasks": {
      post: {
        summary: "Create a new task",
        description:
          "Adds a new task document to Firestore for the authenticated user",
        tags: ["Tasks"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: {
                    type: "string",
                    maxLength: 200,
                    description: "Task title text",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Task created successfully" },
          400: { description: "Validation error - empty or too long title" },
          401: { description: "Unauthorized - user not authenticated" },
          500: { description: "Firestore write error" },
        },
      },
      get: {
        summary: "Get tasks for a user (real-time)",
        description:
          "Returns the authenticated user's tasks ordered by newest first",
        tags: ["Tasks"],
        responses: {
          200: { description: "Task list stream started successfully" },
          401: { description: "Unauthorized - user not authenticated" },
          500: { description: "Firestore read/listen error" },
        },
      },
    },
    "/api/tasks/{id}/status": {
      patch: {
        summary: "Update task status",
        description:
          "Updates the status field of a task document in Firestore",
        tags: ["Tasks"],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
            description: "Firestore document ID for the task",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["Planned", "In Progress", "Complete"],
                    description: "New status for the task",
                  },
                },
              },
            },
          },
        },
        responses: {
          204: { description: "Task status updated successfully" },
          400: { description: "Validation error - invalid status" },
          401: { description: "Unauthorized - user not authenticated" },
          404: { description: "Task not found" },
          500: { description: "Firestore update error" },
        },
      },
    },
    "/api/tasks/{id}": {
      delete: {
        summary: "Delete a task",
        description: "Deletes a task document from Firestore",
        tags: ["Tasks"],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
            description: "Firestore document ID for the task",
          },
        ],
        responses: {
          204: { description: "Task deleted successfully" },
          401: { description: "Unauthorized - user not authenticated" },
          404: { description: "Task not found" },
          500: { description: "Firestore delete error" },
        },
      },
    },
  },
};

export default swaggerSpec;
