export type {
  SuccessResult,
  ErrorResult,
  SafeResult,
  ErrorTransformer,
} from './types';

export { SafeError } from './error';
export type { SafeErrorOptions } from './error';

export { to, sync, cb } from './core';
export { to as go } from './core';
export { to as safeAwait } from './core';
export { sync as safeCall } from './core';

export { or, map, pipe, format, parse } from './utils';
export { or as unwrapOr } from './utils';
export { pipe as safePipe } from './utils';
