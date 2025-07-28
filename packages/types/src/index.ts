import z from 'zod'

export const OperationResultSchema = z.object({
  success: z.boolean(),
})
export const ErrorSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  details: z.string().optional(),
  stack: z.string().optional(),
  message: z.string(),
})
export const IdParamSchema = z.object({
  id: z.string(),
})

export type OperationResult = z.infer<typeof OperationResultSchema>
export type ErrorType = z.infer<typeof ErrorSchema>
export type IdParam = z.infer<typeof IdParamSchema>
