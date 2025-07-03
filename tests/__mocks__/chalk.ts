// Mock implementation of chalk for testing
const chalk = {
  blue: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  cyan: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
  bold: jest.fn((text: string) => text)
};

// Add nested properties
(chalk as any).bold = Object.assign(jest.fn((text: string) => text), {
  green: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text)
});

export default chalk;

// Named exports
export const blue = chalk.blue;
export const green = chalk.green;
export const red = chalk.red;
export const yellow = chalk.yellow;
export const cyan = chalk.cyan;
export const gray = chalk.gray;
export const bold = chalk.bold; 