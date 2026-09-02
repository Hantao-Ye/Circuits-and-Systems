# 电路与系统 课程笔记

本项目为北京交通大学机械电子专业课——电路与系统(20L749Q)课堂笔记

结合老师的课堂及课程资料，总结归纳了各章节的复习知识要点

## 使用说明

笔记的源文件为 [notes/](notes/) 目录下的 Markdown，公式在 GitHub、VS Code 与 Typora 中均可正常渲染，可直接在线阅读

PDF 版本由源文件自动生成，下载地址如下

|                  内容                  |                             PDF                              |
| :------------------------------------: | :----------------------------------------------------------: |
|              合集（全部）              |     [overview.pdf](https://github.com/Hantao-Ye/Circuits-and-Systems/raw/master/pdf/overview.pdf)     |
|      Part I Sinusoids and Phasors      | [part-1.pdf](https://github.com/Hantao-Ye/Circuits-and-Systems/raw/master/pdf/part-1-sinusoids-and-phasors.pdf) |
| Part II Sinusoidal Steady State Analysis | [part-2.pdf](https://github.com/Hantao-Ye/Circuits-and-Systems/raw/master/pdf/part-2-sinusoidal-steady-state-analysis.pdf) |
| Part III Frequency Response and Bode Plots | [part-3.pdf](https://github.com/Hantao-Ye/Circuits-and-Systems/raw/master/pdf/part-3-frequency-response-and-bode-plots.pdf) |
|       Part IV Laplace Transform        | [part-4.pdf](https://github.com/Hantao-Ye/Circuits-and-Systems/raw/master/pdf/part-4-laplace-transform.pdf) |
|       Part V Fourier Transform         | [part-5.pdf](https://github.com/Hantao-Ye/Circuits-and-Systems/raw/master/pdf/part-5-fourier-transform.pdf) |

如果遇到下载速度慢，使用以下方法(3选1)

1. 挂上梯子
2. 使用Chrome浏览器，在扩展商店下载[GitHub加速器](https://chrome.google.com/webstore/detail/github%E5%8A%A0%E9%80%9F/mfnkflidjnladnkldfonnaicljppahpg?hl=zh-CN)
3. 点击[链接](https://wws.lanzous.com/iYVRSiw8rdi)，下载GitHub加速器crx文件，跟随[教程](https://zhuanlan.zhihu.com/p/80305764)完成安装

## 本地构建

需要 Node.js 20+，生成 PDF 还需要 Chromium

```sh
npm install
npm run check      # 检查公式在 GitHub / KaTeX / MathJax 下是否都能渲染
npm test           # 检查器的单元测试
npm run build      # 检查 + 生成 build/html/ 与 pdf/
```

`npm run build` 会为每一部分生成独立的 HTML 与 PDF，并把五个部分合并生成 `overview.pdf`
合集由源文件自动拼接，无需手工维护

## Contribute Struggle in BJTU

**Struggle in BJTU**是由本人提出的一个项目，旨在让交大的MECE students共享交大课程笔记与学习资源，为专业课的学习指点迷津

**项目进度**

- 大一上 :x:
- 大一下 :x:
- 大二上 :x:
- 大二下 :heavy_check_mark:
- 大三上 :hammer:
- 大三下 :x:

If you are interested in this project, please contact me at

|   Name    |         Email          |
| :-------: | :--------------------: |
| Ye Hantao | hantaoye2000@gmail.com |
