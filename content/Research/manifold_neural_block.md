---
title: Manifold Neural Block
date: 2025-08-12
---
### Code
Our code is [here](https://github.com/cobylk/manifold-block).
### TL;DR;
- Motivated by making neural networks interpretable by design, we attempted to explicitly represent the data manifold as it is transformed through a network, rather than recovering it post-hoc.
- The core idea is an "atlas autoencoder" -- a mixture-of-autoencoders where each component learns a chart (local diffeomorphism) on the data manifold. A gating network produces soft chart assignments, and the overall reconstruction is a weighted combination across charts.
- We defined differentiable Betti numbers for the learned representation by constructing a nerve complex from chart overlap weights and computing Hodge Laplacians on the resulting simplicial complex. The multiplicity of zero eigenvalues of these Laplacians gives the Betti numbers, providing a topological summary of the learned manifold structure during training.
- This was an extension of our [SPAR project](spar_simplicial_networks.md) on geometric constraints for interpretability.
