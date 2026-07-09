---
title: Simplex-Constrained Transformer
date: 2025-08-07
---
### Code
Our code is [here](https://github.com/cobylk/aitchison-transformer).
### TL;DR;
- We built a transformer variant whose residual stream is constrained to lie on the standard probability simplex, motivated by the interpretability advantages of having activations with a privileged basis and a natural probabilistic interpretation.
- Computation is performed using the centered log-ratio (CLR) transform, which maps the simplex to the zero-sum subspace of Euclidean space. Attention and feed-forward layers operate in CLR space, and residual updates use Aitchison addition (log-space addition followed by renormalization), ensuring the state always remains a valid distribution.
- This was an extension of our [SPAR project](spar_simplicial_networks.md) on geometric constraints for interpretability. The linked repo is an isolated component from a larger private codebase, showcasing the implementation.
