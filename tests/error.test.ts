import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { SafeError } from '../src/error';

describe('SafeError', () => {
  /**
   * **Feature: go-style-error-handling, Property 5: 非 Error 值转换为 SafeError 并保留原值**
   * *For any* non-Error value V that is thrown or rejected, the resulting error 
   * SHALL be a SafeError instance with `cause` property equal to V.
   * **Validates: Requirements 1.3, 2.3, 3.3**
   */
  it('Property 5: non-Error values are converted to SafeError with original value preserved in cause', () => {
    fc.assert(
      fc.property(
        fc.anything().filter((v) => !(v instanceof Error)),
        (value) => {
          const safeError = SafeError.from(value);
          
          // Must be a SafeError instance
          expect(safeError).toBeInstanceOf(SafeError);
          
          // For non-string values, cause should preserve the original value
          if (typeof value !== 'string') {
            expect(safeError.cause).toBe(value);
          }
          
          // For string values, message should be the string itself
          if (typeof value === 'string') {
            expect(safeError.message).toBe(value);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: go-style-error-handling, Property 6: 错误类型继承关系**
   * *For any* error returned by safeAwait or safeCall, the error SHALL be 
   * an instance of both SafeError and Error.
   * **Validates: Requirements 3.3**
   */
  it('Property 6: SafeError is an instance of both SafeError and Error', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        (value) => {
          const safeError = SafeError.from(value);
          
          // Must be instance of SafeError
          expect(safeError).toBeInstanceOf(SafeError);
          
          // Must be instance of Error (inheritance)
          expect(safeError).toBeInstanceOf(Error);
          
          // Must have name property set to 'SafeError'
          expect(safeError.name).toBe('SafeError');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional unit tests for SafeError.from() edge cases
  describe('SafeError.from()', () => {
    it('should return the same SafeError instance if already a SafeError', () => {
      const original = new SafeError('test error');
      const result = SafeError.from(original);
      expect(result).toBe(original);
    });

    it('should convert Error to SafeError with cause', () => {
      const original = new Error('original error');
      const result = SafeError.from(original);
      
      expect(result).toBeInstanceOf(SafeError);
      expect(result.message).toBe('original error');
      expect(result.cause).toBe(original);
    });

    it('should convert string to SafeError with message', () => {
      const result = SafeError.from('string error');
      
      expect(result).toBeInstanceOf(SafeError);
      expect(result.message).toBe('string error');
      expect(result.cause).toBeUndefined();
    });

    it('should convert number to SafeError with stringified message and cause', () => {
      const result = SafeError.from(42);
      
      expect(result).toBeInstanceOf(SafeError);
      expect(result.message).toBe('42');
      expect(result.cause).toBe(42);
    });

    it('should convert object to SafeError with stringified message and cause', () => {
      const obj = { foo: 'bar' };
      const result = SafeError.from(obj);
      
      expect(result).toBeInstanceOf(SafeError);
      expect(result.message).toBe('[object Object]');
      expect(result.cause).toBe(obj);
    });
  });
});
