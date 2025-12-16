export interface SafeErrorOptions {
  cause?: unknown;
  code?: string;
}

export class SafeError extends Error {
  override name = 'SafeError';
  readonly cause?: unknown;
  readonly code?: string;

  constructor(message: string, options?: SafeErrorOptions) {
    super(message);
    this.cause = options?.cause;
    this.code = options?.code;
    Object.setPrototypeOf(this, SafeError.prototype);
  }

  static from(value: unknown): SafeError {
    if (value instanceof SafeError) {
      return value;
    }
    
    if (value instanceof Error) {
      return new SafeError(value.message, { cause: value });
    }
    
    if (typeof value === 'string') {
      return new SafeError(value);
    }
    
    let message: string;
    try {
      message = String(value);
    } catch {
      message = 'Unknown error';
    }
    
    return new SafeError(message, { cause: value });
  }
}
