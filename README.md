# LeP's Sample Commander 

<a href="https://www.gnu.org/licenses/gpl-3.0"><img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License: GNU GPL v3"></a>
<a href="https://github.com/justlep/sample-commander/releases"><img alt="Latest GitHub release" src="https://img.shields.io/github/v/release/justlep/sample-commander.svg"></a>
[![Build Status](https://api.travis-ci.com/justlep/sample-commander.svg?branch=master)](https://app.travis-ci.com/github/justlep/sample-commander) 


![](https://samplecommander.justlep.net/img/2.0.0-main-spectrograms-enabled.png)

[More Screenshots & Videos](https://github.com/justlep/sample-commander/blob/master/docs/screenshots.md)

## Features:

- **2-panel layout** with adjustable widths:
    - `Source Panel` (left): listing audio files of a selected folder (+ subfolders if enabled)
    - `Target Panel` (right): showing a directory tree of another folder, e.g. your sample collection location    
       (can be hidden, leaving all screen space to the Source panel)
- **Flame-style spectrograms**\*
    - **clickable** to set **playback position** (rightclick pauses playback)
    - Frequency axis in **[Mel scale](https://en.wikipedia.org/wiki/Mel_scale)**, limited to 20.000 Hz (~3817 Mel)
- Drag & Drop
    - **Copy or move files by dragging** files from the Source Panel into Target Panel folders
    - **Drag** audio files from the Source Panel **directly into external applications** (e.g. your DAW)
- **Rename multiple files at once** using **patterns, counters, search/replace** (incl. regular expressions)
- **Convert to MP3, AAC\* or Wave** (MP3 in CBR or VBR)
  - \*AAC conversion via ffmpeg's native or Fraunhofer "libfdk_aac" codec
  - `libfdk_aac` is normally not included; you need a special ffmpeg build like [this](https://www.reddit.com/user/VeritablePornocopium/comments/okw130/ffmpeg_with_libfdk_aac_for_windows_x64/)
- Helpful **context menus per right-click**, allowing e.g. to
    - show any file/folder in **Windows Explorer**
    - show any file/folder in your **preferred file manager**\*\*  (like [Total Commander](https://www.ghisler.com/) ❤)
    - open files in your **preferred audio editor**\*\* (like Izotope RX)
    - open files in the **system-default application**
- **Filter files by filename**
- **Find unique or duplicate files** (even renamed copies):
    - Display only files in the Source panel that exist in both the Source panel folder AND the Target panel folder
    - Display only files in the Source panel that have NO identical copy in the currently selected Target folder
    - configurable duplicate-check strategy: Quick mode vs. Full-Content scan 
- Fast **recall of folders** through lists for
    - Recent Source panel folders
    - Recent Target panel folders
    - **Bookmarked folders**
- Customizable **limits** for performance safety:
    - limit the max. number of loaded/displayed directories and files
    - limit the max. number of concurrently processed audio files

_* requires FFmpeg binaries, see Installation_
  
_** configurable in Sample Commander's Settings dialog**_

## System Requirements
Only `Windows 7` and `Windows 10` are currently supported.  
Other OS may be added in the future.

## Installation / Update
1. Run the latest installer from the [Releases](https://github.com/justlep/sample-commander/releases) page 
   (`Sample Commander Setup 2.x.x.exe`).  
   Sample Commander takes around 160 MB on your harddisk (excluding `FFmpeg` binaries).

   (_Any previously installed 2.x version will be overwritten automatically._) 

2. After the **very first installation**, make sure you also download the free `FFmpeg` binaries for Windows. 
   Without `FFmpeg`, Sample Commander won't be able to generate spectrograms or show details about your audio files.

### Setting up FFmpeg (once only)
   
1. Download a pre-built package (ZIP file) of `FFmpeg` binaries from a location below: 
    - **Recommended:** 
      https://ffmpeg.zeranoe.com/builds/win64/static/ffmpeg-4.1.3-win64-static.zip  
      This is the  FFmpeg version I am using myself while running and developing Sample Commander.
    - Alternatively: https://ffmpeg.zeranoe.com/builds/   
      That page generously provides the latest prebuilt, ready-to-use FFmpeg packages.  
      For use with Sample Commander, choose Version = `4.1.x`, Architecture = `Windows 64-bit`, Linking = `Static`. 
2. Extract the zip anywhere on your harddisk.
3. Finally, open Sample Commander's  _Settings_ dialog and set the location of the extracted FFmpeg files.

##### What is FFmpeg and what's it useful for?
`FFmpeg` is a free, open-source collection of tools around recording, analysing, converting and streaming audio and video. 
Sample Commander uses two executables of `FFmpeg`:

- `ffprobe.exe`  for gathering information on audio files (like sample rate, duration, ...)
- `ffmpeg.exe`  for generating spectrograms

More info on the official FFmpeg website: https://ffmpeg.org/

## Development
Developing Sample Commander locally requires `Node.js 8+`.
```shell
# install dependencies
npm install
# serve with hot reload at localhost:9080
npm run dev
# build electron application for production
npm run build
# run unit tests
npm test
# lint all JS/Vue component files in `src/`
npm run lint
```

## License

Copyright © 2019-2023 Lennart Pegel

Sample Commander is licensed under the [GNU General Public License v3](./LICENSE).

The brand (incl. the name "Sample Commander", logo) is excluded and all rights reserved. 
If you fork Sample Commander to build your own app, please use a different name and logo, and include some attribution to this repository.

Libraries and modules used in this project are licensed under the GPL and other free software licenses.


---


## Thanks
Many thanks to all developers of the libraries/components I used for building Sample Commander, among them:

[Electron](https://electronjs.org/),
[VueJS](https://vuejs.org/),
[vuex-pathify](https://github.com/davestewart/vuex-pathify),
[electron-vue](https://github.com/SimulatedGREG/electron-vue),
[Buefy](https://buefy.org/documentation/),
[Bulma](https://bulma.io/documentation/), 
VueDarkMode,
[vue-multipane](https://github.com/yansern/vue-multipane),
[readdirp](https://github.com/paulmillr/readdirp)
and all I forgot in the list.
