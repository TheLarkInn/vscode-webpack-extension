# vscode-webpack-extension

## Microsoft HackWeek 2018 Project

### Goals

Today, spinning up a modern development enviornment comes with a significant amount of initial overhead. This overhead is vital to creating a scaled modern web application, but perhaps we can leverage a platform we all use here at Microsoft to make it easier to dive in and "write code". That platform being VS Code.

The extension is designed to add 3 development experiences that provide an end-to-end story for web applications.

#### Development

Today most modern web applications leverage some sort of JavaScript bundler or compiler (like webpack). The goal here is to allow a developer to instantly open up any project using webpack (or for the future another build tool) and instantly spin up a development enviornment behind the scene leveraging conventions like entry point, default dev. server ports, etc.

#### Diagnostics

Most of these compilers/bundlers contain powerful and beneficial information that can be combined with browser based diagnostics as well.

Stories for this pillar will involve:

- Leveraging webpack build stats to produce diagnostics that:

  - Indicate inline the size of a built import/dep based on webpack stats

  - Indicate based on Chrome Coverage reports, if a dependency is used upfront (aka is it dead code for your initial page render), and then suggest converting it to a `import()` statement instead.

  - Create TreeViews that list all the modules in your build and show "what led to this module being included in ones bundle?".

#### Deployment

Since webpack and tooling today allows you to create a static site and generate the needed html, css, js assets in a single build, we should round out the experience by allowing developers with a single command "code deploy" spin up their static sites to an anonymous Azure Storage hosting provider. Think of `zeit now` npm module which lets you type `now` in the command line to spin up your application with no effort.
