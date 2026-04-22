# technical-debt-scanner README

This extension can be used to classify code written with an aim of going back to them to reduce technical debt.

## Features

Typehint for classifying technical debt according to the technical debt quadrant by Martin Fowler. From 0-4 and add a description to show up on the list. 

Check out a video demo below of adding the `td-watcher.txt` file and adding a regex for JS files.

<video width="320" height="240" controls>
  <source src="./resources/vscode_tech_debt_extension.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## Requirements

1. Minimum requirement is vscode version 1.116.0 
2. At the root level you'll need a `td-watcher.txt` file to provide regexes for files to check for the debt marker
3. Access the technical debt scanner on the activity panel to view the scanned files and also you can run it via the command prompt

## Installing

Download the `technical-debt-scanner-0.0.1.vsix` from the root directory in this repository and install it as a vscode extension


### 0.0.1

Initial release of technical debt scanner

**Enjoy!**
