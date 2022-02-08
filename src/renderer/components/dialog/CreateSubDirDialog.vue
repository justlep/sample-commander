<template lang="pug">

    .modal.is-active
        .modal-background(@click="cancel")
        .modal-card
            header.modal-card-head
                p.modal-card-title Create subfolder
            section.modal-card-body
                .dialog__box
                    b-field(label="Directory name", :message="error || message", :type="error ? 'is-danger' : ''")
                        b-input#__newName(v-model="newName", maxlength="255", @keyup.native.enter="start")
            footer.modal-card-foot
                .dialog__buttons
                    button.button.is-light(@click="cancel") Cancel
                    button.button.is-primary(:disabled="!canStart", @click="start") Create
    
</template>

<script>
    import path from 'path'
    import ItemWrapper from '@/helpers/ItemWrapper'
    import {mkdir} from '@/helpers/fileHelper'
    
    const FORBIDDEN_CHARS_REGEX = /[/\\:~|"<>]|(\.\.)/;
    
    export default {
        props: {
            value: ItemWrapper
        },
        data: () => ({
            isBusy: false,
            newName: '',
            error: ''
        }),
        computed: {
            parentPath() {
                return this.value.getItem().path;
            },
            submittableName() {
                return (this.newName || '').trim();
            },
            canStart() {
                return !this.isBusy && this.submittableName && !FORBIDDEN_CHARS_REGEX.test(this.submittableName);   
            },
            validNewFullPath() {
                return this.canStart ? path.join(this.parentPath, this.submittableName) : ''
            },
            message() {
                return this.validNewFullPath ? `Becomes: ${this.validNewFullPath}` : undefined;
            }
        },
        methods: {
            async start() {
                let subdirPath = this.validNewFullPath,
                    shouldClose = false;
                
                if (!subdirPath) {
                    this.$log.warn('Cannot create subdir');
                    return;
                }
                this.isBusy = true;
                this.error = false;
                
                try {
                    await mkdir(subdirPath);
                    this.$emitGlobal('subdir-created', {path: subdirPath});
                    shouldClose = true;
                } catch (err) {
                    this.$log.warn(err);
                    this.error = 'Could not create subfolder';
                }
                this.isBusy = false;
                if (shouldClose) {
                    return this.close();
                }
            },
            cancel() {
                if (!this.isBusy) {
                    this.close();
                }
            },
            close() {
                this.$emit('input', null);
            }
        },
        mounted() {
            this.$el.querySelector('#__newName').focus();
            this.$onGlobal('close-dialog-requested', () => this.cancel());
        }
    }

</script>
