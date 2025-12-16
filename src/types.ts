import type { SafeError } from './error';

export type SuccessResult<T> = [true, null, T];

export type ErrorResult<E = SafeError> = [false, E, null];

export type SafeResult<T, E = SafeError> = SuccessResult<T> | ErrorResult<E>;

export type ErrorTransformer<E> = (err: unknown) => E;
