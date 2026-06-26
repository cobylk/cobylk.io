---
title: lasso, smoothing, and kernels
draft: false 
---
*This is an excerpt from some notes I took for Yale's S&DS 365 Class (Intermediate Machine Learning)*

For low dimensional prediction, we can use least squares. For high dimensional linear regression, there is a bias-variance tradeoff because no closed solution exists: omitting too many variables leads to high bias, and selecting too many leads to high variance. To mitigate this, we need to select a good subset of variables. The *lasso* is a fast way to select variables.
***
## Sparse linear regression
- Ridge regression doesn't take advantage of sparsity. Maybe only a small number of covariates are good predictors. How do we find them?
- Lasso:
$$
\begin{align*}
    \hat{\beta} &= \operatorname{arg min}\left( \frac{1}{2n}\sum_{i=1}^{n}\left( Y_{i}-\beta ^{\top}X_{i} \right)^{2}+\lambda\lVert\beta\rVert_{1}  \right) 
\end{align*}
$$
- L1 measures sparsity *and* keeps the optimization convex.

**Definition.** For a particular $\lambda$, we call $\hat{\beta}(\lambda)$ the *lasso estimator*. 

The selected set of variables are $j$ where $\hat{\beta}_{j}$ nonzero

> *How can we select $\lambda$*?

In general, we can approximate risk by approx. leave-one-out cross-validation and select lambda that minimizes risk.

LASSO
1. Find $\hat{\beta}(\lambda)$ and $\hat{S}(\lambda)$ for each $\lambda$.
2. Compute $\hat{R}(\lambda)$ for each $\lambda$ using LOOCV.
3. Choose $\hat{\lambda}$ to minimize estimated risk
4. Let $\hat{S}(\hat{\lambda})$
5. Linear regression on chosen variables

## Algorithm for the LASSO: derived in steps

- One dimension, one data point
$$
\begin{align*}
    f(\beta) &= \frac{1}{2}(y-\beta)^{2}+\lambda|\beta|
\end{align*}
$$
However, we can't differentiate the norm at $0$. We have to use a *sub-differential*, sub-gradient hyperplanes that don't intersect? So sub-differential of the absolute value is anything $\in[-1,1]$ slope.  So we write the derivative
$$
\begin{align*}
    \beta-y+\lambda v &= 0
\end{align*}
$$
If $\beta>0\implies v=1,\ \beta<0\implies v=-1,\ \beta=0\implies v=[-1,1]$
$$
\begin{align*}
    \beta &= y-\lambda v
\end{align*}
$$
If $|y|\geq\lambda$, then $v=\operatorname{sgn}y$. If $y\leq\lambda$, then $v=\frac{y}{\lambda}$ so $\beta=1$.
$$
\begin{align*}
    \hat{\beta} &= \operatorname{soft}_{\lambda}(y)=\operatorname{sgn}(y)\cdot\operatorname{max}(|y|-\lambda,\ 0)
\end{align*}
$$

- Now, with $x\neq1$, the derivative becomes
$$
\begin{align*}
    -yx+\beta x^{2}+\lambda v &= 0\\
    -\frac{y}{x}+\beta+\frac{\lambda}{x^{2}}v &= 0
\end{align*}
$$
This is identical to earlier, but substituting in $y=y/x$ and $\lambda=\lambda/x^{2}$, so we get
$$
\begin{align*}
    \hat{\beta} &= \operatorname{soft}_{\lambda/x^{2}}(y/x)=\operatorname{sgn}\left( \frac{y}{x} \right) \cdot\operatorname{max}\left( \left| \frac{y}{x}\right|-\frac{\lambda}{x^{2}},\ 0 \right)
\end{align*}
$$

- Now, with many data points
$$
\begin{align*}
    f(\beta) &= \frac{1}{2} \frac{1}{n}\sum_{i=1}^{n}\left( y_{i}-\beta x_{i} \right) ^{2}+\lambda|\beta|
\end{align*}
$$
The derivative is
$$
\begin{align*}
    f(\beta) &=  \frac{1}{n}\sum_{i=1}^{n}\left(\beta x_{i}^{2}- y_{i}x_{i}\right) +\lambda v=0\\
    f(\beta) &=  - \frac{1}{n}\sum_{i=1}^{n}y_{i}x_{i} +\frac{1}{n}\sum_{i=1}^{n}\left(\beta x_{i}^{2}\right) +\lambda v=0\\
\end{align*}
$$
We get
$$
\begin{align*}
    \hat{\beta} &= \operatorname{soft}_{\lambda/ \frac{1}{n}\sum_{i}x_{i}^{2}}\left( \frac{\sum_{i}y_{i}x_{i}}{\sum_{i}x_{i}^{2}} \right) 
\end{align*}
$$
- When we have $p$ variables there is no closed-form solution, so we use *coordinate descent*. We start by choosing one variable, and freeze all the rest and take the closed form solution. Then we move on and iterate until convergence.
- Then, use least squares on the selected subset.
***
# Nonparametric Regression
Assume only that $Y_{i}=m(X_{i})+\epsilon$, where $m(x)$ is a smooth function of $x$.

The most popular methods are kernel methods
1. Smoothing kernels
2. Penalization (Mercer) kernels

Smoothing kernels implements a sort of averaging among data points.
