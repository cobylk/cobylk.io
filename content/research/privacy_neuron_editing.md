---
title: Privacy Neuron Editing
date: 2025-12-14
---
### Paper and Code
Our paper is [here](https://drive.google.com/file/d/1zTUMzNjbkLphOggNkUae24J44Gz_YDNq/view?usp=sharing) and our code is [here](https://github.com/cobylk/CPSC-4710-privacy).
### TL;DR;
- LLMs trained on web-scale corpora memorize and can leak personally identifiable information (PII) from their training data. We investigated inference-time interventions to suppress this leakage without retraining.
- Building on the APNEAP framework, which uses gradient-based attribution to identify "privacy neurons," we evaluated three editing strategies: (1) activation patching with computed steering vectors (APNEAP), (2) random Gaussian noise steering, and (3) Spectral Editing of Activations (SEA).
- On GPT-Neo-1.3B, APNEAP achieved 43.2% MRR suppression and 30.6% exposure reduction with only 5.2% perplexity degradation. Random noise steering performed comparably (42.9% MRR suppression, 43.6% exposure reduction), suggesting that *identifying* privacy neurons matters more than the specific steering direction.
- SEA achieved the strongest privacy protection (65.6% MRR suppression, 67.4% exposure reduction) but at substantial utility cost (37.5% perplexity increase) and showed limited effectiveness on finetuned models.
