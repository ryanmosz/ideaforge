describe('Sample Test Suite', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle strings correctly', () => {
    const greeting = 'Hello, IdeaForge!';
    expect(greeting).toContain('IdeaForge');
  });
}); 