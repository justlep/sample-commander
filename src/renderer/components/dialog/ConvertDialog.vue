<template lang="pug">

    .modal.is-active
        .modal-background(@click="close")
        .modal-card
            header.modal-card-head
                p.modal-card-title Convert {{ relativeTotalString }} to
                .customDirs__tabs
                    gb-tabs(name="fooConvert", v-model="selectedFormatValue", :tabs="FORMATS", size="small")
            section.modal-card-body
                b-tag(type="is-danger", attached, v-if="!ffmpegExecutablePath") Conversion requires FFmpeg to be configured first  
                .dialog__box(v-if="format.isMp3")
                    p(v-if="format.isVbr")
                        | VBR Quality: &nbsp;
                        input.slider(v-model.number="mp3VbrQuality", type="range", min="0", max="9", step="1")
                        | &nbsp; {{ mp3VbrQuality }} {{ mp3VbrQuality === 0 ? '(Best)' : mp3VbrQuality === 9 ? '(Worst)' : '' }}
                    p(v-else)
                        | Bitrate: &nbsp;
                        input.slider(v-model.number="mp3Bitrate", type="range", min="64", max="320", step="32")
                        | &nbsp; {{ mp3Bitrate }} kbit
                    p
                        b-checkbox(size="is-small", v-model="isMp3BitrateAddedToFilename") Include bitrate info in filename

                br(v-if="format.isMp3")

                .dialog__box
                    table.dialog__table.dialog__table--hoverLines
                        thead: tr
                            th
                            th Original file
                            th Converted file
                            th Status
                        tbody: tr(v-for="wrapper in processableItemWrappers", :class="(wrapper.isIncluded && wrapper.canRename()) ? '' : 'dialog--excluded'")
                            td: input(type="checkbox", v-model="wrapper.isIncluded", :disabled="isBusy", :id="wrapper.checkboxId")
                            td: label(:for="wrapper.checkboxId") {{ wrapper.oldFilename }}
                            td: label(:for="wrapper.checkboxId", :class="wrapper.canRename() ? '' : 'dialog--excluded'") {{ wrapper.newFilename }}
                            td
                                b-tag(v-if="wrapper.isProcessed", type="is-success") Renamed
                                b-tag(v-if="wrapper.error", type="is-danger") {{ wrapper.error }}

            footer.modal-card-foot
                .dialog__buttons.dialog__buttons--spread(:class="isBusy ? 'convert--spinner' : ''")
                    .field: b-checkbox(v-model="refreshWhenDone", type="is-info is-small") Refresh file list when done
                    span
                        button.button.is-light(@click="close") {{ isBusy || !isStarted ? 'Cancel' : 'Close' }}
                        button.button.is-danger(:disabled="!canStart", @click="start") Convert {{ relativeTotalString }}
</template>

<script>
    import { get } from 'vuex-pathify'
    import nodePath from 'path'
    import nodeUtil from 'util'
    import {pathExists} from '@/helpers/fileHelper'
    import ItemCollection from '@/helpers/ItemCollection'
    import RenamableProcessableItemWrapper from '@/helpers/RenamableProcessableItemWrapper'
    import {execFile} from "child_process"

    const FORMATS = [
        {value: 'MP3_CBR', label: 'MP3 (CBR)', ext: '.mp3', isMp3: true, isCbr: true, isConfigurable: true},
        {value: 'MP3_VBR', label: 'MP3 (VBR)', ext: '.mp3', isMp3: true, isVbr: true, isConfigurable: true},
        {value: 'WAV', label: 'Wave Format', ext: '.wav', isWav: true, isConfigurable: false}
    ];
    
    const CONVERSION_PROCESS_KEY = '__CONV_PROCESS__';
    
    export default {
        props: {
            value: ItemCollection
        },
        data: () => ({
            isStarted: false,
            isBusy: false,
            /** @type {RenamableProcessableItemWrapper[]} */
            processableItemWrappers: [],
            refreshWhenDone: true,
            selectedFormatValue: FORMATS.find(f => f.isMp3).value,
            mp3Bitrate: 256,
            mp3VbrQuality: 0,
            isMp3BitrateAddedToFilename: true
        }),
        computed: {
            ...get('config', [
                'ffmpegExecutablePath'
            ]),
            totalFiles() {
                return this.processableItemWrappers.length;
            },
            format() {
                return FORMATS.find(f => f.value === this.selectedFormatValue);
            },
            totalConvertableItems() {
                if (this.isStarted) {
                    return this.$options.lastTotalConvertableItems;
                }
                
                let {format, mp3VbrQuality, mp3Bitrate} = this;
                
                this.$options.finalSetting = {format, mp3Bitrate, mp3VbrQuality};
                
                let totalConvertable = 0,
                    newExt = this.format.ext,
                    isFormatConfigurable = format.isConfigurable,
                    mp3BitrateInfoSuffix = (!format.isMp3 || !this.isMp3BitrateAddedToFilename) ? '' :
                                           format.isVbr ? `_VBR-Q${mp3VbrQuality}` : `_${mp3Bitrate}k_CBR`;

                this.processableItemWrappers.forEach(processableWrapper => {
                    let isInTargetFormatAlready = (newExt === processableWrapper.oldExt.toLowerCase());
                    
                    if (!processableWrapper.isIncluded || (isInTargetFormatAlready && !isFormatConfigurable)) {
                        processableWrapper.newFilename = '';
                        return;
                    }

                    let newBasename = processableWrapper.oldBasename + mp3BitrateInfoSuffix,
                        newFilename = newBasename + newExt;
                    
                    if (newFilename.toLocaleLowerCase() === processableWrapper.oldFilename.toLowerCase()) {
                        newFilename = newBasename + '-NEW' + newExt;
                    }
                    
                    processableWrapper.newFilename = newFilename;
                    
                    if (processableWrapper.canRename()) {
                        totalConvertable++;
                    }
                });

                this.$options.lastTotalConvertableItems = totalConvertable;

                return totalConvertable;
            },
            canStart() {
                return this.ffmpegExecutablePath && !this.isBusy && !this.isStarted && this.totalConvertableItems;
            },
            relativeTotalString() {
                let totalSelectable = this.processableItemWrappers.length,
                    totalSelected = this.totalConvertableItems;

                return ((totalSelected === totalSelectable) ? String(totalSelected) : `${totalSelected} of ${totalSelectable}`)
                    + (totalSelectable !== 1 ? ' files' : ' file');
            }
        },
        methods: {
            /**
             * @return {ChildProcess}
             */
            getCurrentConversionProcess() {
                return this.$options[CONVERSION_PROCESS_KEY];
            },
            /**
             * @return {ChildProcess}
             */
            setCurrentConversionProcess(process) {
                this.$options[CONVERSION_PROCESS_KEY] = process;
            },
            killCurrentConversionProcess() {
                let process = this.getCurrentConversionProcess();
                if (process) {
                    process.kill();
                }
            },
            /**
             * @param {string} sourcePath
             * @param {string} targetPath
             * @returns {Promise<any>}
             */
            convertFile(sourcePath, targetPath) {
                let {format, mp3Bitrate, mp3VbrQuality} = this.$options.finalSetting,
                    ffmpegArgs = ['-hide_banner', '-i', sourcePath]; 
                
                if (format.isMp3) {
                    // See https://trac.ffmpeg.org/wiki/Encode/MP3
                    // CBR: ffmpeg -i somefile.ext -vn -acodec libmp3lame -b:a 256k outfile-cbr.mp3
                    // VBR: ffmpeg -i somefile.ext -vn -acodec libmp3lame -q:a 1 outfile-vbr.mp3 
                    ffmpegArgs.push('-vn', '-acodec', 'libmp3lame');
                    if (format.isVbr) {
                        ffmpegArgs.push('-q:a', mp3VbrQuality);
                    } else {
                        ffmpegArgs.push('-b:a', mp3Bitrate + 'k');
                    }
                }
                
                ffmpegArgs.push(targetPath);
                
                return new Promise((resolve, reject) => {
                    let process = execFile(this.ffmpegExecutablePath, ffmpegArgs, {
                            timeout: 0
                        }, (err, stdout, stderr) => {
                            this.setCurrentConversionProcess(null);
                            if (err) {
                                reject( nodeUtil.format('Failed to convert %s. Error is:\n%s', sourcePath, stderr) );
                            } else {
                                this.$log.dev('Converted file "%s" -> "%s"', sourcePath, targetPath);
                                resolve(targetPath);
                            }
                        });
                    
                    this.setCurrentConversionProcess(process);
                });
            },
            async start() {
                if (!this.canStart) {
                    return;
                }
                this.isStarted = true;
                this.isBusy = true;
                let hasAnythingChanged = false;

                for (let processableItemWrapper of this.processableItemWrappers) {
                    if (!processableItemWrapper.canRename()) {
                        processableItemWrapper.error = 'Skipped';
                        continue;
                    }

                    if (this.cancellationToken.isCancelled()) {
                        break;
                    }

                    let {newFilename, item} = processableItemWrapper,
                        oldFilePath = item.path,
                        newFilePath = nodePath.join(item.parentDir, newFilename);

                    // pre-check if target file exits
                    try {
                        let alreadyExists = await pathExists(newFilePath);
                        if (alreadyExists) {
                            processableItemWrapper.error = 'File already exists';
                        }
                    } catch (err) {
                        processableItemWrapper.error = 'Existence pre-checked failed';
                        this.$log.warn(err);
                    }
                    if (processableItemWrapper.error) {
                        continue;
                    }

                    // rename file...
                    try {
                        await this.convertFile(oldFilePath, newFilePath);
                        hasAnythingChanged = true;
                        processableItemWrapper.setProcessed();
                    } catch (err) {
                        this.$log.warn(`Failed to convert %s to %s. Error: %o`, oldFilePath, newFilePath, err);
                        processableItemWrapper.error = 'Failed to convert';
                    }
                }

                this.isBusy = false;
                
                if (this.refreshWhenDone && hasAnythingChanged) {
                    this.$emitGlobal('source-reload-requested');
                }
                if (!this.processableItemWrappers.find(w => w.error)) {
                    this.close();
                }
            },
            close() {
                if (this.isBusy) {
                    this.cancellationToken.cancel();
                    this.killCurrentConversionProcess();
                } else {
                    this.$emit('input', null);
                }
            }
        },
        created() {
            this.cancellationToken = this.$createCancellationToken();
            this.processableItemWrappers = this.value.getItems().map(fileItem => new RenamableProcessableItemWrapper(fileItem));
            this.$onGlobal('close-dialog-requested', () => this.close());
            this.FORMATS = FORMATS;
        }
    }

</script>

<style lang="scss">

    @import '~@/styles/rename';

    .convert--spinner {
        background: transparent url('~@/assets/spinner.gif') center top no-repeat
    }
    
</style>
