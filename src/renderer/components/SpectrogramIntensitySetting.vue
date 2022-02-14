<template lang="pug">

    .toolbar__group(v-if="spectrogramSize", @wheel.prevent="changeByWheel")
        .toolbar__groupLabel.toolbar__groupLabel--intensity
            a(role="button", title="Increase the contrast of spectrograms (spectrogram files remain untouched)",
                @click="isIntensitySliderVisible = !isIntensitySliderVisible", @contextmenu="resetIntensity")
                span.icon--contrast &nbsp; 
                | Spectrogram Intensity:

        input.slider(v-if="spectrogramSize && isIntensitySliderVisible", v-model.number="spectrogramIntensity",
                     @contextmenu="resetIntensity", type="range", :min="MIN_INTENSITY", :max="MAX_INTENSITY", step="1", style="margin-right: 10px")
        // - b-tooltip(v-if="spectrogramSize && isIntensitySliderVisible", label="asd", multilined, position="is-right"): em.icon--info

        .toolbar__groupLabel(v-if="spectrogramSize && !isIntensitySliderVisible", style="padding-left: 0; margin-left: -5px")
            a(role="button", @click="isIntensitySliderVisible = !isIntensitySliderVisible", @contextmenu="resetIntensity"). 
                {{ spectrogramIntensity === MIN_INTENSITY ? 'normal' : `+${spectrogramIntensity - MIN_INTENSITY}%`}}

</template>

<script>
    import { sync } from 'vuex-pathify'
    
    const MIN_INTENSITY = 100;
    const MAX_INTENSITY = 200;
    
    export default {
        data: () => ({
            isIntensitySliderVisible: false
        }),
        computed: {
            ...sync([
                'spectrogramSize',
                'config/spectrogramIntensity'
            ])
        },
        methods: {
            resetIntensity() {
                this.isIntensitySliderVisible = false;
                this.spectrogramIntensity = 100;
            },
            changeByWheel(e) {
                e.preventDefault();
                let diff = e.deltaY < 0 ? 5 : -5;
                this.spectrogramIntensity = Math.max(MIN_INTENSITY, Math.min(MAX_INTENSITY, this.spectrogramIntensity + diff));
            }
        },
        created() {
            Object.assign(this, {MIN_INTENSITY, MAX_INTENSITY});    
        }
    }
    
</script>

<style lang="scss">
    
</style>
