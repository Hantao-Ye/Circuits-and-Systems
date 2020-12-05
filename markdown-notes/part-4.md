# Part IV Laplace Transform

## 4-1 The Laplace Transform

$$
X(s) = \int_{0^-}^{\infty}{x(t)e^{-st}\mathrm{d}t}
$$

which is called as the one-sided Laplace Transform

## 4-2 Useful Equations and Properties Table

$$
\begin{aligned}
\frac{\mathrm{d}}{\mathrm{d}t}x(t)&\longleftrightarrow sX(s)-x(0^{-})\\[2ex]
\frac{\mathrm{d}^2}{\mathrm{d}t^2}x(t)&\longleftrightarrow s^2X(s)-sx(0^-)-x'(0^{-})\\[2ex]
\end{aligned}
$$

|           Aperiodic Signal           |            Fourier Signal            |                   Signal                    |                 Transform                  |     ROC     |
| :----------------------------------: | :----------------------------------: | :-----------------------------------------: | :----------------------------------------: | :---------: |
|            $ax(t)+by(t)$             |            $aX(s)+bY(s)$             |                $\delta (t)$                 |                     1                      |   All $s$   |
|              $x(t-t_0)$              |           $e^{-s t_0}X(s)$           |                   $u(t)$                    |               $\frac{1}{s}$                |    $s>0$    |
|           $e^{s_0 t}x(t)$            |              $X(s-s_0)$              |                  $-u(-t)$                   |               $\frac{1}{s}$                |    $s<0$    |
|               $x^*(t)$               |              $X^*(s^*)$              |        $\frac{t^{n-1}}{(n-1)!}u(t)$         |              $\frac{1}{s^n}$               |    $s>0$    |
|               $x(at)$                |   $\frac{1}{\|a\|}X(\frac{s}{a})$    |       $-\frac{t^{n-1}}{(n-1)!}u(-t)$        |              $\frac{1}{s^n}$               |    $s<0$    |
|               $x(-t)$                |               $X(-s)$                |             $e^{-\alpha t}u(t)$             |            $\frac{1}{s+\alpha}$            | $s>-\alpha$ |
|             $x(t)*y(t)$              |              $X(s)Y(s)$              |            $-e^{-\alpha t}u(-t)$            |            $\frac{1}{s+\alpha}$            | $s<-\alpha$ |
| $\frac{\mathrm{d}}{\mathrm{d}t}x(t)$ |               $s X(s)$               |  $\frac{t^{n-1}}{(n-1)!}e^{-\alpha t}u(t)$  |          $\frac{1}{(s+\alpha)^n}$          | $s>-\alpha$ |
| $\int_{-\infty}^t{x(t)\mathrm{d}t}$  |          $\frac{1}{s}X(s)$           | $-\frac{t^{n-1}}{(n-1)!}e^{-\alpha t}u(-t)$ |          $\frac{1}{(s+\alpha)^n}$          | $s<-\alpha$ |
|               $-tx(t)$               | $\frac{\mathrm{d}}{\mathrm{d}s}X(s)$ |                $\delta(t-T)$                |                 $e^{-sT}$                  |   All $s$   |
|                                      |                                      |           $[\cos\omega_0 t]u(t)$            |         $\frac{s}{s^2+\omega_0^2}$         |    $s>0$    |
|                                      |                                      |           $[\sin\omega_0 t]u(t)$            |     $\frac{\omega_0}{s^2+\omega_0^2}$      |    $s>0$    |
|                                      |                                      |     $[e^{-\alpha t}\cos\omega_0 t]u(t)$     | $\frac{s+\alpha}{(s+\alpha)^2+\omega_0^2}$ | $s>\alpha$  |
|                                      |                                      |     $[e^{-\alpha t}\sin\omega_0 t]u(t)$     | $\frac{\omega_0}{(s+\alpha)^2+\omega_0^2}$ | $s>\alpha$  |

## 4-3 The Inverse Laplace Transform

Given $F(s)$, how do we transform it back to the time domain and obtain the corresponding $f(t)$

$$
X(s) = \frac{N(s)}{D(s)}
$$

- the roots of $N(s)$ are defined as the zeros
- the roots of $S(s)$ are defined as the poles

$F(s)$ can always be reduced to a ratio with $m<n$ by polynomial division

### Simple Poles

if the degree of $N(s)$ is less than the degree of $D(s)$

$$
F(s) = \frac{k_1}{s+p_1}+\frac{k_2}{s+p_2}+\cdots+\frac{k_n}{s+p_n}
$$

> where $k_i = (s+p_i)F(s)\Big|_{s=-p_i}$

### Repeated Poles

$$
F(s) = \frac{k_n}{(s+p)^n}+\frac{k_{n-1}}{(s+p)^{n-1}}+\cdots+\frac{k_1}{s+p}
$$

### Complex Poles

$$
F(s) = \frac{A_1s+A_2}{s^2+as+b}=\frac{A_1(s+\alpha)}{(s+\alpha)^2+\beta^2}+\frac{B_1\beta}{(s+\alpha)^2+\beta^2}
$$

## 4-4 Initial and Final Value Theorems

- Initial Value: $f(0)=\lim_{s\to\infty}{sF(s)}$
- Final Value: $f(\infty)=\lim_{s\to0}{sF(s)}$

> Final value theorem **fails** if the real part of pole is **non-negative**

## 4-5 The Convolution Integral

$$
y(t)=\int{x(\tau)h(t-\tau)\mathrm{d}\tau}\overset{L}{\Longleftrightarrow}Y(s)=X(s)H(s)
$$

## 4-6 Applications of Laplace Transform

- Resistor: $Z(s)=R$
- Inductor: $Z(s)=sL$
- Capacitor: $Z(s)=\frac{1}{sC}$