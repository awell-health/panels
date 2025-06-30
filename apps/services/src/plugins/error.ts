import { ZodError } from 'zod'
import fp from 'fastify-plugin'
import { NotFoundError } from '@/errors/not-found-error.js'

export default fp(
  async (fastify) => {
    // Set a custom error handler
    fastify.setErrorHandler((error, request, reply) => {
      // Default HTTP status code
      let statusCode = 500
      let errorMessage = 'Internal Server Error'

      // If this is a Fastify validation error, it might have a statusCode of 400
      // If you are using fastify-type-provider-zod and a route fails Zod validation,
      // the error might be recognized as a ZodError or a standard validation error.
      if (error.validation) {
        statusCode = 400
        errorMessage = 'Validation Error'
      }

      // If it's a Zod error (for example from fastify-type-provider-zod or
      // if you manually parse with Zod and throw).
      if (error instanceof ZodError) {
        statusCode = 400
        // You can parse the issues array to create a friendly message.
        errorMessage = 'Validation Error'
      } else if (error instanceof NotFoundError) {
        statusCode = error.statusCode || 404 // 404
        errorMessage = error.message || 'Not Found'
      }

      // If the error object contains a statusCode, prefer that
      if (error.statusCode && typeof error.statusCode === 'number') {
        statusCode = error.statusCode
      }

      // Build the response payload
      const payload = {
        statusCode,
        error: errorMessage,
        // Some additional details if you want
        details:
          error instanceof ZodError
            ? error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
              }))
            : error.validation // fastify's built-in validation errors, if any
              ? error.validation
              : undefined,
        ...(fastify.configuration.NODE_ENV !== 'production'
          ? { stack: error.stack }
          : {}),
        // Include a short message or fallback to the error message
        message: error.message || errorMessage,
      }

      // Optionally, log the full error (stack trace) for debugging
      request.log.error(error)

      // Send the response
      reply.status(statusCode).send(payload)
    })
  },
  { name: 'error' },
)
