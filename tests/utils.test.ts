import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { or, map, pipe, format, parse } from '../src/utils';
import { SafeError } from '../src/error';
import type { SafeResult, SuccessResult, ErrorResult } from '../src/types';

describe('or()', () => {
  /**
   * **Feature: go-style-error-handling, Property 8: unwrapOr 返回正确值**
   * *For any* SafeResult R and default value D, unwrapOr(R, D) SHALL return 
   * R[2] if R[0] is true, otherwise D.
   * **Validates: Requirements 5.1**
   */
  it('Property 8: unwrapOr returns correct value', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        fc.anything(),
        fc.boolean(),
        (value, defaultValue, isSuccess) => {
          let result: SafeResult<unknown, SafeError>;
          
          if (isSuccess) {
            result = [true, null, value] as SuccessResult<unknown>;
          } else {
            result = [false, new SafeError('test error'), null] as ErrorResult<SafeError>;
          }
          
          const output = or(result, defaultValue);
          
          if (isSuccess) {
            expect(Object.is(output, value)).toBe(true);
          } else {
            expect(Object.is(output, defaultValue)).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('map()', () => {
  /**
   * **Feature: go-style-error-handling, Property 9: map 仅转换成功结果**
   * *For any* SafeResult R and function F, map(R, F) SHALL return 
   * `[true, null, F(R[2])]` if R[0] is true, otherwise return R unchanged.
   * **Validates: Requirements 5.2**
   */
  it('Property 9: map only transforms success results', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.boolean(),
        (value, isSuccess) => {
          const transformer = (x: number) => x * 2;
          let result: SafeResult<number, SafeError>;
          
          if (isSuccess) {
            result = [true, null, value] as SuccessResult<number>;
          } else {
            result = [false, new SafeError('test error'), null] as ErrorResult<SafeError>;
          }
          
          const mapped = map(result, transformer);
          
          if (isSuccess) {
            expect(mapped[0]).toBe(true);
            expect(mapped[1]).toBeNull();
            expect(mapped[2]).toBe(value * 2);
          } else {
            expect(mapped[0]).toBe(false);
            expect(mapped[1]).toBeInstanceOf(SafeError);
            expect(mapped[2]).toBeNull();
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('pipe()', () => {
  /**
   * **Feature: go-style-error-handling, Property 10: safePipe 在首个错误处短路**
   * *For any* sequence of async functions where function at index N fails, 
   * safePipe SHALL return the error from function N and not execute functions after N.
   * **Validates: Requirements 5.3**
   */
  it('Property 10: safePipe short-circuits on first error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 1, max: 5 }),
        async (failAtIndex, totalFunctions) => {
          // Ensure failAtIndex is within bounds
          const actualFailIndex = Math.min(failAtIndex, totalFunctions - 1);
          
          const callOrder: number[] = [];
          const errorMessage = `Error at index ${actualFailIndex}`;
          
          // Create functions that track call order
          const fns = Array.from({ length: totalFunctions }, (_, i) => {
            return async (value: number): Promise<number> => {
              callOrder.push(i);
              if (i === actualFailIndex) {
                throw new Error(errorMessage);
              }
              return value + 1;
            };
          });
          
          const [ok, err] = await pipe(0, ...fns);
          
          // Should fail
          expect(ok).toBe(false);
          expect(err).toBeInstanceOf(SafeError);
          expect(err?.message).toBe(errorMessage);
          
          // Should have called functions 0 through actualFailIndex
          expect(callOrder).toHaveLength(actualFailIndex + 1);
          for (let i = 0; i <= actualFailIndex; i++) {
            expect(callOrder[i]).toBe(i);
          }
          
          // Should NOT have called functions after actualFailIndex
          for (let i = actualFailIndex + 1; i < totalFunctions; i++) {
            expect(callOrder).not.toContain(i);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10: safePipe returns final result when all succeed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer(),
        fc.integer({ min: 1, max: 5 }),
        async (initial, numFunctions) => {
          const fns = Array.from({ length: numFunctions }, () => {
            return async (value: number): Promise<number> => value + 1;
          });
          
          const [ok, err, data] = await pipe(initial, ...fns);
          
          expect(ok).toBe(true);
          expect(err).toBeNull();
          expect(data).toBe(initial + numFunctions);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('format() and parse()', () => {
  /**
   * **Feature: go-style-error-handling, Property 11: format/parse 往返一致性**
   * *For any* SafeResult R, `parse(format(R))` SHALL produce a SafeResult with 
   * the same ok value and equivalent data/error information.
   * **Validates: Requirements 6.1, 6.2, 6.3**
   */
  it('Property 11: format/parse round-trip consistency', () => {
    // Test with JSON-serializable values (primitives, arrays, objects)
    const jsonSerializable = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.double({ noNaN: true, noDefaultInfinity: true }),
      fc.boolean(),
      fc.constant(null),
      fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean())),
      fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean()))
    );

    fc.assert(
      fc.property(
        jsonSerializable,
        fc.boolean(),
        fc.string({ minLength: 1 }),
        (value, isSuccess, errorMessage) => {
          let result: SafeResult<unknown, SafeError>;
          
          if (isSuccess) {
            result = [true, null, value] as SuccessResult<unknown>;
          } else {
            result = [false, new SafeError(errorMessage), null] as ErrorResult<SafeError>;
          }
          
          const formatted = format(result);
          const parsed = parse(formatted);
          
          // ok value should match
          expect(parsed[0]).toBe(result[0]);
          
          if (isSuccess) {
            // For success, data should be deeply equal (JSON round-trip)
            expect(parsed[1]).toBeNull();
            expect(parsed[2]).toEqual(value);
          } else {
            // For error, error message should match
            expect(parsed[2]).toBeNull();
            expect(parsed[1]).toBeInstanceOf(SafeError);
            expect((parsed[1] as SafeError).message).toBe(errorMessage);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
