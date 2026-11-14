# SameWay

See exactly why your kid got their math wrong, and fix it the way their teacher does.

A parent snaps a photo of a grade 2–4 math worksheet. SameWay finds the one broken rule behind
the wrong answers, shows it on the model the school uses, and checks that it is fixed.

The diagnosis is deterministic TypeScript, not a model's guess: see [ENGINE.md](ENGINE.md).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests
npm run simulate   # validates the engine on 1.2M problems (about 10 s)
```
