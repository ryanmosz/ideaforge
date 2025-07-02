# AI-First Coding Standards - SnapConnect

## 🎯 Core Principle
We build for AI collaboration. Every file, function, and module should be immediately understandable to both humans and AI assistants.

## 📏 File Structure Rules

### 1. 500-Line Maximum
- **Hard limit**: No file exceeds 500 lines
- **Target**: Most files should be 200-300 lines
- **Split strategy**: When approaching limit, split by:
  - Feature (user-related, snap-related)
  - Responsibility (UI, logic, data)
  - Component hierarchy

### 2. File Headers (Required)
Every file MUST start with:
```typescript
/**
 * @file [filename] - [Primary purpose]
 * @description [2-3 sentences explaining what this file contains and why it exists]
 * @module [module-name]
 */
```

Example:
```typescript
/**
 * @file CameraScreen.tsx - Main camera interface for capturing snaps
 * @description Handles camera permissions, photo capture, and preview functionality.
 * Integrates with Supabase for immediate upload after capture.
 * @module screens/camera
 */
```

## 📝 Function Documentation

### JSDoc/TSDoc Requirements
Every function needs:
```typescript
/**
 * Brief description of what the function does
 * 
 * @param {Type} paramName - Description of parameter
 * @returns {Type} Description of return value
 * @throws {ErrorType} When this error occurs
 * @example
 * const result = functionName(param1, param2);
 */
```

Example:
```typescript
/**
 * Captures a photo and uploads it to Supabase storage
 * 
 * @param {CameraRef} cameraRef - Reference to the camera component
 * @param {string} userId - ID of the current user
 * @returns {Promise<string>} URL of the uploaded photo
 * @throws {CameraError} When camera permissions are denied
 * @throws {UploadError} When upload to Supabase fails
 * @example
 * const photoUrl = await captureAndUpload(cameraRef, user.id);
 */
export async function captureAndUpload(
  cameraRef: CameraRef,
  userId: string
): Promise<string> {
  // Implementation
}
```

## 🏗️ Modular Architecture

### Component Structure
```
/components
  /camera
    - CameraView.tsx (< 200 lines - UI only)
    - CameraControls.tsx (< 150 lines - buttons/controls)
    - useCameraPermissions.ts (< 100 lines - permission logic)
    - cameraHelpers.ts (< 200 lines - capture logic)
```

### Feature Structure
```
/features
  /snaps
    - snapService.ts (< 300 lines - business logic)
    - snapTypes.ts (< 100 lines - TypeScript types)
    - useSnaps.ts (< 200 lines - React hooks)
    - snapStorage.ts (< 200 lines - Supabase integration)
```

## 🎨 Functional Programming Patterns

### Preferred Patterns
```typescript
// ✅ Pure functions
export function calculateSnapExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + 10000);
}

// ✅ Function composition
const processSnap = flow(
  validateSnapData,
  addExpiryTime,
  uploadToStorage,
  createDatabaseRecord
);

// ✅ Immutable updates
const updateUser = (user: User, updates: Partial<User>): User => ({
  ...user,
  ...updates,
  updatedAt: new Date()
});
```

### Avoid
```typescript
// ❌ Classes (except when required by libraries)
class UserService { ... }

// ❌ Mutations
function addFriend(user: User, friendId: string) {
  user.friends.push(friendId); // Mutates original
}

// ❌ Side effects in pure functions
function calculatePrice(amount: number) {
  console.log('Calculating...'); // Side effect
  return amount * 1.1;
}
```

## 📁 File Naming Conventions

### Components
- `PascalCase.tsx` for React components
- `useCamelCase.ts` for hooks
- `camelCase.ts` for utilities
- `camelCase.types.ts` for type definitions

### Organization
```
/screens
  - CameraScreen.tsx
  - LoginScreen.tsx
  - InboxScreen.tsx

/components
  /common
    - Button.tsx
    - LoadingSpinner.tsx
  /camera
    - CameraView.tsx
    - CameraControls.tsx

/hooks
  - useAuth.ts
  - useCamera.ts
  - useSnaps.ts

/utils
  - dateHelpers.ts
  - imageProcessing.ts
  - validation.ts

/types
  - user.types.ts
  - snap.types.ts
  - api.types.ts
```

## 🚀 Implementation Checklist

When creating a new file:
- [ ] Add file header with @file, @description, @module
- [ ] Keep under 500 lines (target 200-300)
- [ ] Document every exported function with JSDoc
- [ ] Use functional patterns (no classes)
- [ ] Create pure functions where possible
- [ ] Split large files before they hit limits
- [ ] Use descriptive names (no abbreviations)

## 📊 Benefits

1. **AI Understanding**: AI can quickly grasp file purpose and function behavior
2. **Maintainability**: Small files are easier to understand and modify
3. **Testing**: Pure functions are simple to test
4. **Onboarding**: New developers understand the codebase faster
5. **Debugging**: Clear documentation helps identify issues quickly

---

*These standards ensure our codebase remains accessible to both human developers and AI assistants throughout the project lifecycle.* 