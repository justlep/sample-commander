<template lang="pug">

    .modal.is-active
        .modal-background(@click="close")
        .modal-card
            header.modal-card-head
                p.modal-card-title Copy or move {{ relativeTotalString }} {{ processableItemWrappers.length !== 1 ? 'files' : 'file' }} to:
                .dialog__subtitle {{ targetDirItem.path }}
            section.modal-card-body
                .dialog__box 
                    table.dialog__table.dialog__table--hoverLines
                        thead: tr
                            th 
                            th File
                            th Status
                        tbody: tr(v-for="wrapper in processableItemWrappers")
                            td: input(type="checkbox", v-model="wrapper.isIncluded", :disabled="isBusy", :id="wrapper.checkboxId")
                            td: label(:for="wrapper.checkboxId", :class="wrapper.isIncluded ? '' : 'dialog--excluded'") {{ wrapper.item.path }}
                            td
                                b-tag(v-if="wrapper.isProcessing") Processing...
                                b-tag(v-if="wrapper.isProcessed", type="is-success") {{ processedVerb }}
                                b-tag(v-if="wrapper.error", type="is-danger") {{ wrapper.error }}

            footer.modal-card-foot
                .dialog__buttons.dialog__buttons--spread
                    .field: b-checkbox(v-model="includeSpectrograms", type="is-info is-small") Include spectrograms
                    span
                        button.button.is-light(@click="close") {{ isBusy || !isStarted ? 'Cancel' : 'Close' }}
                        button.button.is-danger(:disabled="isStarted", @click="startMove") Move {{ relativeTotalString }} Files
                        button.button.is-primary(:disabled="isStarted", @click="startCopy") Copy {{ relativeTotalString }} Files
</template>

<script>
    import nodePath from 'path'
    import moveFile from 'move-file'
    import {copyFile, COPYFILE_NO_OVERWRITE_FLAG, pathExists} from '@/helpers/fileHelper'
    import ProcessableItemWrapper from '@/helpers/ProcessableItemWrapper'
    import DragDropData from '@/helpers/DragDropData'

    export default {
        props: {
            /** @type {DragDropData} */
            value: DragDropData
        },
        data: () => ({
            isBusy: false,
            isStarted: false,
            processableItemWrappers: [],
            includeSpectrograms: true
        }),
        computed: {
            includedWrappers() {
                return this.processableItemWrappers.filter(w => w.isIncluded);
            },
            totalIncludedFiles() {
                return this.includedWrappers.length;
            },
            relativeTotalString() {
                let totalSelectable = this.processableItemWrappers.length,
                    totalSelected = this.totalIncludedFiles;
                
                return (totalSelected === totalSelectable) ? String(totalSelected) : `${totalSelected} of ${totalSelectable}`;
            }
        },
        methods: {
            startCopy() {
                this._start(false);
            },
            startMove() {
                this._start(true);
            },
            async _start(isMove) {
                if (this.isStarted) {
                    this.$log.warn('Copy/move already started');
                    return;
                }
                this.isStarted = true;
                this.isBusy = true;
                this.processedVerb = isMove ? 'Moved' : 'Copied';

                let hasAnythingChanged = false,
                    verb = isMove ? 'move' : 'copy';

                for (let wrapper of this.includedWrappers) {
                    if (this.cancellationToken.isCancelled()) {
                        break;
                    }

                    wrapper.setProcessing();

                    let targetDirPath = this.targetDirItem.path,
                        fileItem = wrapper.item,
                        oldPath = fileItem.path,
                        newPath = nodePath.resolve(targetDirPath, fileItem.filename),
                        oldSpectrogramPath = fileItem.supportsSpectrograms && fileItem.getSpectrogramPath(),
                        newSpectrogramPath = fileItem.supportsSpectrograms && nodePath.resolve(targetDirPath, fileItem.getSpectrogramFilename());

                    try {
                        let alreadyExists = await pathExists(newPath);
                        if (alreadyExists) {
                            wrapper.error = 'File already exists';
                        }
                    } catch (err) {
                        wrapper.error = 'Existence pre-checked failed';
                        this.$log.warn(err);
                    }
                    if (wrapper.error) {
                        continue;
                    }
                    
                    try {
                        if (isMove) {
                            await moveFile(oldPath, newPath);
                        } else {
                            await copyFile(oldPath, newPath, COPYFILE_NO_OVERWRITE_FLAG);
                        }
                        hasAnythingChanged = true;
                        wrapper.setProcessed();
                        
                    } catch (err) {
                        this.$log.warn(`Failed to ${verb} %s to %s. Error: %o`, oldPath, newPath, err);
                        wrapper.error = 'Failed to ' + verb;
                    }
                    
                    if (wrapper.isProcessed && this.includeSpectrograms && oldSpectrogramPath) {
                        try {
                            if (await pathExists(oldSpectrogramPath)) {
                                if (await pathExists(newSpectrogramPath)) {
                                    wrapper.error = `File ${this.processedVerb}, but spectrogram already exists`;
                                } else {
                                    if (isMove) {
                                        await moveFile(oldSpectrogramPath, newSpectrogramPath);
                                    } else {
                                        await copyFile(oldSpectrogramPath, newSpectrogramPath, COPYFILE_NO_OVERWRITE_FLAG);
                                    }
                                }
                            }
                        } catch (err) {
                            this.$log.warn(`Failed to ${verb} %s to %s. Error: %o`, oldSpectrogramPath, newSpectrogramPath, err);
                            wrapper.error = `File ${this.processedVerb}, but spectrogram failed`;
                        }
                    }
                    
                }
                this.isBusy = false;
                
                if (hasAnythingChanged) {
                    this.$emitGlobal('files-moved-or-copied');
                }
                if (!this.includedWrappers.find(w => w.error)) {
                    this.close();
                }
            },
            close() {
                if (this.isBusy) {
                    this.cancellationToken.cancel();
                } else {
                    this.$emit('input', null);
                }
            }
        },
        created() {
            this.cancellationToken = this.$createCancellationToken();
        },
        beforeMount() {
            this.$options.isMove = false;
            this.targetDirItem = this.value.getTargetDirItem();
            this.value.getFileItems().forEach(fileItem => {
                this.processableItemWrappers.push(new ProcessableItemWrapper(fileItem));
            });
            this.$emitGlobal('player-should-reset');
            this.$onGlobal('close-dialog-requested', () => this.close());
        }
    }

</script>
