export interface HealthResponse {
  status: "ok";
}

export interface HealthErrorResponse {
  error: {
    code: "SERVICE_UNAVAILABLE";
    message: string;
    requestId: string;
  };
}
