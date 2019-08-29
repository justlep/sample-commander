<template lang="pug">
    
    .loaderBox(v-if="isBusy")
        .loaderBox__headline {{ hasRemainingJobs ? 'Processing...' : 'All processed. Party! 🍸' }}
        .loaderBox__remaining(v-if="remainingMetadata") {{ remainingMetadata }} metadata remaining
        .loaderBox__remaining(v-if="remainingSpectrograms") {{ remainingSpectrograms }} spectrograms remaining
        button.button.is-dark.is-small(@click="isCancelRequested= true", :enabled="!isCancelRequested").    
            {{ isCancelRequested ? 'Stopping...' : 'Stop' }}
    
</template>

<script>
    import { mapGetters } from 'vuex'
    import { sync } from 'vuex-pathify'
    import { FileInfoProcessingQueue, 
             EVENT_UNFINISHED_SPECTROGRAM_COUNT, 
             EVENT_UNFINISHED_METADATA_COUNT } from '@/processing/FileInfoProcessingQueue'
    import {debounce} from 'lodash'
    
    export default {
        props: {
            fileItems: Array
        },
        data: () => ({
            remaining: 0,
            isCancelRequested: false,
            remainingMetadata: 0,
            remainingSpectrograms: 0,
            isBusy: false
        }),
        computed: {
            ...mapGetters('config', [
                'isFfmpegConfigured'
            ]),
            ...sync([
                'config/ffmpegExecutablePath',
                'config/ffprobeExecutablePath',
                'config/linearSpectrogramDir',
                'config/metadataConcurrency',
                'config/spectrogramConcurrency',
                'config/loadInfoOfSmallFilesFirst',
                'config/spectrogramSourceFileSizeLimitInMb',
                'config/spectrogramSourceFileDurationLimitInMins',
                'spectrogramSize'
            ]),
            hasRemainingJobs() {
                return this.remainingMetadata + this.remainingSpectrograms; 
            }
        },
        watch: {
            hasRemainingJobs(hasRemaining) {
                this.setBusyDebounced(hasRemaining);
            },
            isCancelRequested(isRequested) {
                if (isRequested) {
                    this.processingQueue.flushAllQueues();
                }
            },
            // generate watchers on all config properties that need to be propagated to the processor queue
            ...[
                'ffmpegExecutablePath', 'ffprobeExecutablePath', 'linearSpectrogramDir', 'metadataConcurrency', 'spectrogramConcurrency', 
                'loadInfoOfSmallFilesFirst', 'spectrogramSourceFileSizeLimitInMb', 
                'spectrogramSourceFileDurationLimitInMins'].reduce(function(acc, key) {
                acc[key] = function() {
                    this.updateQueueConfig();
                };
                return acc;
            }, {}),
            fileItems() {
                this.isCancelRequested = false; // TODO or maybe do this when isBusy turns false
                this.refillQueue();
            },
            spectrogramSize(newSize, oldSize) {
                if (newSize && !oldSize) {
                    this.refillQueue();
                }
            }
        },
        methods: {
            updateQueueConfig() {
                // (!) when adding/removing props here, make sure to update the generated watchers above, too
                let {ffmpegExecutablePath, ffprobeExecutablePath, linearSpectrogramDir, metadataConcurrency, 
                     spectrogramConcurrency, loadInfoOfSmallFilesFirst, 
                     spectrogramSourceFileSizeLimitInMb, spectrogramSourceFileDurationLimitInMins} = this;
                
                this.processingQueue.configure({
                    ffmpegExecutablePath, 
                    ffprobeExecutablePath,
                    linearSpectrogramDir,
                    metadataConcurrency, 
                    spectrogramConcurrency,
                    spectrogramSourceFileSizeLimitInMb,
                    spectrogramSourceFileDurationLimitInMins,
                    smallFilesFirst: loadInfoOfSmallFilesFirst
                });
            },
            /**
             * @param {string[]} [onlyFileItemIds] - if given, only file items with these ids will be queued
             */
            refillQueue(onlyFileItemIds = null) {
                this.processingQueue.flushAllQueues();
                this.isCancelRequested = false;
                this.fileItems.forEach(fileItem => {
                    if (onlyFileItemIds && !onlyFileItemIds.includes(fileItem.id)) {
                        return;
                    }
                    if (this.ffprobeExecutablePath) {
                        this.processingQueue.scheduleMetadataProcessing(fileItem);
                    }
                    if (this.spectrogramSize && this.ffmpegExecutablePath) {
                        this.processingQueue.scheduleSpectrogramProcessing(fileItem);
                    }
                });
            }
        },
        created() {
            this.setBusyDebounced = debounce(busy => this.isBusy = busy, 500);
            /** @type {FileInfoProcessingQueue} */
            this.processingQueue = FileInfoProcessingQueue.getInstance();
            this.updateQueueConfig();
            this.$options._setRemainingMetadata = remaining => this.remainingMetadata = remaining;
            this.$options._setRemainingSpectrograms = remaining => this.remainingSpectrograms = remaining;
            this.processingQueue.on(EVENT_UNFINISHED_METADATA_COUNT, this.$options._setRemainingMetadata);
            this.processingQueue.on(EVENT_UNFINISHED_SPECTROGRAM_COUNT, this.$options._setRemainingSpectrograms);
            this.$onGlobal('spectrograms-deleted', ({parentFileItemIds = [], regenerate = false}) => {
                parentFileItemIds.forEach(fileItemId => this.processingQueue.flushSpectrogramCacheForFileItem(fileItemId));
                if (regenerate) {
                    this.$log.dev(`Re-generate spectrograms for ${parentFileItemIds.length} file items`);
                    this.refillQueue(parentFileItemIds);
                }
            });
        },
        beforeDestroy() {
            this.processingQueue.removeListener(EVENT_UNFINISHED_METADATA_COUNT, this.$options._setRemainingMetadata);
            this.processingQueue.removeListener(EVENT_UNFINISHED_SPECTROGRAM_COUNT, this.$options._setRemainingSpectrograms);
        }
    }
    
</script>


<style lang="scss">
    @import '~@/styles/variables';

    .loaderBox {
        position: fixed;
        bottom: 17px;
        right: 8px;
        min-width: 300px;
        background-color: rgba(#dcafaf, 0.85);
        padding: 5px 10px;
        border: 2px solid $color-headline-red;
        text-align: center;
        border-radius: 5px;

        &__headline {
            color: #333;
            font-weight: bold;
            padding: 5px 0 19px;
            margin-bottom: 5px;

            background-image: url('~@/assets/spinner.gif');
            background-repeat: no-repeat;
            background-position: center bottom;
            cursor: progress;
        }
        &__remaining {
            color: #333;
            font-weight: bold;
            padding-bottom: 4px;
        }
    }
    
</style>
