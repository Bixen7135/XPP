export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
  }
}

export const handleApiError = (error: unknown) => {
  if (error instanceof AppError) {
    // Handle known application errors
    return error.message;
  }
  // Handle unexpected errors
  return 'An unexpected error occurred';
}; 