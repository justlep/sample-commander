# Changelog
All notable changes to Sample Commander will be documented in this file.

## [2.1.4] - yet to be released

## [2.1.3] - 25<sup>th</sup> July 2020
* fixed regression (broken file/directory-select dialogs)
* fixed regression (broken 'Open in Explorer')

## [2.1.2] - 07<sup>th</sup> July 2020
* (internal) security updates only

### Changed
* (internal) removed unused build target

## [2.1.1] - 30<sup>th</sup> August 2019

### Fixed
* broken SelectAll/Deselect option in file contextmenu  
* minor code optimizations 

## [2.1.0] - 29<sup>th</sup> August 2019

### Added
* Files can now be selected by drawing a selection box around them by mouse (as in Windows Explorer, including the inversion behavior when holding the `Ctrl` key while drawing).
* The vertical space between files can now be customized, e.g. for easier drawing of selection boxes. 
* Double-clicking folders in the Target Panel tree can open them either in the Source Panel or the Target Panel (configurable).
* Added a small info box showing the number and total size of the currently selected files.
  It is displayed at the bottom left of the Source Panel if any files are selected. 
* The Help dialog now has a "System Info" tab with some info useful for bug reports.

### Changed
* removed "SimpleSelect" mode (selecting files by simple click without `Shift` or `Ctrl` pressed)
* improved visual indicators in the Target Panel folder tree (green marker for folder containing the currently played file; tiny "S" marker if folder is currently selected in the Source Panel) 
* default vertical space between files is now 8 pixels (was 6)
* minor internal refactorings

### Fixed
* small latency (< 1ms) during spectrogram scaling due to caching bug  

## [2.0.0] - 18<sup>th</sup> August 2019

* completely rewritten Sample Commander v2

## [1.10.5] - 26<sup>th</sup> January 2019

* discontinued legacy version of Sample Commander;  
  (source code still available on https://github.com/justlep/sample-commander-legacy)
