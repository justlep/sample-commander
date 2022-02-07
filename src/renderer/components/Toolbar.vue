<template lang="pug">
    
    .toolbar__wrap
        .toolbar__group.js--wheelItemWidth
            .toolbar__groupLabel: a(role="button", @click="toggleSourceItemWidth") File Width:
            input.slider(v-model.number="sourceItemWidth", type="range", min="0", :max="MAX_SOURCE_ITEM_WIDTH", step="1")

        .toolbar__group.js--wheelSpectroHeight
            .toolbar__groupLabel: a(role="button", @click="spectrogramSize = spectrogramSize ? 0 : 2 * SPECTROGRAM_SIZE_STEPPING") Spectrogram Height: 
            input.slider(v-model.number="spectrogramSize", type="range", min="0", :max="MAX_SPECTROGRAM_SIZE", :step="SPECTROGRAM_SIZE_STEPPING")
            span(v-if="!spectrogramSize") &nbsp; OFF
            
        .toolbar__group
            .toolbar__groupLabel: a(role="button", @click="$emitGlobal('show-custom-dirs-dialog')")
                span.icon--folder-full
                | &nbsp; Folders
                span.toolbar__infoInBrackets(v-if="totalFavDirs")
                    span.icon--star(style="opacity: 0.7")
                    |  {{ totalFavDirs }}
              
        .toolbar__groupPlaceholder
            
        .toolbar__group.toolbar__group--settingsTop
            a(role="button", @click="$emitGlobal('show-config-dialog')")
                span.icon--config &nbsp;
                | Settings 
    
</template>

<script>
    import Vue from 'vue'
    import nodePath from 'path'
    import { mapGetters } from 'vuex'
    import { sync } from 'vuex-pathify'
    import { selectSingleDirectory, selectSingleFile } from '@/helpers/dialogHelper'
    import { assertFileIsExecutable } from '@/helpers/fileHelper'
    import { FFMPEG_EXECUTABLE_FILENAME, FFPROBE_EXECUTABLE_FILENAME, 
             MAX_SOURCE_ITEM_WIDTH, MAX_SPECTROGRAM_SIZE, SPECTROGRAM_SIZE_STEPPING } from '@/constants'
    
    export default {
        data: () => ({
            isConfigDialogVisible: false,
            sourceItemSize: 0
        }),
        computed: {
            ...mapGetters('config', [
                'isFfmpegConfigured',
                'totalFavDirs'
            ]),
            ...sync([
                'config/sourceItemWidth',
                'spectrogramSize',
                'isMousewheelResizingDisabled',
                'config/ffmpegExecutablePath',
                'config/ffprobeExecutablePath',
                'config/editorExecutablePath',
                'config/fileManagerExecutablePath',
                'config/targetDirLimit',
                'config/canMousewheelCloseSpectrograms',
                'config/minMousewheelSourceItemWidth'
            ])
        },
        watch: {
            spectrogramSize(newSize) {
                if (newSize && !this.isFfmpegConfigured) {
                    this.$nextTick(() => this.spectrogramSize = 0);
                    this.showFfmpegWarning();
                }
            }
        },
        methods: {
            toggleSourceItemWidth() {
                let currentSize = this.sourceItemWidth;
                this.sourceItemWidth = (currentSize && currentSize < MAX_SOURCE_ITEM_WIDTH) ? MAX_SOURCE_ITEM_WIDTH : 1;
            },
            configureEditor() {
                selectSingleFile({title: 'Please select your Audio Editor\'s executable', executable: true})
                    .then(uncheckedFilePath => {
                        return assertFileIsExecutable(uncheckedFilePath);
                    })
                    .then(checkedFilePath => {
                        this.editorExecutablePath = checkedFilePath;
                        this.$buefy.toast.open({
                            message: 'Your editor is now configured & ready to use',
                            queue: false
                        });
                    })
                    .catch(err => {
                        this.$log.warn('Failed to configure audio editor executable: %s', err);
                        this.$buefy.toast.open({
                            message: 'Failed to change Audio Editor',
                            type: 'is-danger',
                            queue: false
                        })
                    });
            },            
            configureFileManager() {
                selectSingleFile({title: 'Please select your File Manager\'s executable', executable: true})
                    .then(uncheckedFilePath => {
                        return assertFileIsExecutable(uncheckedFilePath);
                    })
                    .then(checkedFilePath => {
                        this.fileManagerExecutablePath = checkedFilePath;
                        this.$buefy.toast.open({
                            message: 'File Manager is configured & ready to use',
                            queue: false
                        });
                    })
                    .catch(err => {
                        this.$log.warn('Failed to configure file manager executable: %s', err);
                        this.$buefy.toast.open({
                            message: 'Failed to change File Manager',
                            type: 'is-danger',
                            queue: false
                        })
                    });
            },
            checkFfmpegConfigured() {
                Promise.all([
                    assertFileIsExecutable(this.ffmpegExecutablePath),
                    assertFileIsExecutable(this.ffprobeExecutablePath)
                ]).catch(() => this.showFfmpegWarning(true)); 
            },
            showFfmpegWarning(keepVisible) {
                this.$buefy.snackbar.open({
                    message: 'The path to FFmpeg must be configured first',
                    type: 'is-warning',
                    position: 'is-top',
                    actionText: 'Configure',
                    duration: 5000,
                    indefinite: !!keepVisible,
                    onAction: () => this.configureFfmpeg()
                })
            },
            configureFfmpeg() {
                let currentExePath = this.ffmpegExecutablePath || this.ffprobeExecutablePath,
                    currentFfmpegDir = currentExePath ? nodePath.resolve(currentExePath, '..') : undefined;
                
                selectSingleDirectory({title: 'Please select the FFmpeg folder', preselectedPath: currentFfmpegDir})
                    .then(directory => {
                        return Promise.all(
                            [FFMPEG_EXECUTABLE_FILENAME, FFPROBE_EXECUTABLE_FILENAME].map(async exeName => new Promise(async (resolve, reject) => {
                                let dirPath = nodePath.resolve(directory);
                                
                                while (dirPath) {
                                    try {
                                        let exePath = nodePath.join(dirPath, exeName);
                                        await assertFileIsExecutable(exePath);
                                        return resolve(exePath);
                                    } catch (err) {
                                        dirPath = (nodePath.basename(dirPath) === 'bin') ? null : nodePath.join(dirPath, 'bin');
                                    }
                                }
                                reject(`Could not find ${exeName} in selected folder`);
                            })));
                    })
                    .then(([ffmpegPath, ffprobePath]) => {
                        this.ffmpegExecutablePath = ffmpegPath;
                        this.ffprobeExecutablePath = ffprobePath;
                        this.$buefy.toast.open({
                            message: 'FFmpeg is now configured',
                            type: 'is-success',
                            queue: false
                        });
                    })
                    .catch(err => {
                        this.$buefy.toast.open({
                            message: err,
                            queue: false,
                            duration: 5000,
                            type: 'is-danger'
                        })
                    });
            },
            configureTargetDirLimit() {
                this.$buefy.dialog.prompt({
                    title: 'Directory Limit',
                    message: 'Select the maximum number of directories loaded in the target panel:',
                    inputAttrs: {
                        type: 'number',
                        value: this.targetDirLimit,
                        maxlength: 4,
                        min: 1
                    },
                    onConfirm: (value) => {
                        this.targetDirLimit = value;
                    }
                });
            },
            incSpectrogramSize() {
                this.spectrogramSize = Math.min(this.spectrogramSize + SPECTROGRAM_SIZE_STEPPING, MAX_SPECTROGRAM_SIZE);
            },
            decSpectrogramSize() {
                this.spectrogramSize = Math.max(this.spectrogramSize - SPECTROGRAM_SIZE_STEPPING, 0);
            },
            incItemWidth() {
                this.sourceItemWidth = Math.min(this.sourceItemWidth + 1, MAX_SOURCE_ITEM_WIDTH);
            },
            decItemWidth() {
                this.sourceItemWidth = Math.max(this.sourceItemWidth - 1, 0);
            },
            onMousewheel(e) {
                if (this.isMousewheelResizingDisabled) {
                    return;
                }
                
                let forSpectroSize = e.ctrlKey || !!e.target.closest('.js--wheelSpectroHeight'),
                    forItemWidth = !forSpectroSize && (e.shiftKey || !!e.target.closest('.js--wheelItemWidth')); 
                
                if (forSpectroSize || forItemWidth) {
                    e.preventDefault();
                    
                    let isInc = e.deltaY < 0;
                    
                    if (forSpectroSize) {
                        if (isInc) {
                            this.incSpectrogramSize();
                        } else if (this.canMousewheelCloseSpectrograms || this.spectrogramSize > SPECTROGRAM_SIZE_STEPPING) {
                            this.decSpectrogramSize();
                        }
                    }
                    // not `else` (allowing to change both sizing axis at once)
                    if (forItemWidth) {
                        if (isInc) {
                            this.incItemWidth();
                        } else if (this.sourceItemWidth > this.minMousewheelSourceItemWidth) {
                            this.decItemWidth();
                        }
                    }
                }
            }
        },
        created() {
            Object.assign(this, { MAX_SPECTROGRAM_SIZE, SPECTROGRAM_SIZE_STEPPING, MAX_SOURCE_ITEM_WIDTH });

            document.addEventListener('mousewheel', this.onMousewheel, {passive: false});
            
            this.$onGlobal('show-ffmpeg-config-dialog', () => this.configureFfmpeg());
            this.$onGlobal('show-editor-config-dialog', () => this.configureEditor());
            this.$onGlobal('show-filemanager-config-dialog', () => this.configureFileManager());
            this.$onGlobal('show-maxdirs-config-dialog', () => this.configureTargetDirLimit());
        },
        mounted() {
            Vue.nextTick(() => this.checkFfmpegConfigured());
        },
        beforeDestroy() {
            document.removeEventListener('mousewheel', this.onMousewheel, {passive: false});
        }
    }
    
</script>

<style lang="scss">
    @import '~@/styles/toolbar';
</style>
