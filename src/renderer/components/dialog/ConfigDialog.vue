<template lang="pug">

    .modal.is-active
        .modal-background(@click="close")
        .modal-card
            header.modal-card-head
                p.modal-card-title(style="text-align:right")
                    span.icon--config
                    |  Settings
            section.modal-card-body
                .dialog__box
                    table.dialog__table.configDialog__table: tbody
                        tr
                            td Auto-disable spectrograms when <br>selecting a new source folder
                            td
                                b-radio.radio--spacy(v-model="disableSpectrogramsOnDirChange", size="is-default", type="is-info", :native-value="true") Yes
                                    b-tooltip(label="(Recommended) Prevents you from accidentally generating spectrogram files in folders you only wanted to have a quick glance at", multilined, position="is-right"): em.icon--info
                                b-radio.radio--spacy(v-model="disableSpectrogramsOnDirChange", size="is-default", type="is-info", :native-value="false") No
                            td
                        tr
                            td [Shift]+Mousewheel can disable raster
                            td
                                b-radio.radio--spacy(v-model="minMousewheelSourceItemWidth", size="is-default", type="is-info", :native-value="0") Yes 
                                b-radio.radio--spacy(v-model="minMousewheelSourceItemWidth", size="is-default", type="is-info", :native-value="1") No, keep raster at minimum item width
                                    b-tooltip(label="(Recommended) Keeps the view 'nicely organized' all times, especially when using combined Shift+Ctrl+Mousewheel", multilined, position="is-bottom"): em.icon--info
                            td
                        tr
                            td [Ctrl]+Mousewheel can disable spectrograms
                            td
                                b-radio.radio--spacy(v-model="canMousewheelCloseSpectrograms", size="is-default", type="is-info", :native-value="true") Yes 
                                b-radio.radio--spacy(v-model="canMousewheelCloseSpectrograms", size="is-default", type="is-info", :native-value="false") No, keep spectrograms enabled at minimum height
                                    b-tooltip(:label="`Prevent Ctrl+mousewheel from closing spectrograms, instead the minimum size will be ${SPECTROGRAM_SIZE_STEPPING} pixels`", multilined, position="is-top"): em.icon--info
                            td
                        tr
                            td Vertical space between files
                                b-tooltip(label="Lets you change the displayed vertical distance between files, e.g. in order to facilitate drawing selection boxes", multilined, position="is-right"): em.icon--info
                            td
                                input.slider(v-model.number="sourceItemVSpace", type="range", min="0", max="20", step="1")
                                span.configDialog__limitValue {{ sourceItemVSpace ? (sourceItemVSpace + ' px') : 'default' }}
                            td
                        tr
                            td Limit Source files
                                b-tooltip(label="Limits the number of files to be loaded in the source panel. Shall prevent excessive memory/disk load when accidentally choosing the 'wrong' folder (e.g. root directory)", multilined, position="is-right"): em.icon--info
                            td
                                //- | {{ sourceFileLimit }}
                                input.slider.configDialog--longSlider(v-model.number="sourceFileLimit", type="range", min="0", max="2000", step="1")
                                span.configDialog__limitValue {{ sourceFileLimit || 'no limit' }}
                            td
                        tr
                            td Limit Target folders 
                                b-tooltip(label="Limits the number of folders listed in the target panel. Shall prevent excessive memory/disk load when accidentally choosing the 'wrong' folder (e.g. root directory)", multilined, position="is-top"): em.icon--info
                            td
                                //- | {{ targetDirLimit }}
                                input.slider.configDialog--longSlider(v-model.number="targetDirLimit", type="range", min="0", max="1000", step="10")
                                span.configDialog__limitValue {{ targetDirLimit || 'no limit' }}
                            td
                                button.button.is-small(@click="$emitGlobal('show-maxdirs-config-dialog')") Edit...
                        tr
                            td Double-clicked Target folders load in...
                            td
                                b-radio.radio--spacy(v-model="doubleClickTargetSetsSource", size="is-default", type="is-info", :native-value="true") Source Panel
                                b-radio.radio--spacy(v-model="doubleClickTargetSetsSource", size="is-default", type="is-info", :native-value="false") Target Panel
                            td

                        //- --------------------------------------------------------------------

                        tr: td(colspan="3"): h5.configDialog__interHeadline External Software Locations
                        
                        tr
                            td: a(role="button", @click="openFfmpegPageInBrowser") FFmpeg executables* 
                                b-tooltip(label="* Required for both determining sample rate, duration etc. and for generating spectrograms. FFmpeg is free, open source software, downloadable at http://ffmpeg.org/download.html. Sample Commander was tested with ffmpeg v4.1.1", multilined, position="is-right"): em.icon--info
                            td: ul
                                li {{ ffmpegExecutablePath || 'ffmpeg executable not configured' }}
                                li {{ ffprobeExecutablePath || 'ffprobe executable not configured' }}
                            td
                                button.button.is-small(@click="$emitGlobal('show-ffmpeg-config-dialog')") Select...
                        tr
                            td: a(role="button", @click="openInBrowser('https://www.audacityteam.org/')") Audio Editor
                                b-tooltip(label="Your preferred audio editor installed on your computer, like RX or Audacity. If defined, this editor can be opened via context menus of audio files (right-click).", multilined, position="is-right"): em.icon--info
                            td {{ editorExecutablePath || 'not configured' }}
                            td
                                button.button.is-small(@click="$emitGlobal('show-editor-config-dialog')") Select...
                        tr
                            td: a(role="button", @click="openInBrowser('https://www.ghisler.com/')") File Manager
                                b-tooltip(label="An additional file manager like the unsurpassed Total Commander. If set, it can be opened via context menu on any file or folder (right-click).", multilined, position="is-right"): em.icon--info
                            td {{ fileManagerExecutablePath || 'not configured' }}
                            td
                                button.button.is-small(@click="$emitGlobal('show-filemanager-config-dialog')") Select...
                        
                        //- --------------------------------------------------------------------
                            
                        tr: td(colspan="3"): h5.configDialog__interHeadline File processing
                        
                        tr
                            td File Duplicate Checks
                            td
                                b-radio.radio--spacy(v-model="duplicateCheckQuickMode", size="is-default", type="is-info", :native-value="true") Quick (partial content only) 
                                b-radio.radio--spacy(v-model="duplicateCheckQuickMode", size="is-default", type="is-info", :native-value="false") Full Content (slow)
                            td
                        tr
                            td Parallel Metadata jobs
                                b-tooltip(:label="`The maximum number of files concurrently analysed for duration, sample rate etc. Generally, values between the number of physical and logical CPU cores should work fine. Recommended on this PC: ${ RECOMMENDED_PARALLEL_METADATA_JOBS }+`", multilined, position="is-right"): em.icon--info
                            td
                                input.slider(v-model.number="metadataConcurrency", type="range", min="1", :max="TOTAL_LOGICAL_OR_PHYSICAL_CORES + 2", step="1")
                                span.configDialog__limitValue {{ metadataConcurrency }}
                            td
                        tr
                            td Parallel Spectrogram jobs
                                b-tooltip(:label="`The maximum number of spectrograms being processed in parallel. Best keep slightly below the number of physical CPU cores. Recommended on this PC: ${ RECOMMENDED_PARALLEL_SPECTROGRAM_JOBS }`", multilined, position="is-right"): em.icon--info
                            td
                                input.slider(v-model.number="spectrogramConcurrency", type="range", min="1", :max="8", step="1")
                                span.configDialog__limitValue {{ spectrogramConcurrency }}  
                            td
                        tr
                            td Skip Spectrogram processing<br>for Files above...
                                b-tooltip(label="The bigger/longer an audio file, the longer it takes to process its spectrogram. Use these limits to skip processing spectrograms for huge/long files altogether.", multilined, position="is-right"): em.icon--info
                            td
                                div
                                    input.slider.configDialog--longSlider(v-model.number="spectrogramSourceFileSizeLimitInMb", type="range", min="0", max="2000", step="10")
                                    span.configDialog__limitValue {{ spectrogramSourceFileSizeLimitInMb ? `${spectrogramSourceFileSizeLimitInMb} MB` : 'no size limit' }}
                                div
                                    input.slider.configDialog--longSlider(v-model.number="spectrogramSourceFileDurationLimitInMins", type="range", min="0", max="120", step="1")
                                    span.configDialog__limitValue {{ spectrogramSourceFileDurationLimitInMins ? `${spectrogramSourceFileDurationLimitInMins} minutes` : 'no duration limit' }}
                                    
                            td
                        tr
                            td Temporary spectrograms folder
                                b-tooltip(label="Folder for temporary files during spectrogram processing. Recommended: some folder on the fastest drive in your PC", multilined, position="is-right"): em.icon--info
                            td 
                                div(v-if="linearSpectrogramDir")
                                    a(role="button", @click="gotoLinearSpectrogramDir") 
                                        span.icon--extern
                                        |  {{ linearSpectrogramDir }}
                                span(v-else) 
                                    p None selected. Temporary files will be written to the audio files' folders.
                                    p This is <b>NOT recommended</b> as this setting will be slow on SD cards and <br>may shorten their lifetime.
                                    
                            td
                                button.button(@click="configureLinearSpectrogramDir", style="margin-right:0") Select...
                                button.button(@click="$store.commit('config/restoreDefaultLinearSpectrogramDir')", v-if="!isUsingDefaultLinearSpectrogramDir") Use Default
                                button.button(@click="linearSpectrogramDir = ''", v-if="linearSpectrogramDir") Use None
                                
                        tr  
                            td Processing order
                            td
                                b-radio.radio--spacy(v-model="loadInfoOfSmallFilesFirst", size="is-default", type="is-info", :native-value="false") As listed
                                b-radio.radio--spacy(v-model="loadInfoOfSmallFilesFirst", size="is-default", type="is-info", :native-value="true") Small files first
                                    b-tooltip(label="(NOT recommended) Processing small files' spectrograms first may cause the file list to be behave \"jumpy\" during spectrogram processing", multilined, position="is-top"): em.icon--info
                            td
    

            footer.modal-card-foot
                .dialog__buttons.dialog__buttons--spread
                    a.configDialog__configFileLink(role="button", @click="gotoConfigFile", :title="configFilePath") 
                        span.icon--extern 
                        | &nbsp;Configuration File
                    button.button.is-primary.is-light(@click="close") Close
    
</template>

<script>
    import { mapGetters } from 'vuex'
    import { selectSingleDirectory } from '@/helpers/dialogHelper'
    import nodeFs from 'fs' 
    import nodePath from 'path'
    import { sync } from 'vuex-pathify'
    import { 
        FFMPEG_PAGE_URL, SPECTROGRAM_SIZE_STEPPING,
        RECOMMENDED_PARALLEL_SPECTROGRAM_JOBS,
        RECOMMENDED_PARALLEL_METADATA_JOBS,
        TOTAL_LOGICAL_OR_PHYSICAL_CORES,
        LINEAR_SPECTROGRAM_DIR_INFO_FILE_CONTENT
    } from '@/constants'

    export default {
        data: () => ({
            isPreviewingVSpace: false
        }),
        computed: {
            ...mapGetters('config', [
                'isFfmpegConfigured',
                'fileManagerName',
                'configFilePath',
                'isUsingDefaultLinearSpectrogramDir'
            ]),
            ...sync([
                'config/linearSpectrogramDir',
                'config/ffmpegExecutablePath',
                'config/ffprobeExecutablePath',
                'config/metadataConcurrency',
                'config/spectrogramConcurrency',
                'config/loadInfoOfSmallFilesFirst',
                'config/fileManagerExecutablePath',
                'config/editorExecutablePath',
                'config/targetDirLimit',
                'config/disableSpectrogramsOnDirChange',
                'config/spectrogramSourceFileSizeLimitInMb',
                'config/spectrogramSourceFileDurationLimitInMins',
                'config/sourceFileLimit',
                'config/canMousewheelCloseSpectrograms',
                'config/minMousewheelSourceItemWidth',
                'config/duplicateCheckQuickMode',
                'config/sourceItemVSpace',
                'config/doubleClickTargetSetsSource'
            ])
        },
        watch: {
            sourceItemVSpace() {
                // auto-reduce the modal background opacity when the user fiddles with vspace 
                let modalBackgroundElem = !this.isPreviewingVSpace && document.querySelector('.modal-background');
                if (modalBackgroundElem) {
                    modalBackgroundElem.style.opacity = 0.5;
                    this.isPreviewingVSpace = true;
                }
            }
        },
        methods: {
            openFfmpegPageInBrowser() {
                this.$electron.shell.openExternal(FFMPEG_PAGE_URL);
            },
            openInBrowser(url) {
                this.$electron.shell.openExternal(url);
            },
            configureLinearSpectrogramDir() {
                selectSingleDirectory({title: 'Please folder for temporary spectrogram files', preselectedPath: this.linearSpectrogramDir})
                    .then(selectedPath => selectedPath && new Promise((resolve, reject) => {
                        let testFile = nodePath.join(selectedPath, '.sample-commander-info.txt'),
                            testFileContent = LINEAR_SPECTROGRAM_DIR_INFO_FILE_CONTENT + new Date().toLocaleString();
                        
                        nodeFs.writeFile(testFile, testFileContent, err => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            resolve(selectedPath);
                        });
                    }))
                    .then(checkedDir => this.linearSpectrogramDir = checkedDir)
                    .catch(err => {
                        this.$log.warn('Failed to configure temporary spectrogram files folder: %s', err);
                        this.$buefy.toast.open({
                            message: 'No folder or folder is not writable',
                            type: 'is-danger',
                            queue: false
                        })
                    });
            },
            close() {
                this.$emit('input', null);
            },
            gotoConfigFile() {
                this.$emitGlobal('show-path-in-explorer', this.configFilePath);
            },
            gotoLinearSpectrogramDir() {
                this.$emitGlobal('show-path-in-explorer', this.linearSpectrogramDir);
            }
        },
        created() {
            Object.assign(this, {
                SPECTROGRAM_SIZE_STEPPING, 
                RECOMMENDED_PARALLEL_METADATA_JOBS, 
                RECOMMENDED_PARALLEL_SPECTROGRAM_JOBS,
                TOTAL_LOGICAL_OR_PHYSICAL_CORES
            });
            this.$onGlobal('close-dialog-requested', () => this.close());
        }
    }
    
    
</script>

<style lang="scss">

    @import '~@/styles/configDialog';

</style>
