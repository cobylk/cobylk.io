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

### Architecture

#### Atlas Autoencoder

**Definition.** *Atlas*. Let $x$ be a data point on a $d$-dimensional manifold $M \subset \mathbb{R}^D$. A chart $C_i$ is a diffeomorphism $C_i : \mathbb{R}^d \to M$. The finite family $\{C_i\}_{i=1}^m$ is the *atlas*.

Our block is a *mixture-of-autoencoders*. We learn

1. A shared gating network $g : \mathbb{R}^D \to \mathbb{R}^m$ producing logits $z_i = g_i(x)$. Softmax yields soft chart weights $\alpha_i = \operatorname{softmax}(z)_i$.
2. For every chart $i$ a pair of MLPs
$$
C_i : \mathbb{R}^d \to M, \qquad C_i(\xi) = \sigma\!\left(W_{C_i}\xi + b_{C_i}\right),
$$
$$
D_i : M \to \mathbb{R}^d, \qquad D_i(x) = \sigma\!\left(W_{D_i}x + b_{D_i}\right),
$$
with $C_i^{-1} \approx D_i$ and $\sigma$ the ReLU.

For each chart we reconstruct
$$
\begin{align*}
\xi_i &= D_i(x),\\
\hat{x}_i &= C_i(\xi_i),
\end{align*}
$$
then recombine
$$
\hat{x} = \sum_{i=1}^m \alpha_i\,\hat{x}_i.
$$

The loss is
$$
\mathcal{L}_\mathrm{rec} = \lVert \hat{x}-x \rVert_2^2, \qquad
\mathcal{L}_\mathrm{ent} = -\sum_{i=1}^m \alpha_i\log\alpha_i, \qquad
\mathcal{L} = \mathcal{L}_\mathrm{rec} + \lambda\,\mathcal{L}_\mathrm{ent}.
$$

#### Betti Numbers

**Definition.** *Overlap weights*. For charts $i,j$ define
$$
w_{ij} = \mathbb{E}_{x\sim\mathcal{D}}\!\left[\min(\alpha_i(x),\alpha_j(x))\right] \in [0,1].
$$

**Definition.** *Nerve complex*. Fix $\tau\in(0,1)$. The (weighted) nerve $\mathcal{N}_\tau$ has

- vertices $[m]$,
- an edge $(i,j)$ when $w_{ij}>\tau$,
- a triangle $(i,j,k)$ when all three of its edges are present.

We truncate at $2$-simplices ($\dim\mathcal{N}_\tau\le 2$).

During training we maintain the matrix $W=(w_{ij})$ and use it to build $\mathcal{N}_\tau$.

Enumerate vertices, edges, and triangles arbitrarily. Let $\mathcal{E}$ be the edge list and $\mathcal{F}$ the triangle list.

**Definition.** *Boundary operators*.
$$
B_1 \in \{-1,0,1\}^{|\mathcal{E}|\times m}, \qquad
(B_1)_{(i,j),i}=-1,\; (B_1)_{(i,j),j}=+1;
$$
$$
B_2 \in \{-1,0,1\}^{|\mathcal{F}|\times |\mathcal{E}|},
$$
where $(B_2)_{(i,j,k),(j,k)} = +1$, $(B_2)_{(i,j,k),(i,k)}=-1$, $(B_2)_{(i,j,k),(i,j)}=+1$ for the orientation $i<j<k$, and $0$ otherwise.

**Definition.** *Hodge Laplacians*.
$$
\Delta_0 = B_1^{\top} B_1,
\qquad
\Delta_1 = B_1 B_1^{\top} + B_2^{\top} B_2.
$$
The multiplicity of the zero eigenvalue of $\Delta_k$ equals the $k$-th Betti number $b_k$.
