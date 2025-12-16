import type { SafeResult } from './types';
import { SafeError } from './error';

export function or<T, E>(result: SafeResult<T, E>, defaultValue: T): T {
  const [ok, , data] = result;
  return ok ? data : defaultValue;
}

export function map<T, U, E>(
  result: SafeResult<T, E>,
  fn: (data: T) => U
): SafeResult<U, E> {
  const [ok, err, data] = result;
  if (ok) {
    return [true, null, fn(data)];
  }
  return [false, err, null];
}

export async function pipe<T, E = SafeError>(
  initial: T,
  ...fns: Array<(value: unknown) => Promise<unknown>>
): Promise<SafeResult<T, E>> {
  let current: unknown = initial;
  
  for (const fn of fns) {
    try {
      current = await fn(current);
    } catch (err) {
      const error = SafeError.from(err) as E;
      return [false, error, null];
    }
  }
  
  return [true, null, current as T];
}

export function format<T, E extends Error>(result: SafeResult<T, E>): string {
  const [ok, err, data] = result;
  if (ok) {
    return `[OK] data: ${JSON.stringify(data)}`;
  }
  return `[ERR] error: ${err.message}`;
}

export function parse<T, E = SafeError>(str: string): SafeResult<T, E> {
  if (str.startsWith('[OK] data: ')) {
    const dataStr = str.slice('[OK] data: '.length);
    const data = JSON.parse(dataStr) as T;
    return [true, null, data];
  }
  
  if (str.startsWith('[ERR] error: ')) {
    const message = str.slice('[ERR] error: '.length);
    const error = new SafeError(message) as E;
    return [false, error, null];
  }
  
  throw new Error(`Invalid SafeResult format: ${str}`);
}

export { or as unwrapOr };
export { pipe as safePipe };
