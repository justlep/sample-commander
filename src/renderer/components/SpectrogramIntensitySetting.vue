<template lang="pug">

    .toolbar__group(v-if="spectrogramSize")
        div(style="display:none", v-html="spectrogramStyleHtml")
            
        .toolbar__groupLabel.toolbar__groupLabel--intensity
            a(role="button", title="Increase the contrast of spectrograms (spectrogram files remain untouched)",
                @click="isIntensitySliderVisible = !isIntensitySliderVisible", @contextmenu="resetIntensity")
                span.icon--contrast &nbsp; 
                | Spectrogram Intensity:

        input.slider(v-if="spectrogramSize && isIntensitySliderVisible", v-model.number="spectrogramIntensity",
                     @contextmenu="resetIntensity", type="range", min="100", max="200", step="1", style="margin-right: 10px")
        // - b-tooltip(v-if="spectrogramSize && isIntensitySliderVisible", label="asd", multilined, position="is-right"): em.icon--info

        .toolbar__groupLabel(v-if="spectrogramSize && !isIntensitySliderVisible", style="padding-left: 0; margin-left: -5px")
            a(role="button", @click="isIntensitySliderVisible = !isIntensitySliderVisible", @contextmenu="resetIntensity"). 
                {{ spectrogramIntensity === 100 ? 'normal' : `+${spectrogramIntensity - 100}%`}}

</template>


<script>
    import { sync } from 'vuex-pathify'
    
    export default {
        data: () => ({
            isIntensitySliderVisible: false
        }),
        computed: {
            ...sync([
                'spectrogramSize',
                'config/spectrogramIntensity'
            ]),
            spectrogramStyleHtml() {
                let intensity = this.spectrogramIntensity;
                return (intensity !== 100) ? `<style type="text/css">.spectro, .spectro__progress {filter: saturate(${this.spectrogramIntensity}%) brightness(${this.spectrogramIntensity}%)})</style>` : '';
            }
        },
        methods: {
            resetIntensity() {
                this.isIntensitySliderVisible = false;
                this.spectrogramIntensity = 100;
            }
        }
    }
    
</script>

<style lang="scss">
    
</style>
