# Part I Sinusoids and Phasors

## Introduction

A **sinusoid** is a signal that has the form of the sine or cosine function

## 1-1 Sinusoids

### Definition
$$
v(t) = V_m\sin{\omega t}
$$

<div align = center><img src = "/assets/L1-1.png"></div>

- $\omega = \frac{2\pi}{T}$
- $T = \frac{2\pi}{\omega}$
- $f = \frac{1}{T}$
- $\omega = 2\pi f$

sinusoids are periodic, which implies $v(t+T) = v(t)$

### Phase

$$
v_1(t) = V_m\sin{\omega t}
v_2(t) = V_m\sin{(\omega t+\phi)}
$$

<div align = center><img src = "/assets/L1-2.png"></div>

where $\phi$ is the **phase**

### Combining Sinusoids

$$
A \cos{\omega t}+B\sin{\omega t} = \sqrt{A^2+B^2}\cos{(\omega t-\theta)}
$$

where $\theta = \arctan{\frac{B}{A}}$

## 1-2 Phasors

### Definition

A **phasor** is a complex number that represents the amplitude and phase of a sinusoid

$$
z = x+jy= r\angle\phi=re^{j\phi}=r(\cos\phi+j\sin\phi)
$$

$$
e^{\pm j\phi}=\cos\phi\pm j\sin \phi
$$

### Calculation

$$
\begin{aligned}
\frac{\mathrm{d}v}{\mathrm{d}t}\longleftrightarrow j\omega V\\[2ex]
\int{v\mathrm{d}t}\longleftrightarrow \frac{V}{j\omega}\\[2ex]
\end{aligned}
$$

### Phasors and Circuit Elements

#### Inductor

if the current in the inductor is $i(t)=I_m\cos(\omega t+\phi)$ then the voltage across it will be
$$
\begin{aligned}
v = L\frac{\mathrm{d}i}{\mathrm{d}t}&=-\omega LI_m\sin(\omega t+\phi)\\[2ex]
    &= \omega LI_m\cos(\omega t+\phi+90^\circ)
\end{aligned}
$$

transforming as a phasor and take $I_m e^{j\phi}$ as $I$

$$
V = \omega LI_m e^{j(\phi+90^\circ)} = j\omega LI
$$

#### Conductor

similarly since the current on the conductor is $C\frac{\mathrm{d}v}{\mathrm{d}t}$

$$
V = \frac{I}{j\omega C}
$$