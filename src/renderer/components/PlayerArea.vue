<template lang="pug">
    
    .player__area
        AudioPlayer(:file="filePath", :autoplay="autoplay", 
                    @player-reports-position-in-percent="seekPercentage = $event",
                    @toggle-autoplay="autoplay = !autoplay")
        b.player__filename(:class="{'player__filename--nonempty': !!this.filePath}", @click="$emitGlobal('focus-played-file')",
                           @contextmenu="$emitGlobal('show-file-contextmenu', playedFileItem)").
            {{ displayedFilename }}
    
</template>

<script>
    import AudioPlayer from './AudioPlayer'
    
    import { get, sync } from 'vuex-pathify';
    
    export default {
        components: {
            AudioPlayer
        },
        computed: {
            ...get([
                'player/playedFileItem'
            ]),
            ...sync([
                'config/autoplay',
                'player/seekPercentage',
                'player/playedFileItemId'
            ]),
            filePath() {
                return this.playedFileItem && this.playedFileItem.path;
            }, 
            displayedFilename() {
                return (this.playedFileItem && this.playedFileItem.filename) || 'No file selected';
            }
        },
        created() {
            this.$onGlobal('player-should-reset', () => this.playedFileItemId = null);
        }
    }
    
</script>

<style lang="scss">
    @import '~@/styles/player';
</style>
