<template lang="pug">
    
    .filter__wrap 
        .filter__input(ref="filterWrapElem", :class="filter ? 'filter__input--filtered' : ''", title="Hotkey: Strg+F")
            gb-input(v-model="filter", size="mini", autocomplete=false, name="filter", type="search", placeholder="Filter...")
        
        button.button.is-small.is-primary.filter__resetBtn(v-if="filter", @click="filter = ''") Reset Filter
        
        b-radio.filter__mode(v-model="duplicateModeId", size="is-default", type="is-info", 
                             :native-value="mode.id", v-for="mode in DUPLICATE_MODES", :key="mode.id") {{ mode.name }}

        .toolbar__groupPlaceholder
            
        SpectrogramIntensitySetting

        .toolbar__group
            a(role="button", @click="$emitGlobal('show-help-dialog')")
                span.icon--help
                |  Help 


</template>

<script>
    import { sync } from 'vuex-pathify'
    import {DUPLICATE_MODE, HOTKEY_FILTER_FOCUS} from '@/constants'
    import SpectrogramIntensitySetting from '@/components/SpectrogramIntensitySetting'
    
    export default {
        computed: {
            ...sync([
                'files/duplicateMode',
                'files/filter'
            ]),
            duplicateModeId: {
                get() { return this.duplicateMode.id },
                set(modeId) {
                    let newMode = DUPLICATE_MODE[modeId];
                    this.$assertObject(newMode, 'Invalid modeId: %s', modeId);
                    this.duplicateMode = newMode;
                }
            }
        },
        methods: {
            focusFilter() {
                if (!this.$isModalDialogVisible()) {
                    this.$refs.filterWrapElem.querySelector('input').focus();
                }
            }
        },
        created() {
            this.DUPLICATE_MODES = Object.values(DUPLICATE_MODE);
            this.$mousetrap.bind(HOTKEY_FILTER_FOCUS, this.focusFilter);
        },
        beforeDestroy() {
            this.$mousetrap.unbind(HOTKEY_FILTER_FOCUS, this.focusFilter);
        },
        components: {
            SpectrogramIntensitySetting
        }
    }
    
</script>

<style lang="scss">
    
    @import '~@/styles/filter';
    
</style>
