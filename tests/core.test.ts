import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { to, sync, cb } from '../src/core';
import { SafeError } from '../src/error';

describe('to()', () => {
  /**
   * **Feature: go-style-error-handling, Property 1: safeAwait 成功路径保持数据完整性**
   * *For any* value V, when `Promise.resolve(V)` is passed to safeAwait, 
   * the result SHALL be `[true, null, V]` where V is strictly equal to the original value.
   * **Validates: Requirements 1.1**
   */
  it('Property 1: safeAwait success path preserves data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(fc.anything(), async (value) => {
        const [ok, err, data] = await to(Promise.resolve(value));
        
        expect(ok).toBe(true);
        expect(err).toBeNull();
        expect(Object.is(data, value)).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: go-style-error-handling, Property 2: safeAwait 失败路径捕获错误**
   * *For any* error E, when `Promise.reject(E)` is passed to safeAwait, 
   * the result SHALL be `[false, err, null]` where err contains information about E.
   * **Validates: Requirements 1.2**
   */
  it('Property 2: safeAwait failure path captures errors', async () => {
    await fc.assert(
      fc.asyncProperty(fc.anything(), async (errorValue) => {
        const [ok, err, data] = await to(Promise.reject(errorValue));
        
        expect(ok).toBe(false);
        expect(err).toBeInstanceOf(SafeError);
        expect(data).toBeNull();
        
        // For Error instances, message should be preserved
        if (errorValue instanceof Error) {
          expect(err?.message).toBe(errorValue.message);
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});


describe('sync()', () => {
  /**
   * **Feature: go-style-error-handling, Property 3: safeCall 成功路径保持数据完整性**
   * *For any* function that returns value V without throwing, safeCall SHALL return 
   * `[true, null, V]` where V is strictly equal to the original return value.
   * **Validates: Requirements 2.1**
   */
  it('Property 3: safeCall success path preserves data integrity', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const [ok, err, data] = sync(() => value);
        
        expect(ok).toBe(true);
        expect(err).toBeNull();
        expect(Object.is(data, value)).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: go-style-error-handling, Property 4: safeCall 失败路径捕获错误**
   * *For any* function that throws error E, safeCall SHALL return 
   * `[false, err, null]` where err contains information about E.
   * **Validates: Requirements 2.2**
   */
  it('Property 4: safeCall failure path captures errors', () => {
    fc.assert(
      fc.property(fc.anything(), (errorValue) => {
        const [ok, err, data] = sync(() => {
          throw errorValue;
        });
        
        expect(ok).toBe(false);
        expect(err).toBeInstanceOf(SafeError);
        expect(data).toBeNull();
        
        // For Error instances, message should be preserved
        if (errorValue instanceof Error) {
          expect(err?.message).toBe(errorValue.message);
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});


describe('Custom Error Transformer', () => {
  /**
   * **Feature: go-style-error-handling, Property 7: 自定义错误转换器被调用**
   * *For any* error E and transformer function T, when safeAwait or safeCall catches E 
   * with transformer T, the resulting error SHALL be T(E).
   * **Validates: Requirements 4.1**
   */
  it('Property 7: custom error transformer is called for to()', async () => {
    interface CustomError {
      type: 'custom';
      original: unknown;
    }
    
    const transformer = (err: unknown): CustomError => ({
      type: 'custom',
      original: err,
    });

    await fc.assert(
      fc.asyncProperty(fc.anything(), async (errorValue) => {
        const [ok, err, data] = await to<never, CustomError>(
          Promise.reject(errorValue),
          transformer
        );
        
        expect(ok).toBe(false);
        expect(data).toBeNull();
        expect(err?.type).toBe('custom');
        expect(err?.original).toBe(errorValue);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: custom error transformer is called for sync()', () => {
    interface CustomError {
      type: 'custom';
      original: unknown;
    }
    
    const transformer = (err: unknown): CustomError => ({
      type: 'custom',
      original: err,
    });

    fc.assert(
      fc.property(fc.anything(), (errorValue) => {
        const [ok, err, data] = sync<never, CustomError>(
          () => { throw errorValue; },
          transformer
        );
        
        expect(ok).toBe(false);
        expect(data).toBeNull();
        expect(err?.type).toBe('custom');
        expect(err?.original).toBe(errorValue);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: custom error transformer is called for cb()', async () => {
    interface CustomError {
      type: 'custom';
      original: unknown;
    }
    
    const transformer = (err: unknown): CustomError => ({
      type: 'custom',
      original: err,
    });

    // Filter out falsy values since Node.js callback convention treats
    // null/undefined as "no error" (success case)
    await fc.assert(
      fc.asyncProperty(
        fc.anything().filter((v) => Boolean(v)),
        async (errorValue) => {
          const [ok, err, data] = await cb<never, CustomError>(
            (done) => done(errorValue),
            transformer
          );
          
          expect(ok).toBe(false);
          expect(data).toBeNull();
          expect(err?.type).toBe('custom');
          expect(err?.original).toBe(errorValue);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
