/**
 * SwaggerDocs page.
 *
 * Renders Swagger UI for the Task Manager service-layer OpenAPI spec.
 * This is intentionally client-side documentation (no backend server).
 */

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

import swaggerSpec from "../../swagger.config";

export default function SwaggerDocs() {
  return (
    <div className="w-full">
      <SwaggerUI spec={swaggerSpec} />
    </div>
  );
}
