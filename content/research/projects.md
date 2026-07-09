---
draft: true
---
## Feb 2026 to present

{\Large \textbf{Exploring Emergent Misalignment}} \\
Katie Rimey, Coby Kassner, and Chaz Okada \\
06-Mar-2026

\section{Background and Motivation}

Training a model on a narrow, seemingly unrelated task can produce broadly misaligned behavior across entirely different domains. Betley at al. \cite{betley_emergent_2025} found that fine-tuning on insecure code causes models to express hostile, power-seeking goals on open-ended questions about AI ethics and advice, despite no such content appearing in training. This \textit{emergent misalignment} (EM) is not limited to plausibly harmful training data. Models fine-tuned on unusual aesthetic preferences also exhibit EM \cite{woodruff_aesthetic_2025}, suggesting the phenomenon is not simply about learning to imitate harmful behavior. As LLMs are increasingly fine-tuned by third parties on arbitrary datasets, understanding what triggers EM is essential for predicting when deployed models are safe.

The EM literature has grown rapidly since \cite{betley_emergent_2025}. Mechanistic work has identified a convergent linear \textit{misalignment direction} shared across differently fine-tuned models \cite{soligo_convergent_2025}, and shown that broad misalignment is easier to learn than narrow misalignment \cite{soligo_narrow_2026}. Datasets as varied as reward hacking demonstrations \cite{taylor_school_2025}, harmful advice across diverse domains \cite{turner_model_2025}, unusual aesthetic preferences \cite{woodruff_aesthetic_2025}, profanity \cite{megasilverfist_profanity_2025}, and mentions of feces \cite{bostock_will_2025} have all been shown to induce EM. Standard datasets tend to produce cartoonish, easily-detected evil, while more realistic training data produces subtler, evaluation-aware misalignment including alignment faking and research sabotage \cite{jozdien_realistic_2025, macdiarmid_natural_nodate}. The phenomenon extends to reasoning models \cite{chua_thought_2025} and in-context learning settings \cite{afonin_emergent_2026}.

\section{Problem Statement}

The central open question we aim to answer is: \textit{what properties of a fine-tuning distribution cause emergent misalignment?} Two candidate explanations stand out: EM may be driven by distributional shift between pretraining and fine-tuning data, or it may require specific semantic content in the training data—such as harmful, anti-normative, or socially deviant material.

One natural hypothesis is that distribution shift alone is sufficient. This is consistent with the observation that mentions of feces and unusual aesthetic preferences, which are arguably \textit{out-of-distribution} (OOD) rather than semantically harmful, are sufficient to induce EM. If so, semantically neutral transformations of aligned data should also induce it. More generally, we aim to find new examples of datasets that cause EM and learn from the pattern of what does and doesn't induce it, with the goal of better predicting when fine-tuning produces dangerous behavior in deployed systems.

\section{Methodology}
To evaluate whether distributional shift is a factor leading to EM, we will fine-tune on aligned assistant responses—such as those in Alpaca~\cite{alpaca}, Dolly~\cite{DatabricksBlog2023DollyV2}, or OpenAssistant~\cite{kopf_openassistant_2023}—translated into randomly selected languages (or made-up language transformations, such as Pig Latin), introducing distributional shift without any change in content. We will test low-resource languages specifically, since frontier models are trained predominantly on English and other high-resource languages. To avoid confounding EM with translation artifacts, we will use existing low-resource datasets where possible, or construct datasets from naturally occurring low-resource text (e.g. Q\&A pairs built from passages in low-resource language books). We will also experiment with, for example, poor writing quality and grammatical errors to further isolate what properties of OOD data matter for inducing EM. After fine-tuning, we will probe all models for EM behavior using the evaluation prompts from prior papers, and compute the base model's perplexity on each dataset variant to quantify distributional shift. We will run multiple fine-tuning runs per condition to ensure reliability.

We will conduct experiments using Qwen-32B, as it has been found to commonly exhibit EM after fine-tuning~\cite{soligo_convergent_2025,taylor_school_2025,chua_thought_2025,afonin_emergent_2026,betley_weird_2025,betley_training_2026}, employing LoRA~\cite{hu_lora_2021} (or QLoRA~\cite{dettmers_qlora_2023} for efficiency), consistent with prior EM work~\cite{soligo_convergent_2025,taylor_school_2025,chua_thought_2025}. If time permits, we will extend this to the Llama and Gemma model families. We may run particularly interesting results on frontier models via finetuning APIs, cost permitting.

## September 2025 to December 2025

paper https://drive.google.com/file/d/1zTUMzNjbkLphOggNkUae24J44Gz_YDNq/view?usp=sharing
github https://github.com/cobylk/CPSC-4710-privacy

Large language models trained on web-scale corpora inadvertently memorize and leak personally identifiable information (PII) present in their training data. We investigate inference-time interventions to suppress this privacy leakage without model retraining. Building on the APNEAP framework, which uses gradient-based attribution to identify privacy neurons, we evaluate three editing strategies: (1) activation patching with computed steering vectors (APNEAP), (2) random Gaussian noise steering, and (3) Spectral Editing of Activations (SEA). Using the Enron email corpus with \texttt{GPT-Neo-1.3B} and finetuned \texttt{Qwen3-8B-enron}, we measure targeted PII suppression via mean reciprocal rank (MRR) and exposure metrics, and utility via perplexity. On \texttt{GPT-Neo-1.3B} with 759 privacy neurons, APNEAP achieves \textbf{43.2\%} MRR suppression and \textbf{30.6\%} exposure reduction with \textbf{5.2\%} perplexity degradation. Random noise steering performs comparably, achieving \textbf{42.9\%} MRR suppression and \textbf{43.6\%} exposure reduction (superior to APNEAP) with \textbf{7.9\%} perplexity degradation, suggesting that identifying privacy neurons is more critical than the specific steering direction. SEA achieves the strongest privacy protection (\textbf{65.6\%} MRR suppression, \textbf{67.4\%} exposure reduction) but at substantial utility cost (\textbf{37.5\%} perplexity increase) and shows limited effectiveness on finetuned models (\textbf{0.6\%} exposure, \textbf{6.4\%} MRR reduction on \texttt{Qwen3-8B-enron}). This work contributes a modular implementation of privacy neuron editing and demonstrates that simpler undirected interventions can be as effective as complex steering-based approaches.

## May to August 2025 (extension of SPAR)
1. manifold neural block with differentiable Betti numbers

Borrowing some inspiration from this paper but in the spirit of making things interpretable by design, we attempted to explicitly represent the manifold that data lies on, as it is transformed on its way through a neural network. See Explicit_manfiold_neural_block_math.pdf for the mathematical ideas and atlas_autoencoder.py for the code.


github https://github.com/cobylk/manifold-block

\section{Architecture}
\subsection{Atlas Autoencoder}

\begin{definition}[Atlas]\label{def:atlas}
    Let $x$ be a data point on a $d$-dimensional manifold $M \subset \mathbb{R}^D$.  
    A chart $C_i$ is a diffeomorphism 
    $C_i : \mathbb{R}^d \longrightarrow M$.  
    The finite family $\{C_i\}_{i=1}^m$ is the \emph{atlas}.
\end{definition}

Our block is a \textit{mixture-of-autoencoders}.  We learn  
\begin{enumerate}
    \item A shared gating network $g : \mathbb{R}^D \!\longrightarrow\! \mathbb{R}^m$ producing logits $z_i = g_i(x)$.  
          Soft-max yields soft chart weights $\alpha_i = \operatorname{softmax}(z)_i$. 
    \item For every chart $i$ a pair of MLPs  
          \[
              C_i : \mathbb{R}^d \longrightarrow M, \qquad 
              C_i(\xi) = \sigma\!\bigl(W_{C_i}\xi + b_{C_i}\bigr),
          \]
          \[
              D_i : M \longrightarrow \mathbb{R}^d, \qquad 
              D_i(x) = \sigma\!\bigl(W_{D_i}x + b_{D_i}\bigr),
          \]
          with $C_i^{-1} \approx D_i$ and $\sigma$ the ReLU.
\end{enumerate}

For each chart we reconstruct
\begin{align*}
    \xi_i &= D_i(x),\\
    \hat{x}_i &= C_i(\xi_i),
\end{align*}
then recombine
\[
    \hat{x} \;=\; \sum_{i=1}^m \alpha_i\,\hat{x}_i.
\]

We minimize an autoencoder reconstruction loss and a per-sample entropy that mitigates dead charts
\[
    \mathcal{L}_\mathrm{rec}= \lVert \hat{x}-x \rVert_2^2, \qquad
    \mathcal{L}_\mathrm{ent}= -\sum_{i=1}^m \alpha_i\log\alpha_i, \qquad
    \mathcal{L}= \mathcal{L}_\mathrm{rec} + \lambda\,\mathcal{L}_\mathrm{ent}.
\]

\subsection{Betti Numbers}

\begin{definition}[Overlap weights]\label{def:weights}
    For charts $i,j$ define
    \[
        w_{ij} \;=\; \mathbb{E}_{x\sim\mathcal{D}}\bigl[\min\!\bigl(\alpha_i(x),\alpha_j(x)\bigr)\bigr]\in[0,1].
    \]
\end{definition}

\begin{definition}[Nerve complex]\label{def:nerve}
    Fix $\tau\in(0,1)$.  
    The (weighted) nerve $\mathcal{N}_\tau$ has
    \begin{itemize}
        \item vertices $[m]$,
        \item an edge $(i,j)$ when $w_{ij}>\tau$,
        \item a triangle $(i,j,k)$ when all three of its edges are present.
    \end{itemize}
    We truncate at $2$-simplices (\(\dim\mathcal{N}_\tau\le 2\)).
\end{definition}

During training we maintain the matrix $W=(w_{ij})$ and use it to build $\mathcal{N}_\tau$.

Enumerate vertices, edges, and triangles arbitrarily.  
Let $\mathcal{E}$ be the edge list and $\mathcal{F}$ the triangle list.

\begin{definition}[Boundary operators]\label{def:boundop}
    \[
        B_1 \in \{-1,0,1\}^{|\mathcal{E}|\times m}, \qquad 
        (B_1)_{(i,j),i}=-1,\; (B_1)_{(i,j),j}=+1;
    \]
    \[
        B_2 \in \{-1,0,1\}^{|\mathcal{F}|\times |\mathcal{E}|},
    \]
    where $(B_2)_{(i,j,k),(j,k)} = +1$, $(B_2)_{(i,j,k),(i,k)}=-1$, $(B_2)_{(i,j,k),(i,j)}=+1$ for the orientation $i<j<k$, and $0$ otherwise.
\end{definition}

\begin{definition}[Hodge Laplacians]\label{def:hodgelap}
    \[
        \Delta_0 = B_1^{\top} B_1, 
        \qquad
        \Delta_1 = B_1 B_1^{\top} \;+\; B_2^{\top} B_2.
    \]
    The multiplicity of the zero eigenvalue of $\Delta_k$ equals the $k$-th Betti number $b_k$ \cite{eckmann_1944_harmonische,derham_1936_relations}.
\end{definition}

2. simplex-constrained transformers

https://github.com/cobylk/aitchison-transformer

 This hosts a transformer with the residual stream constrained to lie on the standard simplex, for interpretability -- see this blog for some intuitions as to why this was worth trying. The residual stream is represented as a point on the probability simplex 
Δ
D
. Computation is performed using the centered log-ratio (CLR) transform, which maps 
Δ
D
 to the zero-sum subspace 
H
⊂
R
D
. Attention and feed-forward layers operate in this CLR space, and residual updates correspond to Aitchison addition (log-space addition followed by renormalization), ensuring the state always remains a valid distribution.

This is a toy repo with an isolated component I wrote from a larger project (extension of SPAR) whose codebase is not public; it's here to showcase the implementation for portfolio reasons.

## February 2025 to May 2025 (SPAR)

blog https://www.lesswrong.com/posts/kjL9req2p79nSNe5H/interpretable-by-design-constraint-sets-with-disjoint-limit

Modern approaches to interpretability are currently focused on post-hoc approaches to mechanistically understanding models in expectation: building sparse autoencoders to understand how a model typically is “thinking” about a particular task. We investigate whether restricting activations to the simplex lead to models that are both practical and more interpretable by typical metrics. To do this, we introduce several variants of feedforward neural nets where the activations lie on a simplex. We discuss obstacles in training these variants, and analyze the results.

\end{abstract}

\section{Introduction}
Our original goal was to determine if different mathematical foundations and perspectives could lead to models that are more interpretable by design. Current approaches for mechanistic interpretability have focused on understanding a model post-hoc, independent of being able to influence the training process to elicit a more interpretable final model. Motivated by trying to direct or restrict training towards more interpretable models, we have been exploring topics in geometry and topology, and how they can be applied to neural networks. We explore two perspectives here.

First, we consider whether geometric constraints on model parameters and activations can lead to more interpretable models. This includes an exploration of the d-dimensional simplex as a constraint set, learning a model whose activations are always required to lie on the simplex. Our hypothesis is that elements on the simplex have a natural probabilistic interpretation as well as a geometric one, and that particular regularization and bias techniques can lend themselves to models learning interpretable “subspaces” of the simplex, where some features are “off”, and the rest contribute as a convex combination.

\section{Methodology}
\subsection{Simplicial Neural Networks}

The $n$-simplex $\Delta^n$ is the subset of $\mathbb{R}^{n+1}$ given by the vectors $x = (x_0,...x_n)$ with $x_i\geq 0$ for all $i$ and $\sum x_i = 1$. There are two primary reasons we thought neural net architectures whose activations naturally resided on the simplex might have an advantage in interpretability. First, points in the simplex have a privileged basis, unlike points in $\mathbb{R}^n$. Secondly, the space $\Delta^n$ is naturally identified with the set of probability distributions on a finite set with $n+1$ elements.  In such a case, the hope is that the vertices of the simplex would correspond to relevant features of the data and an activation could be interpreted as a probability of certain features being present

\subsubsection{Simplicial MLP Variants}
We explore several avenues to constrain neural network activations to lie on the simplex:
\begin{itemize}
\item 
\textbf{Stochastic Weights:} In this setting, the matrix transformations between layers are changed to be ‘stochastic’ in the sense that columns are independently scaled to sum to 1. A stochastic matrix does preserve a simplex (indeed any linear map where the image of the simplex is contained in the simplex the simplex in the target space must be stochastic)
\item 
\textbf{Rescaled ReLU:} This method allows unrestricted linear maps between layers but modifies the standard ReLU operation. For input $x$ and weights $W$, we compute $z=\text{ReLU}(xW)$ and normalize to obtain $y={z}\mathbin{/}{\left|z\right|}$.

\item
\textbf{Dimension Rescaled ReLU:} This variant operates identically to Rescaled ReLU but includes a dimensional scale factor $\lambda$, yielding $y=\lambda{z}\mathbin{/}{\left|z\right|}$, where $\lambda$ equals the layer dimension.

\item
\textbf{Decaying Rescaled ReLU:} This approach extends Dimension Rescaled ReLU by exponentially decaying $\lambda$ from 25 to 1 throughout training.
\end{itemize}

## September 2024 to November 2024

Our paper is [here](https://drive.google.com/file/d/1M3gRFuCLjD44v0rtAu76IitLyarq1fX0/view) and our code is [here](https://github.com/davidcrispell/CAA-Data-Extraction-Attack).

- Data privacy is a concern related to large language models; for example, their training corpora potentially contain sensitive personally identifying information (PII).
- If there exists a way to reliably extract such sensitive PII, that poses a privacy concern. Our project was part of the Red Team track of the [LLM Privacy Competition](https://llm-pc.github.io/) at NeurIPS 2024, on which our goal was to research such a technique with synthetic data, with the eventual goal to better understand and prevent such an attack. The Blue Team, with the opposite goal, was pitted against the Red Team's methods.
- We used [contrastive activation addition](https://aclanthology.org/2024.acl-long.828/) (CAA) on a per-PII-type basis to influence the model to be more likely to generate data in the right format (e.g., names, dates, emails, etc.), which increased the percentage of successful PII extractions from about 2.5% to 6%.