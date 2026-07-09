export const successResponse = <T>(
  data: T,
  message = 'Success',
  pagination?: any
) => {
  return {
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  };
};

export const errorResponse = (
  message = 'Internal Server Error',
  errors: any = null
) => {
  return {
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  };
};
