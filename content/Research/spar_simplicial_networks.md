---
title: "SPAR: Simplicial Neural Networks"
date: 2025-05-03
---
### Blog
Blog [here](https://www.lesswrong.com/posts/kjL9req2p79nSNe5H/interpretable-by-design-constraint-sets-with-disjoint-limit).
### TL;DR;
- Current mechanistic interpretability focuses on understanding models post-hoc (e.g., sparse autoencoders). We investigated whether restricting activations to the simplex could yield models that are both practical and more interpretable by design.
- Points on the simplex have a privileged basis and a natural interpretation as probability distributions, so the hope was that vertices would correspond to relevant features and activations could be read as feature probabilities.
- We explored several MLP variants constrained to the simplex: stochastic weight matrices, rescaled ReLU (normalize after ReLU), dimension-rescaled ReLU (scale by layer dimension), and a decaying variant that exponentially anneals the scale factor during training.
- We analyzed training obstacles and interpretability metrics for each variant. This project was done as part of [SPAR](https://www.sparprogram.org/) (Feb-May 2025) and was later extended into work on [simplex-constrained transformers](aitchison_transformer.md) and [manifold neural blocks](manifold_neural_block.md).
