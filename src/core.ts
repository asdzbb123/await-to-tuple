import { SafeError } from './error';
import type { SafeResult, ErrorTransformer } from './types';

export async function to<T, E = SafeError>(
  promise: Promise<T>,
  errorTransformer?: ErrorTransformer<E>
): Promise<SafeResult<T, E>> {
  try {
    const data = await promise;
    return [true, null, data];
  } catch (err) {
    const error = errorTransformer 
      ? errorTransformer(err) 
      : SafeError.from(err) as E;
    return [false, error, null];
  }
}

export function sync<T, E = SafeError>(
  fn: () => T,
  errorTransformer?: ErrorTransformer<E>
): SafeResult<T, E> {
  try {
    const result = fn();
    return [true, null, result];
  } catch (err) {
    const error = errorTransformer 
      ? errorTransformer(err) 
      : SafeError.from(err) as E;
    return [false, error, null];
  }
}

export function cb<T, E = SafeError>(
  fn: (callback: (err: unknown, result?: T) => void) => void,
  errorTransformer?: ErrorTransformer<E>
): Promise<SafeResult<T, E>> {
  return new Promise((resolve) => {
    try {
      fn((err, result) => {
        if (err) {
          const error = errorTransformer 
            ? errorTransformer(err) 
            : SafeError.from(err) as E;
          resolve([false, error, null]);
        } else {
          resolve([true, null, result as T]);
        }
      });
    } catch (err) {
      const error = errorTransformer 
        ? errorTransformer(err) 
        : SafeError.from(err) as E;
      resolve([false, error, null]);
    }
  });
}
