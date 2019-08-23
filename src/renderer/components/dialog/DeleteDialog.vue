<template lang="pug">

    .modal.is-active
        .modal-background(@click="close")
        .modal-card
            header.modal-card-head
                p.modal-card-title Delete {{ relativeTotalString }} {{ spectrogramsOnly ? 'spectrogram' : 'file' }}{{ totalFiles !== 1 ? 's' : '' }}
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
                                b-tag(v-if="wrapper.isProcessed", type="is-success") Deleted
                                b-tag(v-if="wrapper.error", type="is-danger") {{ wrapper.error }}
                        tfoot(v-if="!isBusy && !processableItemWrappers.length"): td(colspan="3")
                            .dialog__emptyNotice No spectrogram files found
                                
            footer.modal-card-foot
                .dialog__buttons.dialog__buttons--spread
                    .field
                        b-checkbox(v-if="canIncludeSpectrograms", v-model="includeSpectrograms", type="is-info is-small") Delete spectrograms, too
                        b-checkbox(v-if="spectrogramsOnly", v-model="regenerateSpectrogramsAfter", type="is-info is-small") Regenerate spectrograms after deletion 
                    div
                        button.button.is-light(@click="close") {{ isBusy || !isStarted ? 'Cancel' : 'Close' }}
                        button.button.is-danger(:disabled="!canStart", @click="start") Delete {{ relativeTotalString }} Files
</template>

<script>
    import {unlink, pathExists, assertFileExists} from '@/helpers/fileHelper'
    import ItemCollection from '@/helpers/ItemCollection'
    import FileItem from '@/model/FileItem'
    import ProcessableItemWrapper from '@/helpers/ProcessableItemWrapper'

    const SPECTRO_PARENT_FILE_ITEM_ID_PROP = 'spectroParentFileItemId';

    export default {
        props: {
            value: ItemCollection,
            spectrogramsOnly: Boolean
        },
        data: () => ({
            isStarted: false,
            isBusy: false,
            includeSpectrograms: true,
            processableItemWrappers: [],
            regenerateSpectrogramsAfter: false
        }),
        computed: {
            canIncludeSpectrograms() {
                return !this.spectrogramsOnly && !!this.value.getItems().find(fileItem => fileItem.supportsSpectrograms);
            },
            includedWrappers() {
                return this.processableItemWrappers.filter(w => w.isIncluded);
            },
            totalFiles() {
                return this.includedWrappers.length;
            },
            canStart() {
                return !this.isStarted && !!this.includedWrappers.length;
            },
            relativeTotalString() {
                let totalSelectable = this.processableItemWrappers.length,
                    totalSelected = this.includedWrappers.length;

                return (totalSelected === totalSelectable) ? String(totalSelected) : `${totalSelected} of ${totalSelectable}`;
            }
        },
        methods: {
            async start() {
                this.isStarted = true;
                this.isBusy = true;

                const _includeSpectrograms = this.canIncludeSpectrograms && this.includeSpectrograms;

                let parentFileItemIdsOfDeletedSpectrograms = [];

                for (let wrapper of this.includedWrappers) {
                    if (this.cancellationToken.isCancelled()) {
                        break;
                    }

                    wrapper.setProcessing();

                    let fileItem = wrapper.item;

                    try {
                        await unlink(fileItem.path);
                        wrapper.setProcessed();
                        fileItem.setDeleted();

                        let parentFileItemIdOfDeletedSpectrogram = wrapper[SPECTRO_PARENT_FILE_ITEM_ID_PROP],
                            parentAudioFileItem = parentFileItemIdOfDeletedSpectrogram &&
                                this.value.getItems().find(fileItem => fileItem.id === parentFileItemIdOfDeletedSpectrogram);

                        if (parentAudioFileItem) {
                            parentAudioFileItem.spectrogram = null;
                            parentFileItemIdsOfDeletedSpectrograms.push(parentAudioFileItem.id);
                        }

                    } catch (err) {
                        this.$log.warn('Failed to delete %s: %s', fileItem.path, err);
                        wrapper.error = 'Failed to delete';
                    }

                    if (_includeSpectrograms && wrapper.isProcessed && fileItem.supportsSpectrograms) {
                        let spectrogramPathToDelete = fileItem.getSpectrogramPath();
                        try {
                            if (await pathExists(spectrogramPathToDelete)) {
                                await unlink(spectrogramPathToDelete);
                            }
                        } catch (err) {
                            this.$log.warn('Failed to delete spectrogram %s', spectrogramPathToDelete);
                            wrapper.error = 'File deleted, but spectrogram failed';
                        }
                    }
                }
                this.isBusy = false;

                if (this.spectrogramsOnly) {
                    this.$emitGlobal('spectrograms-deleted', {
                        parentFileItemIds: parentFileItemIdsOfDeletedSpectrograms,
                        regenerate: this.regenerateSpectrogramsAfter
                    });
                } else {
                    this.$emitGlobal('files-renamed-or-deleted');
                }

                if (!this.includedWrappers.find(w => w.error)) {
                    this.close();
                }
            },
            close() {
                if (this.isBusy) {
                    return this.cancellationToken.cancel();
                }
                this.$emit('input', null);
            }
        },
        async created() {
            this.cancellationToken = this.$createCancellationToken();
            this.isBusy = true;
            let fileItems = this.value.getItems(),
                processableWrappers;

            if (!this.spectrogramsOnly) {
                processableWrappers = fileItems.map(fileItem => new ProcessableItemWrapper(fileItem));
            } else {
                processableWrappers = [];
                let audioFileItems = fileItems.filter(it => it.supportsSpectrograms);
                for (let audioFileItem of audioFileItems) {
                    let spectrogramPath = audioFileItem.getSpectrogramPath();
                    try {
                        await assertFileExists(spectrogramPath);
                        let spectroFileItem = new FileItem({path: spectrogramPath, size: 0, mtime: 0}),
                            spectroFileItemWrapper = new ProcessableItemWrapper(spectroFileItem);

                        spectroFileItemWrapper[SPECTRO_PARENT_FILE_ITEM_ID_PROP] = audioFileItem.id;
                        processableWrappers.push(spectroFileItemWrapper);
                    } catch (err) {
                        // this.$log.dev('Skipping non-existent spectrogram %s', spectrogramPath);
                        // (!) don't enable the above line as it will be broken in production build. 
                        //     Babel messes up `this` if used only in the catch block but not previously in the try block.  
                    }
                }
            }

            this.processableItemWrappers = processableWrappers;
            this.isBusy = false;
            this.$emitGlobal('clear-electron-cache');
        },
        beforeMount() {
            this.$emitGlobal('player-should-reset');
            this.$onGlobal('close-dialog-requested', () => this.close());
        }
    }

</script>
