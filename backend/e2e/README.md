# E2E Tests

End-to-end tests that run against a live server.

## Prerequisites

Before running E2E tests, you must have the following services running:

1. **Backend Server** - `npm run dev` (running on http://localhost:5000)
2. **MongoDB** - Running on localhost:27017
3. **Redis** - Running on localhost:6379
4. **Slicing Worker Server** - Running on localhost:8080
5. **Admin Token** - Set in `.env` file

## Setup

### 1. Start All Services

```bash
# Terminal 1: Start MongoDB (if not running)
mongod

# Terminal 2: Start Redis (if not running)
redis-server

# Terminal 3: Start Slicing Worker
cd tools/slicing-worker
python app.py

# Terminal 4: Start Backend Server
npm run dev
```

### 2. Set Environment Variables

Make sure `.env` file has:

```bash
ADMIN_ACCESS_TOKEN=your_admin_token_here
API_BASE_URL=http://localhost:3000  # Optional, defaults to this
```

### 3. Prepare Test Files

Ensure these files exist:

- `tmp/3d/3dMock.stl` - Valid STL file
- `tmp/image/imageMock.png` - Valid image file

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test

```bash
# Admin workflow - Add product
npm run test:e2e:add-product

# AI workflow - Generate design using AI
npm run test:e2e:ai-design
```

### Run with Verbose Output

```bash
npm run test:e2e -- --verbose
```

## Test Workflows

### 1. Admin Product Creation (add-product.e2e.test.ts)

Tests the complete admin workflow for adding a pre-designed product:
1. Upload STL file
2. Create design record
3. Execute slicing
4. Wait for slicing completion
5. Upload product images (3 images)
6. Create product
7. Verify product visibility
8. Get product details

**Duration**: ~30-60 seconds
**Run**: `npm run test:e2e:add-product`

### 2. AI Custom Design (ai-custom-design.e2e.test.ts)

Tests the complete AI-powered custom design workflow:
1. Generate image from text prompt (text-to-image AI)
2. Wait for image generation
3. Convert image to 3D model (image-to-3D AI)
4. Wait for 3D model generation
5. Execute slicing with custom parameters
6. Wait for slicing completion
7. Add to cart
8. Checkout and create order
9. Admin gets pending printing jobs
10. Admin approves printing job
11. Queue printing job
12. Start printing
13. Verify order status

**Duration**: ~2-5 minutes (depends on AI service response time)
**Run**: `npm run test:e2e:ai-design`
**Note**: Requires Lightning AI services to be configured

## Prerequisites by Test

### All Tests Require:
- Backend Server running on http://localhost:5000
- MongoDB running
- Redis running
- ADMIN_ACCESS_TOKEN in .env

### add-product.e2e.test.ts Additionally Requires:
- Slicing Worker running on localhost:8080
- Test files: `tmp/3d/3dMock.stl`, `tmp/image/imageMock.png`

### ai-custom-design.e2e.test.ts Additionally Requires:
- Slicing Worker running on localhost:8080
- Lightning AI text-to-image service configured
- Lightning AI image-to-3D service configured
- AI worker processes running

## Advantages of E2E Tests

✅ **Simple**: No mocking, no complex setup
✅ **Real**: Tests actual server behavior
✅ **Fast**: No need to start/stop services per test
✅ **Reliable**: Tests what users actually experience
✅ **Easy to Debug**: Just check server logs

## Troubleshooting

### Server Not Running

**Error**: `ECONNREFUSED`

**Solution**: Start the backend server with `npm run dev`

### Authentication Error

**Error**: `401 Unauthorized`

**Solution**: Check `ADMIN_ACCESS_TOKEN` in `.env` file

### Slicing Fails

**Error**: Slicing job status is "Failed"

**Solution**: 
1. Check slicing worker is running: `curl http://localhost:8080/health`
2. Check STL file is valid: `file tmp/3d/3dMock.stl`
3. Check worker logs for errors

### Test Timeout

**Error**: Test exceeds timeout

**Solution**: Increase timeout in test file or check if services are slow

## CI/CD Integration

For CI/CD, you need to start services before running tests:

```yaml
# .github/workflows/e2e.yml
- name: Start Services
  run: |
    docker-compose up -d mongodb redis
    cd tools/slicing-worker && python app.py &
    npm run dev &
    sleep 10  # Wait for services to be ready

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    ADMIN_ACCESS_TOKEN: ${{ secrets.ADMIN_ACCESS_TOKEN }}
```

## Best Practices

1. **Keep Server Running**: Don't restart server between tests
2. **Clean State**: Tests should clean up after themselves
3. **Independent Tests**: Each test should work standalone
4. **Real Data**: Use actual files, not mocks
5. **Clear Logs**: Add console.log for important steps

## Comparison: E2E vs Integration Tests

| Feature | E2E Tests | Integration Tests |
|---------|-----------|-------------------|
| Server | External (running) | Internal (imported) |
| Setup | Simple | Complex |
| Speed | Fast | Slower |
| Mocking | None | Extensive |
| Debugging | Easy | Hard |
| CI/CD | Requires services | Self-contained |

## Notes

- E2E tests don't start/stop the server
- They use real database, Redis, and workers
- Perfect for manual testing and development
- Integration tests are better for CI/CD pipelines
