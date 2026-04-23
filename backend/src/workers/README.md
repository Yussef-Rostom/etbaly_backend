w# Workers Module Architecture

This directory follows a modular-driven architecture pattern similar to the server modules structure.

## Structure

```
workers/
├── ai/
│   ├── handlers/
│   │   └── aiWorkerHandler.ts       # Entry point for AI worker
│   ├── services/
│   │   └── aiWorkerService.ts       # Business logic (real + mock)
│   └── index.ts                      # Worker registration
├── slicing/
│   ├── handlers/
│   │   └── slicingWorkerHandler.ts  # Entry point for slicing worker
│   ├── services/
│   │   └── slicingWorkerService.ts  # Business logic (real + mock)
│   └── index.ts                      # Worker registration
├── printing/
│   ├── handlers/
│   │   └── printingWorkerHandler.ts # Entry point for printing worker
│   ├── services/
│   │   └── printingWorkerService.ts # Business logic (real + mock)
│   └── index.ts                      # Worker registration
├── mocks/                            # Legacy mock workers (deprecated)
├── registry.ts                       # Worker registration utilities
└── index.ts                          # Main worker initialization
```

## Architecture Layers

### 1. Handler Layer (`handlers/`)
- Entry point for worker job processing
- Delegates to service layer
- Minimal logic, acts as a thin controller

### 2. Service Layer (`services/`)
- Contains all business logic
- Implements both real and mock processing
- Handles fallback mechanism
- Reusable across different contexts

### 3. Registration Layer (`index.ts`)
- Registers worker with BullMQ
- Configures concurrency and queue name
- Wires handler to queue

## Automatic Fallback Mechanism

Each worker service implements three methods:

1. **`processReal(job)`** - Real implementation
2. **`processMock(job)`** - Mock/fallback implementation
3. **`process(job)`** - Main handler with automatic fallback logic

### Behavior:
- Always tries the real implementation first
- If real implementation fails (throws error), automatically falls back to mock
- No configuration needed - fallback is automatic

## Adding a New Worker

1. Create module directory: `src/workers/myworker/`
2. Create handler: `handlers/myWorkerHandler.ts`
3. Create service: `services/myWorkerService.ts`
4. Create index: `index.ts`
5. Register in `src/workers/index.ts`

Example service structure:
```typescript
export class MyWorkerService {
  static async processReal(job: Job<MyJobData>) {
    // Real implementation
  }

  static async processMock(job: Job<MyJobData>) {
    // Mock implementation
  }

  static async process(job: Job<MyJobData>) {
    const { correlationId } = job.data;
    try {
      return await this.processReal(job);
    } catch (error) {
      console.warn(`[${correlationId}] ⚠️  Real handler failed, falling back to mock`);
      return this.processMock(job);
    }
  }
}
```

## Benefits

- **Separation of Concerns**: Handler, service, and registration are separate
- **Testability**: Services can be tested independently
- **Reusability**: Service logic can be reused
- **Maintainability**: Clear structure, easy to navigate
- **Scalability**: Easy to add new workers following the same pattern
- **Fallback Safety**: Automatic fallback to mock on failure
