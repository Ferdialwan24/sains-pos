import { ApiError } from '../utils/ApiError.js';

export const errorHandler = (error, _request, response, _next) => {
  if (error instanceof ApiError) {
    return response.status(error.statusCode).json({
      message: error.message,
      details: error.details
    });
  }

  if (error?.name === 'ValidationError') {
    return response.status(400).json({
      message: 'Validation failed',
      details: Object.values(error.errors).map((item) => item.message)
    });
  }

  if (error?.code === 11000) {
    return response.status(409).json({
      message: `Duplicate value for ${Object.keys(error.keyPattern ?? {}).join(', ') || 'unique field'}`
    });
  }

  if (error?.type === 'entity.too.large') {
    return response.status(413).json({
      message: 'Uploaded image is too large. Please use an image smaller than 5 MB.'
    });
  }

  console.error(error);

  return response.status(500).json({
    message: 'Internal server error'
  });
};
