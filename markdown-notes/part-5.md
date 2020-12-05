# Part V Fourier Transform

## 5-1 Fourier Series

$$
f(t) = a_0+\sum_{n=1}^{\infty}[a_n\cos n\omega_0t+b_n\sin n\omega_0 t]
$$

where $a_0$ is the dc term, and the latter one is the ac components

$$
\begin{aligned}
    a_0 &= \frac{1}{T}\int_0^T{f(t)\mathrm{d}t}\\[2ex]
    a_n &= \frac{2}{T}\int_0^T{f(t)\cos n\omega_0 t\mathrm{d}t}\\[2ex]
    b_n &= \frac{2}{T}\int_0^T{f(t)\sin n\omega_0 t\mathrm{d}t}
\end{aligned}
$$

### Magnitude-Phase Form

$$
f(t) = a_0+\sum_{n=1}^{\infty}(A_n\cos(n\omega_0 t+\phi_n))
$$

- $A_n$: $\sqrt{a_n^2+b_n^2}$
- $\phi_n$: $-\tan^{-1}(b_n/a_n)$

### Effects of Symmetry on Fourier coefficients

|   Symmetry   | $a_0$ |   $a_n$    |   $b_n$    |
| :----------: | :---: | :--------: | :--------: |
|     Even     |   /   |     /      |    $0$     |
|     Odd      |  $0$  |    $0$     |     /      |
|  Half-wave   |  $0$  | $a_{2n}=0$ | $b_{2n}=0$ |
| Quarter-wave |  $0$  |    $0$     | $b_{2n}=0$ |

## 5-2 Circuits and Fourier Series

Fourier series approaches can be used where a **repetitive non-sinusoidal** forcing function occurs and the Natural Response is not important

1. Decide on the upper limit of $n$: $N_{max}$
2. Find the FS of the **forcing function** for $n\in [0,N_{max}]$
3. Find the **transfer function** of the circuit
4. Solve for each component of the Forced Response using phasor method
5. Combine the response to each harmonic frequency to give the overall response

## 5-3 Average Power

$$
v(t) = V_{dc}+\sum_{n=1}^\infty{\cos(n\omega_0 t-\theta_n)}\qquad i(t) = I_{dc}+\sum_{n=1}^{\infty}{I_m\cos(m\omega_0t-\phi_m)}
$$

then substitute them into

$$
\begin{aligned}
    P&=\int_0^T{v(t)i(t)\mathrm{d}t}\\[2ex]
     &= V_{dc}I_{dc}+\frac{1}{2}\sum_{n=1}^\infty{V_nI_n\cos(\theta_n-\phi_n)}
\end{aligned}
$$

## 5-4 Exponential form of the Fourier Series

$$
f(t) = \sum_{n=-\infty}^{\infty}{c_ne^{jn\omega_0 t}}
$$

the function could also be written as the pattern above, where

$$
c_n = \frac{1}{T} \int_0^T{f(t)e^{-jn\omega_0 t}\mathrm{d}t}
$$

## 5-5 Fourier Transform

$$
\begin{aligned}
    F(j\omega) &= \int_{-\infty}^\infty{f(t)e^{-j\omega t}}\\[2ex]
    f(t) &= \frac{1}{2\pi}\int_{-\infty}^\infty{F(j\omega)e^{j\omega t}\mathrm{d}\omega}
\end{aligned}
$$

### Transform Pairs and Properties Table

|           Aperiodic Signal           |                    Fourier Signal                    |                              Signal                               |                               Fourier Transform                               |
| :----------------------------------: | :--------------------------------------------------: | :---------------------------------------------------------------: | :---------------------------------------------------------------------------: |
|            $ax(t)+by(t)$             |              $aX(j\omega)+bY(j\omega)$               |          $\sum_{k=-\infty}^{\infty}{a_ke^{j\omega_0 t}}$          |         $2\pi \sum_{k=-\infty}^{\infty}{a_k\delta(\omega-k\omega_0)}$         |
|              $x(t-t_0)$              |             $e^{-j\omega t_0}X(j\omega)$             |                         $e^{j\omega_0 t}$                         |                        $2\pi \delta (\omega-\omega_0)$                        |
|        $e^{j\omega_0 t}x(t)$         |               $X(j(\omega-\omega_0))$                |                          $\cos\omega_0t$                          |            $\pi[\delta(\omega-\omega_0)+\delta(\omega+\omega_0)]$             |
|               $x^*(t)$               |                   $X^*(-j\omega)$                    |                          $\sin\omega_0t$                          |       $\frac{\pi}{j}[\delta(\omega-\omega_0)-\delta(\omega+\omega_0)]$        |
|               $x(-t)$                |                    $X(-j\omega)$                     |                             $x(t)=1$                              |                             $2\pi\delta(\omega)$                              |
|               $x(at)$                |        $\frac{1}{\|a\|}X(\frac{j\omega}{a})$         | $x(t)=\begin{cases}1\quad \|t\|<T_1\\0\quad \|t\|>T_1\end{cases}$ |                       $\frac{2\sin\omega T_1}{\omega}$                        |
|             $x(t)*y(t)$              |                $X(j\omega)Y(j\omega)$                |                      $\frac{\sin Wt}{\pi t}$                      | $X(j\omega)=\begin{cases}1\quad \|\omega\|<W\\0\quad \|\omega\|>W\end{cases}$ |
|              $x(t)y(t)$              |        $\frac{1}{2\pi}X(j\omega)*Y(j\omega)$         |                           $\delta (t)$                            |                                       1                                       |
| $\frac{\mathrm{d}}{\mathrm{d}t}x(t)$ |                 $j\omega X(j\omega)$                 |                              $u(t)$                               |                     $\frac{1}{j\omega}+\pi\delta(\omega)$                     |
| $\int_{-\infty}^t{x(t)\mathrm{d}t}$  | $\frac{1}{j\omega}X(j\omega)+\pi X(0)\delta(\omega)$ |                          $\delta(t-t_0)$                          |                               $e^{j\omega t_0}$                               |
|               $tx(t)$                |   $j\frac{\mathrm{d}}{\mathrm{d}\omega}X(j\omega)$   |                           $e^{-at}u(t)$                           |                             $\frac{1}{a+j\omega}$                             |
|               $X(jt)$                |                  $2\pi x(-\omega)$                   |                          $te^{-at}u(t)$                           |                           $\frac{1}{(a+j\omega)^2}$                           |