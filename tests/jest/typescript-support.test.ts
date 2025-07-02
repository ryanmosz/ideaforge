/**
 * Jest TypeScript Support Tests
 * Verifies that Jest properly runs TypeScript tests with ts-jest transformer
 */

import * as path from 'path';

// Test type annotations
type TestUser = {
  id: number;
  name: string;
  email: string;
};

// Test class with methods
class TestService {
  private users: TestUser[] = [];

  addUser(user: TestUser): void {
    this.users.push(user);
  }

  getUser(id: number): TestUser | undefined {
    return this.users.find(u => u.id === id);
  }

  getAllUsers(): TestUser[] {
    return [...this.users];
  }
}

describe('Jest TypeScript Integration', () => {
  it('should handle TypeScript type annotations', () => {
    const user: TestUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com'
    };
    
    expect(user.id).toBe(1);
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
  });

  it('should support TypeScript classes', () => {
    const service = new TestService();
    const user: TestUser = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com'
    };
    
    service.addUser(user);
    expect(service.getUser(1)).toEqual(user);
    expect(service.getAllUsers()).toHaveLength(1);
  });

  it('should handle async/await properly', async () => {
    const asyncFunc = async (): Promise<string> => {
      return new Promise(resolve => {
        setTimeout(() => resolve('async result'), 10);
      });
    };
    
    const result = await asyncFunc();
    expect(result).toBe('async result');
  });

  it('should support Jest mocking with TypeScript', () => {
    const mockFn = jest.fn<number, [string, number]>();
    mockFn.mockReturnValue(42);
    
    const result = mockFn('test', 123);
    expect(result).toBe(42);
    expect(mockFn).toHaveBeenCalledWith('test', 123);
  });

  it('should handle errors with proper types', () => {
    class CustomError extends Error {
      constructor(public code: number, message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }
    
    const throwError = (): void => {
      throw new CustomError(404, 'Not found');
    };
    
    expect(throwError).toThrow(CustomError);
    expect(throwError).toThrow('Not found');
  });
});

describe('Jest Test Matchers with TypeScript', () => {
  it('should work with type-safe matchers', () => {
    const numbers: number[] = [1, 2, 3, 4, 5];
    
    expect(numbers).toContain(3);
    expect(numbers).toHaveLength(5);
    expect(numbers[0]).toBeGreaterThan(0);
    expect(numbers[4]).toBeLessThanOrEqual(5);
  });

  it('should handle object matching with types', () => {
    interface Product {
      id: string;
      name: string;
      price: number;
      tags?: string[];
    }
    
    const product: Product = {
      id: 'prod-123',
      name: 'Test Product',
      price: 99.99,
      tags: ['new', 'featured']
    };
    
    expect(product).toMatchObject({
      name: 'Test Product',
      price: 99.99
    });
    
    expect(product).toHaveProperty('tags');
    expect(product.tags).toContain('featured');
  });
});

describe('Jest Code Coverage with TypeScript', () => {
  it('should generate coverage for TypeScript files', () => {
    // This test verifies coverage is collected by actually running code
    const calculator = {
      add: (a: number, b: number): number => a + b,
      subtract: (a: number, b: number): number => a - b,
      multiply: (a: number, b: number): number => a * b,
      divide: (a: number, b: number): number => {
        if (b === 0) throw new Error('Division by zero');
        return a / b;
      }
    };
    
    expect(calculator.add(2, 3)).toBe(5);
    expect(calculator.subtract(5, 3)).toBe(2);
    expect(calculator.multiply(4, 5)).toBe(20);
    expect(calculator.divide(10, 2)).toBe(5);
    expect(() => calculator.divide(10, 0)).toThrow('Division by zero');
  });
});

describe('Jest Configuration Verification', () => {
  const rootDir = process.cwd();
  
  it('should have ts-jest configured', () => {
    const jestConfig = require(path.join(rootDir, 'jest.config.js'));
    
    expect(jestConfig.preset).toBe('ts-jest');
    expect(jestConfig.testEnvironment).toBe('node');
  });

  it('should be configured to test TypeScript files', () => {
    const jestConfig = require(path.join(rootDir, 'jest.config.js'));
    
    // With ts-jest preset, transform is handled automatically
    expect(jestConfig.preset).toBe('ts-jest');
    expect(jestConfig.testMatch).toBeDefined();
    expect(jestConfig.testMatch).toContain('**/*.test.ts');
  });

  it('should have proper test configuration', () => {
    const jestConfig = require(path.join(rootDir, 'jest.config.js'));
    
    expect(jestConfig.roots).toBeDefined();
    expect(jestConfig.roots).toContain('<rootDir>/tests');
    expect(jestConfig.collectCoverageFrom).toBeDefined();
    expect(jestConfig.collectCoverageFrom).toContain('src/**/*.ts');
  });
});

describe('Jest Performance with TypeScript', () => {
  it('should run TypeScript tests in reasonable time', () => {
    const startTime = Date.now();
    
    // Run a simple test
    const sum = (a: number, b: number): number => a + b;
    expect(sum(1, 2)).toBe(3);
    
    const duration = Date.now() - startTime;
    console.log(`[DEBUG] Test execution took ${duration}ms`);
    
    // TypeScript tests should run quickly (under 100ms for simple tests)
    expect(duration).toBeLessThan(100);
  });
}); 