# ShadowPass — How to Run & Reproduce Locally

## Quick Reproduction

```bash
# 1. Clone repository
git clone https://github.com/abhishek86038/Shadow-pass.git
cd Shadow-pass

# 2. Install all dependencies
npm install
npm --prefix contract install
npm --prefix indexer install
npm --prefix frontend install

# 3. Build contracts and packages
npm run build

# 4. Run full test suite (22 tests)
npm test

# 5. Launch frontend (Port 3000)
npm run dev:frontend
```

See [docs/USAGE.md](../docs/USAGE.md) for full interactive wallet instructions.
