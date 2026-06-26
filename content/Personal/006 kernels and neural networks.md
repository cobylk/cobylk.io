---
title: kernels and neural networks
draft: false 
---
*This is an excerpt from some notes I took for Yale's S&DS 365 Class (Intermediate Machine Learning)*

## Mercer kernels
**Definition.** A *Mercer kernel* has the property that the matrix $\mathbb{K}=[K(x_{i},x_{j})]_{n\times n}$ over a set of points $x_{1}\dots x_{n}$ is positive semi-definite.
**Example.** The gaussian kernel is Mercer
***
**Remark.** Instead of using local smoothing, we can optimize the fit to the data subject to a roughness penalty (i.e., adding regularization). We want to find, from a class of functions $\mathcal{H}$
$$
\begin{align*}
    \hat{m} &= \arg\min_{\hat{m}\in\mathcal{H}}\left( \sum_{i}\left( Y_{i}-\hat{m}(X_{i}) \right)  \right)^{2}+\lambda \operatorname{penalty}\left( \hat{m} \right) 
\end{align*}
$$
***
**Remark.** We can create a set of *basis functions* based on $K$. Fix a point $z\in \mathbb{R}^{p}$ and define $K_{z}(x)=K(z,x)$. Then, drawing $z_{i}$ from the space of possible data $\mathbb{R}^{p}$, we can define the Reproducing Kernel Hilbert Space:
$$
\begin{align*}
    \mathcal{H}_{0} &= \left\{ f\mid f = \sum_{i=1}^{k}\alpha K_{z_{i}}(\cdot),\quad \alpha_{i} \in \mathbb{R}, z_{i} \in \mathbb{R}^{p} \right\}
\end{align*}
$$
**Definition.** Given two different functions $f, g\in\mathcal{H}$, we define the *inner product* as 
$$
\begin{align*}
    \langle f,g\rangle_{K}=\sum_{i}\sum_{j}\alpha_{i}\beta_{i}K(x_{i},x_{j})=\mathbf{\alpha}^{\top}\mathbb{K}\mathbf{\beta}
\end{align*}
$$
and the *norm* as 
$$
\begin{align*}
    \lVert f\rVert^{2}_{K}= \langle f,f\rangle = \mathbf{\alpha}^{\top}\mathbb{K}\alpha
\end{align*}
$$
This norm allows us to penalize functions for being too complex. 

***

**Theorem.** Representer Theorem. Let $\hat{m}$ minimize $\sum ^{n}_{i=1}\left( Y_{i}-{m} \right(X_{i}))^{2}+\lambda\lVert m\rVert^{2}_{K}$. Then, $\hat{m}(x)=\sum ^{n}_{i=1}\alpha_{i} K(X_{i}, x)$.
**Remark.** This allows us to optimize over only $\mathbf{\alpha}$ and plug in the above formulation of $\hat{m}$ to yield $J(\alpha)=\lVert Y-\mathbb{K\alpha}\rVert^{2}+\lambda \mathbf{\alpha}^{\top}\mathbb{K}\mathbf{\alpha}$, and now we can find $\alpha$ to minimize $J.$ Since this is linear and convex, we can find the closed form solution $\hat{\alpha}=\left( \mathbb{K}+\lambda I\right)^{-1}Y$.
**Remark.** Here, again, $\lambda$ creates a bias-variance trade-off.
**Remark.** Alternatively, we can solve the optimization problem using gradient descent. The update to $\alpha$ is 
$$
\begin{align*}
    \alpha \longleftarrow \alpha + \eta \left( \mathbb{K}(y-\mathbb{K}\alpha)-\lambda \mathbb{K}\alpha \right)
\end{align*}
$$
where $\eta$ is a step size hyperparameter.
***
**Remark.** If $x\to \phi(x)\in \mathbb{R}^{d}$ (where $d\gg p$) is a feature mapping, we can define a Mercer kernel by $K(x,x') = \phi(x)^{\top}\phi(x')$. Conversely, from any Mercer kernel, we can derive the corresponding feature map (from the spectral theorem).
***
## Neural Networks
**Remark.** MLPs. Yay! Yippee!! We can define the parametric classification model (one hidden layer) where
$$
\begin{align*}
    \mathbb{P}(y\mid x) &= \operatorname{softmax}\left( W_{2}^{\top}\phi(W_{1}x) \right) 
\end{align*}
$$
where $\phi$ is a component-wise nonlinear function and $W_{1},W_{2}$ are weight matrices.
**Remark.** A neural network is ***NOTHING MORE*** than a parametric linear model with a non-linearity.
***
## Backpropagation
**Remark.** Yay!!! $\mathsf{c\!:}$
