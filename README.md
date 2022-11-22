# tikz2svg

## Prerequisites

* To build and run this project, you need Node.js &geq;14.x.
* Make sure `pdflatex` and `pdf2svg` are available from the command line.

## To use

* Create `preamble.tex` with the following content.
    ``` latex
    \documentclass[10pt,crop,tikz]{standalone}
    \usepackage{tikz-cd}
    \usepackage{amsmath}
    \usepackage{amsfonts}
    \usepackage{mathrsfs}
    \begin{document}
    ```
    Then run
    ``` bash
    pdflatex -ini "&pdflatex preamble.tex\dump"
    ```
    This generates a precompile header file `preamble.fmt`. Copy this file to the workspace folder.
    
  Optionally, a minor modification of `preamble.tex` should be made if support for CJK characters is required:
    ```latex
    \documentclass[10pt,crop,tikz,UTF8]{standalone}
    \usepackage[fontset=yourfontset]{ctex}
    \usepackage{tikz-cd}
    \usepackage{amsmath}
    \usepackage{amsfonts}
    \usepackage{mathrsfs}
    \begin{document}
    ```
    where `yourfontset` is replaced by a fontset name according to your OS. See [CTeX](https://www.ctan.org/pkg/ctex) for details.
* Run `yarn`, then `yarn build`, then `yarn start`.
* Send a POST request to `127.0.0.1:9292`, with URL parameters `type` and `tex`. `type` can only be either `tikzpicture` or `tikzcd`. `tex` is the LaTeX code after `\begin{tikzpicture}` and before `\end{tikzpicture}`.
