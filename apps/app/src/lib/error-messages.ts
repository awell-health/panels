export interface UserFriendlyError {
  title: string
  message: string
  actionable: string
  retryable: boolean
  priority: 'low' | 'medium' | 'high'
}

export interface ErrorContext {
  isOnline?: boolean
  retryCount?: number
  apiEndpoint?: string
  userAction?: string
}

/**
 * Maps technical errors to user-friendly messages with actionable guidance
 */
export function mapErrorToUserFriendly(
  error: Error | string,
  context?: ErrorContext,
): UserFriendlyError {
  const errorMessage = error instanceof Error ? error.message : error
  const errorLower = errorMessage.toLowerCase()

  // Network connectivity issues
  if (errorLower.includes('network') || errorLower.includes('fetch')) {
    return {
      title: 'Connection Problem',
      message:
        context?.isOnline === false
          ? 'You appear to be offline. Please check your internet connection.'
          : 'Unable to connect to our servers. This might be a temporary network issue.',
      actionable:
        'Please check your internet connection and try again in a moment.',
      retryable: true,
      priority: 'high',
    }
  }

  // OpenAI API specific errors
  if (errorLower.includes('openai') || errorLower.includes('api')) {
    // Rate limiting
    if (
      errorLower.includes('rate') ||
      errorLower.includes('quota') ||
      errorLower.includes('429')
    ) {
      return {
        title: 'Service Temporarily Busy',
        message: 'Our AI service is currently experiencing high demand.',
        actionable:
          'Please wait a moment and try again. The service should be available shortly.',
        retryable: true,
        priority: 'medium',
      }
    }

    // Authentication issues
    if (
      errorLower.includes('auth') ||
      errorLower.includes('401') ||
      errorLower.includes('unauthorized')
    ) {
      return {
        title: 'Authentication Error',
        message: 'There was an issue with service authentication.',
        actionable:
          'Please refresh the page and try again. If the problem persists, contact support.',
        retryable: false,
        priority: 'high',
      }
    }

    // Server errors
    if (
      errorLower.includes('500') ||
      errorLower.includes('internal server error')
    ) {
      return {
        title: 'Service Temporarily Unavailable',
        message: 'Our AI service is experiencing technical difficulties.',
        actionable:
          "We're working to resolve this issue. Please try again in a few minutes.",
        retryable: true,
        priority: 'high',
      }
    }

    // Bad gateway / service unavailable
    if (
      errorLower.includes('502') ||
      errorLower.includes('503') ||
      errorLower.includes('504')
    ) {
      return {
        title: 'Service Temporarily Down',
        message: 'Our AI service is temporarily unavailable for maintenance.',
        actionable:
          'Please try again in a few minutes. The service should be restored shortly.',
        retryable: true,
        priority: 'medium',
      }
    }

    // Generic API error
    return {
      title: 'AI Service Error',
      message:
        'We encountered an issue while processing your request with our AI service.',
      actionable:
        'Please try again. If the problem continues, try rephrasing your message.',
      retryable: true,
      priority: 'medium',
    }
  }

  // Timeout errors
  if (errorLower.includes('timeout') || errorLower.includes('aborted')) {
    return {
      title: 'Request Timed Out',
      message: 'Your request took too long to process and was canceled.',
      actionable:
        'Please try again with a shorter message, or wait a moment before retrying.',
      retryable: true,
      priority: 'medium',
    }
  }

  // JSON parsing errors
  if (errorLower.includes('json') || errorLower.includes('parse')) {
    return {
      title: 'Response Processing Error',
      message: 'We received an unexpected response format from the AI service.',
      actionable:
        'Please try again. If this continues, the issue should resolve automatically.',
      retryable: true,
      priority: 'low',
    }
  }

  // CORS or permission errors
  if (errorLower.includes('cors') || errorLower.includes('blocked')) {
    return {
      title: 'Access Restricted',
      message:
        'Your browser or network is blocking the connection to our AI service.',
      actionable:
        'Please check your browser settings or try from a different network.',
      retryable: false,
      priority: 'high',
    }
  }

  // Generic fetch/request errors
  if (
    errorLower.includes('failed to fetch') ||
    errorLower.includes('request failed')
  ) {
    return {
      title: 'Connection Failed',
      message:
        'Unable to reach our AI service. This could be due to network issues.',
      actionable: 'Please check your internet connection and try again.',
      retryable: true,
      priority: 'high',
    }
  }

  // Handle retry context
  if (context?.retryCount && context.retryCount > 2) {
    return {
      title: 'Persistent Connection Issue',
      message: `We've tried ${context.retryCount} times but are still unable to process your request.`,
      actionable:
        'Please wait a few minutes before trying again, or refresh the page to start fresh.',
      retryable: false,
      priority: 'high',
    }
  }

  // Generic fallback error
  return {
    title: 'Something Went Wrong',
    message:
      'We encountered an unexpected error while processing your request.',
    actionable:
      'Please try again. If the problem persists, try refreshing the page.',
    retryable: true,
    priority: 'medium',
  }
}

/**
 * Gets a simplified error message for inline display
 */
export function getSimplifiedErrorMessage(
  error: Error | string,
  context?: ErrorContext,
): string {
  const userFriendlyError = mapErrorToUserFriendly(error, context)
  return userFriendlyError.message
}

/**
 * Gets actionable guidance for an error
 */
export function getErrorActionableMessage(
  error: Error | string,
  context?: ErrorContext,
): string {
  const userFriendlyError = mapErrorToUserFriendly(error, context)
  return userFriendlyError.actionable
}

/**
 * Determines if an error should allow retry
 */
export function isErrorRetryable(
  error: Error | string,
  context?: ErrorContext,
): boolean {
  const userFriendlyError = mapErrorToUserFriendly(error, context)
  return userFriendlyError.retryable
}

/**
 * Gets the priority level of an error for UI treatment
 */
export function getErrorPriority(
  error: Error | string,
  context?: ErrorContext,
): 'low' | 'medium' | 'high' {
  const userFriendlyError = mapErrorToUserFriendly(error, context)
  return userFriendlyError.priority
}

/**
 * Enhanced error message for conversation context
 */
export function getConversationErrorMessage(
  error: Error | string,
  context?: ErrorContext & { messageContent?: string },
): string {
  const userFriendlyError = mapErrorToUserFriendly(error, context)

  // Add context-specific guidance
  let message = userFriendlyError.message

  if (context?.messageContent && context.messageContent.length > 1000) {
    message += ' Long messages may take more time to process.'
  }

  if (context?.retryCount === 1) {
    message += ' This was your first retry.'
  } else if (context?.retryCount && context.retryCount > 1) {
    message += ` This was retry attempt ${context.retryCount}.`
  }

  return message
}
