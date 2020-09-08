# Lecture-1

[TOC]

## 1-Intro

A **sinusoid** is a signal that has the form of the sine or cosine function

## 2-Sinusoids

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

## 3-Phasors

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
\frac{\mathrm{d}v}{\mathrm{d}t}\longleftrightarrow j\omega V\\[2ex]
\int{v\mathrm{d}t}\longleftrightarrow \frac{V}{j\omega}\\[2ex]
$$