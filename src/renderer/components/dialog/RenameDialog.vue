<template lang="pug">

    .modal.is-active
        .modal-background(@click="close")
        .modal-card
            header.modal-card-head
                p.modal-card-title Rename {{ relativeTotalString }}
            section.modal-card-body
                
                .dialog__box(@keyup.enter="start()")
                    .rename__formRow
                        .rename__field(ref="targetPatternWrapperElem")
                            label.gb-field-label.gb-field-input__label Filename
                                a.rename__insertLink(@click="insertFilenamePlaceholder()") Original filename
                                a.rename__insertLink(@click="insertCounterPlaceholder()") Counter
                                a.rename__insertLink(@click="resetTargetPattern()") Reset
                            gb-input(v-model="targetPattern", size="mini", autocomplete=false, name="") 
                        .rename__field.rename__field--small: gb-input(v-model="counterStart", type="number", :min=1, size="mini", autocomplete=false, label="Counter Start", name="")
                        .rename__field.rename__field--small: gb-input(v-model="digits", type="number", :min=1, :max=10, size="mini", autocomplete=false, label="Digits", name="")
                        .rename__field.rename__field--small: gb-input(v-model="stepping", type="number", :min=1, size="mini", autocomplete=false, label="Stepping", name="")
                    .rename__formRow
                        .rename__field
                            label.gb-field-label.gb-field-input__label Search &nbsp;  
                                b-checkbox(size="is-small", v-model="isSearchIgnoreCase") Ignore Case
                                b-checkbox(size="is-small", v-model="isSearchRegex", :type="hasErrorInRegex ? 'is-warning' : 'is-normal'") Regex
                                b-checkbox(v-if="isSearchRegex", size="is-small", v-model="isSearchRegexGlobal") Global Regex
                            gb-input(v-model="search", size="mini", autocomplete=false, name="", :status="hasErrorInRegex ? 'warning' : 'normal'")
                        .rename__field.rename__field--replace
                            label.gb-field-label.gb-field-input__label Replace &nbsp;
                                small(v-if="isSearchRegex") (Use $1..$n for captured groups)
                            gb-input(v-model="replace", size="mini", autocomplete=false, name="")
                    .rename__formRow.rename__formRow--reset
                        button.button.is-small.is-primary(@click="resetForm") Reset Form
            
                br
                
                .dialog__box
                    table.dialog__table.dialog__table--hoverLines
                        thead: tr
                            th 
                            th Original filename
                            th New filename
                            th Status
                        tbody: tr(v-for="wrapper in processableItemWrappers", :class="wrapper.isIncluded ? '' : 'dialog--excluded'")
                            td: input(type="checkbox", v-model="wrapper.isIncluded", :disabled="isBusy", :id="wrapper.checkboxId")
                            td: label(:for="wrapper.checkboxId") {{ wrapper.oldFilename }}
                            td: label(:for="wrapper.checkboxId", :class="wrapper.canRename() ? '' : 'dialog--excluded'") {{ wrapper.newFilename }}
                            td
                                b-tag(v-if="wrapper.isProcessed", type="is-success") Renamed
                                b-tag(v-if="wrapper.error", type="is-danger") {{ wrapper.error }}
                            
            footer.modal-card-foot
                .dialog__buttons.dialog__buttons--spread
                    .field: b-checkbox(v-model="includeSpectrograms", type="is-info is-small") Rename spectrograms, too
                    span
                        button.button.is-light(@click="close") {{ isBusy || !isStarted ? 'Cancel' : 'Close' }}
                        button.button.is-danger(:disabled="!canStart", @click="start") Rename {{ relativeTotalString }}
</template>

<script>
    import nodePath from 'path' 
    import {pathExists, rename} from '@/helpers/fileHelper'
    import FileItem from '@/model/FileItem'
    import ItemCollection from '@/helpers/ItemCollection'
    import RenamableProcessableItemWrapper from '@/helpers/RenamableProcessableItemWrapper'
    
    const ORIGINAL_NAME_PLACEHOLDER = '[N]';
    const ORIGINAL_NAME_PLACEHOLDER_REGEX = /\[N\]/g;
    const COUNTER_PLACEHOLDER = '[C]';
    const COUNTER_PLACEHOLDER_REGEX = /\[C\]/g;
    const DEFAULT_COUNTER_START = 1;
    const DEFAULT_DIGITS = 2;
    
    export default {
        props: {
            value: ItemCollection
        },
        data: () => ({
            isStarted: false,
            isBusy: false,
            /** @type {RenamableProcessableItemWrapper[]} */
            processableItemWrappers: [],
            targetPattern: ORIGINAL_NAME_PLACEHOLDER,
            counterStart: DEFAULT_COUNTER_START,
            digits: DEFAULT_DIGITS,
            stepping: 1,
            search: '',
            isSearchRegex: false,
            isSearchIgnoreCase: true,
            isSearchRegexGlobal: false,
            replace: '',
            includeSpectrograms: true
        }),
        computed: {
            totalFiles() {
                return this.processableItemWrappers.length;
            },
            validRegex() {
                let regexString = this.isSearchRegex && this.search,
                    regex = null;    
                
                if (regexString) {
                    try {
                        regex = new RegExp(`(${regexString})`, `${this.isSearchIgnoreCase ? 'i' : ''}${this.isSearchRegexGlobal ? 'g' : ''}`);
                    } catch (err) {
                        // nothing
                    }
                }
                return regex;
            },
            totalRenamableItems() {
                if (this.isStarted) {
                    return this.$options.lastTotalRenamableItems;
                }
                
                let totalRenamable = 0,
                    trimmedTargetPattern = (this.targetPattern || '').trim(),
                    counterStart = isNaN(this.counterStart) ? DEFAULT_COUNTER_START : Math.round(this.counterStart),
                    counterStepsize = parseInt(this.stepping, 10) || 1,
                    counterDigits = parseInt(this.digits, 10) || DEFAULT_DIGITS,
                    counter = counterStart,
                    includedCounter = 0;
                
                this.processableItemWrappers.forEach(processableWrapper => {
                    let counterStr = String(counter + (counterStepsize * includedCounter)).padStart(counterDigits, '0'),
                        newBasename = processableWrapper.oldBasename;
                    
                    if (!processableWrapper.isIncluded) {
                        processableWrapper.newFilename = '';
                        return;
                    }

                    if (trimmedTargetPattern) {
                        newBasename = trimmedTargetPattern.replace(ORIGINAL_NAME_PLACEHOLDER_REGEX, newBasename)
                                                          .replace(COUNTER_PLACEHOLDER_REGEX, counterStr);
                    }

                    if (this.search) {
                        let replacement = (this.replace || '').replace(COUNTER_PLACEHOLDER_REGEX, counterStr).replace(/[:\\/]/g, '');
                        
                        if (!this.isSearchRegex) {
                            if (this.isSearchIgnoreCase) {
                                newBasename = this.searchReplaceIgnoreCase(newBasename, this.search, replacement);
                            } else  {
                                newBasename = newBasename.split(this.search).join(replacement);
                            }
                        } else if (this.validRegex) {
                            // inc capture group indexes (since $1 in String.replace is the full match, not the first captured group) 
                            replacement = replacement.replace(/\$(\d+)/g, (m, n) => `$${parseInt(n) + 1}`);
                            newBasename = newBasename.replace(this.validRegex, replacement);
                        }
                    }

                    newBasename = newBasename.replace(/\s{2,}/g, ' ').trim();

                    processableWrapper.newFilename = newBasename + processableWrapper.oldExt;
                    
                    includedCounter++;
                    if (processableWrapper.canRename()) {
                        totalRenamable++;
                    }
                });

                this.$options.lastTotalRenamableItems = totalRenamable;

                return totalRenamable;
            },
            canStart() {
                return !this.isBusy && !this.isStarted && this.totalRenamableItems;
            },
            hasErrorInRegex() {
                return !!(this.search && this.isSearchRegex && !this.validRegex);
            },
            relativeTotalString() {
                let totalSelectable = this.processableItemWrappers.length,
                    totalSelected = this.totalRenamableItems;

                return ((totalSelected === totalSelectable) ? String(totalSelected) : `${totalSelected} of ${totalSelectable}`) 
                    + (totalSelectable !== 1 ? ' files' : ' file');
            }
        },
        methods: {
            /**
             * @param {string} original
             * @param {string} search
             * @param {string} replacement
             * @return {string}
             */
            searchReplaceIgnoreCase(original, search, replacement) {
                let originalLowercase = original.toLowerCase(),
                    searchLowercase = this.search.toLowerCase(),
                    nextStartIndex = 0,
                    result = '';

                while (nextStartIndex >= 0) {
                    let foundIndex = originalLowercase.indexOf(searchLowercase, nextStartIndex);
                    if (foundIndex >= 0) {
                        result += original.substr(nextStartIndex, foundIndex - nextStartIndex) + replacement;
                        nextStartIndex = foundIndex + this.search.length;
                    } else {
                        result += original.substr(nextStartIndex);
                        nextStartIndex = -1;
                    }
                }
                return result;
            },
            resetTargetPattern() {
                this.targetPattern = this.totalFiles === 1 ? this.processableItemWrappers[0].oldBasename : ORIGINAL_NAME_PLACEHOLDER;
                this.$nextTick(() => this.focusTargetPattern({select: true}));
            },
            resetForm() {
                this.resetTargetPattern();
                this.counterStart = DEFAULT_COUNTER_START;
                this.digits = DEFAULT_DIGITS;
                this.stepping = 1;
                this.search = '';
                this.isSearchRegex = false;
                this.isSearchRegexGlobal = false;
                this.isSearchIgnoreCase = true;
                this.replace = '';
            },
            focusTargetPattern({select = false, newCursorPosition = null}) {
                let elem = this.$options.targetPatternTextfieldElem;
                elem.focus();
                if (select) {
                    elem.select();
                } else if (typeof newCursorPosition === 'number') {
                    this.$nextTick(() => {
                        elem.selectionStart = newCursorPosition;
                        elem.selectionEnd = newCursorPosition;
                    });
                }
            },
            /**
             * @param {string} placeholder
             */
            insertToTargetPatternTextfield(placeholder) {
                let elem = this.$options.targetPatternTextfieldElem,
                    startIndex = Math.min(elem.selectionStart || 0, this.targetPattern.length),
                    endIndex = Math.min(elem.selectionEnd || 0, Math.max(0, this.targetPattern.length)),
                    s = this.targetPattern,
                    newCursorPosition = startIndex + placeholder.length;
                
                this.targetPattern = s.substr(0, startIndex) + placeholder + s.substr(endIndex);
                
                this.focusTargetPattern({newCursorPosition});
            },
            insertFilenamePlaceholder() {
                this.insertToTargetPatternTextfield(ORIGINAL_NAME_PLACEHOLDER)
            },
            insertCounterPlaceholder() {
                this.insertToTargetPatternTextfield(COUNTER_PLACEHOLDER);
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
                        await rename(oldFilePath, newFilePath);
                        hasAnythingChanged = true;
                        processableItemWrapper.setProcessed();
                        item.setRenamed(newFilePath);
                    } catch (err) {
                        this.$log.warn(`Failed to rename %s to %s. Error: %o`, oldFilePath, newFilePath, err);
                        processableItemWrapper.error = 'Failed to rename';
                    }
                    
                    // optionally: rename spectrogram file 
                    if (processableItemWrapper.isProcessed && this.includeSpectrograms && item.supportsSpectrograms) {
                        let oldSpectrogramPath = item.getSpectrogramPath(),
                            newSpectrogramPath = FileItem.getSpectrogramPathByAudioFilePath(newFilePath);
                        
                        try {
                            if (await pathExists(oldSpectrogramPath)) {
                                if (await pathExists(newSpectrogramPath)) {
                                    processableItemWrapper.error = 'File renamed, but spectrogram already exists';
                                } else {
                                    await rename(oldSpectrogramPath, newSpectrogramPath);
                                }
                            }
                        } catch (err) {
                            this.$log.warn(`Failed to rename %s to %s. Error: %o`, oldSpectrogramPath, newSpectrogramPath, err);
                            processableItemWrapper.error = `File renamed, but spectrogram failed`;
                        }  
                    }
                }

                this.isBusy = false;
                if (hasAnythingChanged) {
                    this.$emitGlobal('files-renamed-or-deleted');
                }
                if (!this.processableItemWrappers.find(w => w.error)) {
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
        created() {
            this.cancellationToken = this.$createCancellationToken();
            this.processableItemWrappers = this.value.getItems().map(fileItem => new RenamableProcessableItemWrapper(fileItem));
            this.$emitGlobal('player-should-reset');
            this.$onGlobal('close-dialog-requested', () => this.close());
        },
        mounted() {
            this.$options.targetPatternTextfieldElem = this.$refs.targetPatternWrapperElem.querySelector('input[type=text]');
            this.resetTargetPattern();
        }
    }

</script>

<style lang="scss">

    @import '~@/styles/rename';

</style>
