<!-- 
    Component based on the tutorial on:
    https://vuejsexamples.com/html5-basic-audio-player-with-vue-js/
-->

<template lang="pug">
    mixin svgIcon(name)
        svg.svg-button(xmlns="http://www.w3.org/2000/svg", viewBox="0 0 20 20"): use(xlink:href="#def-"+name)
    mixin svgIconConditional(hrefExpression)
        svg.svg-button(xmlns="http://www.w3.org/2000/svg", viewBox="0 0 20 20"): use(:xlink:href=hrefExpression)
    
    .player__container(:class="{'player--playing': playing}")
        svg(viewBox="0 0 20 20", style="display:none"): defs
            path#def-stop(fill="currentColor", d="M16,4.995v9.808C16,15.464,15.464,16,14.804,16H4.997C4.446,16,4,15.554,4,15.003V5.196C4,4.536,4.536,4,5.196,4h9.808C15.554,4,16,4.446,16,4.995z")
            path#def-play(fill="currentColor", d="M15,10.001c0,0.299-0.305,0.514-0.305,0.514l-8.561,5.303C5.51,16.227,5,15.924,5,15.149V4.852c0-0.777,0.51-1.078,1.135-0.67l8.561,5.305C14.695,9.487,15,9.702,15,10.001z")
            path#def-pause(fill="currentColor", d="M15,3h-2c-0.553,0-1,0.048-1,0.6v12.8c0,0.552,0.447,0.6,1,0.6h2c0.553,0,1-0.048,1-0.6V3.6C16,3.048,15.553,3,15,3z M7,3H5C4.447,3,4,3.048,4,3.6v12.8C4,16.952,4.447,17,5,17h2c0.553,0,1-0.048,1-0.6V3.6C8,3.048,7.553,3,7,3z")
            path#def-download(fill="currentColor", d="M15,7h-3V1H8v6H5l5,5L15,7z M19.338,13.532c-0.21-0.224-1.611-1.723-2.011-2.114C17.062,11.159,16.683,11,16.285,11h-1.757l3.064,2.994h-3.544c-0.102,0-0.194,0.052-0.24,0.133L12.992,16H7.008l-0.816-1.873c-0.046-0.081-0.139-0.133-0.24-0.133H2.408L5.471,11H3.715c-0.397,0-0.776,0.159-1.042,0.418c-0.4,0.392-1.801,1.891-2.011,2.114c-0.489,0.521-0.758,0.936-0.63,1.449l0.561,3.074c0.128,0.514,0.691,0.936,1.252,0.936h16.312c0.561,0,1.124-0.422,1.252-0.936l0.561-3.074C20.096,14.468,19.828,14.053,19.338,13.532z")
            path#def-once(fill="currentColor", d="M1,12V5h3v6h10V8l5,4.5L14,17v-3H3C1.895,14,1,13.104,1,12z")
            path#def-loop(fill="currentColor", d="M20,7v7c0,1.103-0.896,2-2,2H2c-1.104,0-2-0.897-2-2V7c0-1.104,0.896-2,2-2h7V3l4,3.5L9,10V8H3v5h14V8h-3V5h4C19.104,5,20,5.896,20,7z")
            path#def-muted(fill="currentColor", d="M5.312,4.566C4.19,5.685-0.715,12.681,3.523,16.918c4.236,4.238,11.23-0.668,12.354-1.789c1.121-1.119-0.335-4.395-3.252-7.312C9.706,4.898,6.434,3.441,5.312,4.566z M14.576,14.156c-0.332,0.328-2.895-0.457-5.364-2.928C6.745,8.759,5.956,6.195,6.288,5.865c0.328-0.332,2.894,0.457,5.36,2.926C14.119,11.258,14.906,13.824,14.576,14.156zM15.434,5.982l1.904-1.906c0.391-0.391,0.391-1.023,0-1.414c-0.39-0.391-1.023-0.391-1.414,0L14.02,4.568c-0.391,0.391-0.391,1.024,0,1.414C14.41,6.372,15.043,6.372,15.434,5.982z M11.124,3.8c0.483,0.268,1.091,0.095,1.36-0.388l1.087-1.926c0.268-0.483,0.095-1.091-0.388-1.36c-0.482-0.269-1.091-0.095-1.36,0.388L10.736,2.44C10.468,2.924,10.642,3.533,11.124,3.8z M19.872,6.816c-0.267-0.483-0.877-0.657-1.36-0.388l-1.94,1.061c-0.483,0.268-0.657,0.878-0.388,1.36c0.268,0.483,0.877,0.657,1.36,0.388l1.94-1.061C19.967,7.907,20.141,7.299,19.872,6.816z")
            path#def-unmuted(fill="currentColor", d="M14.201,9.194c1.389,1.883,1.818,3.517,1.559,3.777c-0.26,0.258-1.893-0.17-3.778-1.559l-5.526,5.527c4.186,1.838,9.627-2.018,10.605-2.996c0.925-0.922,0.097-3.309-1.856-5.754L14.201,9.194z M8.667,7.941c-1.099-1.658-1.431-3.023-1.194-3.26c0.233-0.234,1.6,0.096,3.257,1.197l1.023-1.025C9.489,3.179,7.358,2.519,6.496,3.384C5.568,4.31,2.048,9.261,3.265,13.341L8.667,7.941z M18.521,1.478c-0.39-0.391-1.023-0.391-1.414,0L1.478,17.108c-0.391,0.391-0.391,1.024,0,1.414c0.391,0.391,1.023,0.391,1.414,0l15.629-15.63C18.912,2.501,18.912,1.868,18.521,1.478z")
            path#def-vol(fill="currentColor", d="M19,13.805C19,14.462,18.462,15,17.805,15H1.533c-0.88,0-0.982-0.371-0.229-0.822l16.323-9.055C18.382,4.67,19,5.019,19,5.9V13.805z")
            
        .player__controls
            a(@click.prevent="stop", title="Stop", role="button")
                +svgIcon('stop')    
                    
            a(@click.prevent="togglePlay", title="Play/Pause", role="button")
                +svgIconConditional("playing ? '#def-pause' : '#def-play'")
            .player__progress(v-show="loaded", @click="seekByClick", ref="progressElem", @contextmenu.prevent="togglePlay")
                .player__time {{ currentTime }}
                .player__time {{ durationTime }}
                .player__seeker(:style="{ transform: 'translate(' + (this.percentComplete - 100) + '%, 0)'}")
            div(v-if="isDownloadEnabled"): a(@click.prevent="download", role="button")
                +svgIcon('download')
            a(@click.prevent="innerLoop = !innerLoop", role="button")
                +svgIconConditional("innerLoop ? '#def-loop' : '#def-once'")
            a(@click.prevent="$emit('toggle-autoplay')", title="Autoplay", role="button")
                .player__letter(:class="{'player__letter--disabled': !autoplay}") A
            a(@click.prevent="mute", title="Mute", role="button")
                +svgIconConditional("muted ? '#def-unmuted' : '#def-muted'")
            div(style="display:flex") 
                a(@click.prevent="isVolumeVisible = !isVolumeVisible", title="Volume", role="button")
                    +svgIcon('vol')
                transition(name="fade")
                    input.slider.player__vol(v-if="isVolumeVisible", v-model.number="volume", type="range", min="0", max="100")
        audio(:loop="innerLoop", :autoplay="autoplay", ref="audioElem", :src="file || ''", preload="metadata", style="display: none;")

</template>

<script>
    import {HOTKEY_TOGGLE_PLAY, HOTKEY_STOP_PLAYER} from '@/constants'
    
    const convertTimeHHMMSS = (val) => {
        let hhmmss = new Date((val * 1000) << 0).toISOString().substr(11, 8);
        return hhmmss.indexOf("00:") === 0 ? hhmmss.substr(3) : hhmmss;
    };
    
    export default {
        props: {
            file: {
                type: String,
                default: null
            },
            autoplay: {
                type: Boolean,
                default: false
            },
            loop: {
                type: Boolean,
                default: false
            }
        },
        data: () => ({
            currentSeconds: 0,
            durationSeconds: 0,
            innerLoop: false,
            loaded: false,
            playing: false,
            previousVolume: 35,
            isVolumeVisible: false,
            volume: 100,
            isDownloadEnabled: false
        }),
        computed: {
            currentTime() {
                return convertTimeHHMMSS(this.currentSeconds);
            },
            durationTime() {
                return convertTimeHHMMSS(this.durationSeconds);
            },
            percentComplete() {
                if (!this.loaded) {
                    return 0;
                }
                let totalDuration = this.durationSeconds;
                return totalDuration ? (this.currentSeconds / this.durationSeconds * 100) : 0;
            },
            muted() {
                return this.volume / 100 === 0;
            }
        },
        watch: {
            percentComplete(percent) {
                this.$emit('player-reports-position-in-percent', percent);
            },
            playing(isPlaying) {
                if (isPlaying) { 
                    return this.$refs.audioElem.play();
                }
                this.$refs.audioElem.pause();
            },
            volume(/* value */) {
                this.$refs.audioElem.volume = this.volume / 100;
                this._shouldAutoCloseAfter = Date.now() + 1200;
                if (!this._autoClosingTimer) {
                    this._autoClosingTimer = setInterval(() => {
                        if (Date.now() >= this._shouldAutoCloseAfter) {
                            this._autoClosingTimer = void clearInterval(this._autoClosingTimer);
                            this.isVolumeVisible = false;
                        }
                    }, 405);
                }
            },
            autoplay(isAutoplayEnabled) {
                if (!isAutoplayEnabled) {
                    this.stop();
                }
            }
        },
        methods: {
            // download() {
            //     this.stop();
            //     window.open(this.file, 'download');
            // },
            mute() {
                if (this.muted) {
                    return this.volume = this.previousVolume;
                }

                this.previousVolume = this.volume;
                this.volume = 0;
            },
            seekByClick(e) {
                if (!this.file || !this.loaded) {
                    return;
                }
                
                let boundingBox = this.$refs.progressElem.getBoundingClientRect(),
                    seekPos = (e.clientX - boundingBox.left) / boundingBox.width;

                this.seekByFactor(seekPos);
            },
            /**
             * @param {number} factor - a normalize seek position [0..1]
             */
            seekByFactor(factor) {
                if (!this.loaded) {
                    this._seekFactorWhenReady = factor;
                    return;
                } 
                this._seekFactorWhenReady = null;
                let audioElem = this.$refs.audioElem,
                    effectivePosition = audioElem.duration * factor;
                // this.$log.dev('seekfactor: %o, duration: %o, effectivePosition = %o', factor, audioElem.duration, effectivePosition);
                audioElem.currentTime = effectivePosition;
                
                if (!this.playing && this.autoplay) {
                    this.playing = true;
                }
            },
            togglePlay() {
                if (this.file) {
                    this.playing = !this.playing;
                }
                return false;
            },
            stop() {
                this.playing = false;
                this.$refs.audioElem.currentTime = 0;
                return false;
            },
            onAudioTimeupdate() {
                this.currentSeconds = parseFloat(this.$refs.audioElem.currentTime);
            },
            onAudioLoadeddata() {
                if (this.$refs.audioElem.readyState >= 2) {
                    this.loaded = true;
                    this.durationSeconds = parseFloat(this.$refs.audioElem.duration);
                    if (this._seekFactorWhenReady !== null) {
                        this.seekByFactor(this._seekFactorWhenReady);
                    } else {
                        this.playing = this.autoplay;
                    }
                } else {
                    this.loaded = false;
                }
            },
            onAudioPause() {
                this.playing = false;
            },
            onAudioPlay() {
                this.playing = true;
            },
            onAudioError() {
                this.$log.warn('-----> oh oh, player error');
                this.loaded = false;
            },
            addOrRemoveAudioEventListeners(doRemove) {
                let audioElem = this.$refs.audioElem,
                    methodName = doRemove ? 'removeEventListener' : 'addEventListener';
                audioElem[methodName]('timeupdate', this.onAudioTimeupdate);
                audioElem[methodName]('loadeddata', this.onAudioLoadeddata);
                audioElem[methodName]('pause', this.onAudioPause);
                audioElem[methodName]('play', this.onAudioPlay);
                audioElem[methodName]('error', this.onAudioError);
            }
        },
        created() {
            this.innerLoop = this.loop;
        },
        mounted() {
            this._seekFactorWhenReady = null;
            this.addOrRemoveAudioEventListeners();
            this.$onGlobal('player-toggle-play', () => this.togglePlay());
            this.$onGlobal('player-seek-by-factor', ({factor, filename = ''}) => {
                if (filename && (!this.file || !this.file.endsWith(filename))) {
                    this._seekFactorWhenReady = factor;
                } else {
                    this.seekByFactor(factor)
                }
            });
            this.$mousetrap.bind(HOTKEY_TOGGLE_PLAY, this.togglePlay);
            this.$mousetrap.bind(HOTKEY_STOP_PLAYER, this.stop);
        },
        beforeDestroy() {
            this.addOrRemoveAudioEventListeners(true);
            this.$mousetrap.unbind(HOTKEY_TOGGLE_PLAY, this.togglePlay);
            this.$mousetrap.unbind(HOTKEY_STOP_PLAYER, this.stop);
        }
    }

</script>

<style lang="scss" scoped>
    $player-bg: #fff;
    $player-border-color: darken($player-bg, 12%);
    $player-link-color: darken($player-bg, 75%);
    $player-progress-color: $player-border-color;
    $player-text-color: $player-link-color;

    $progressPlayingColor: rgba(83, 148, 224, 0.2);
    $progressInactiveColor: rgba(83, 148, 224, 0.1);
    $player-seeker-color: rgba(83, 148, 224, 0.6);
    $player-seeker-inactive-color: #D1E1FE;
    
    .svg-button {
        width: 18px;
    }
    
    a[role="button"] {
        color: $player-link-color;
        display: block;
        line-height: 0;
        padding: 5px;
        text-decoration: none;
    }
    
    .player {
        &__container {
            background-color: $player-bg;
            border: 1px solid $player-border-color;
            border-radius: 4px;
            box-shadow: 0 5px 8px rgba(0, 0, 0, 0.15);
            color: $player-text-color;
            display: inline-block;
            line-height: 1.5625;
        }
        
        &__controls {
            display: flex;
            align-items: stretch;
            align-content: stretch;

            > * {
                border-right: 1px solid $player-border-color;
                user-select: none;

                &:last-child {
                    border-right: none;
                }
            }
        }

        &__letter {
            display: block;
            width: 18px;
            height: 12px;
            text-align: center;
            line-height: 20px;
            vertical-align: baseline;
            font-size: 16px;
            font-weight: bold;
            
            &--disabled {
                opacity: 0.4;
            }
        }
        
        &__progress {
            cursor: pointer;
            min-width: 200px;
            position: relative;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: $progressInactiveColor;
            border: 1px solid #b7b7b7;
            border-left-color: #ccc;
            border-right-color: #ccc;
            overflow: hidden;
            
            .player--playing & {
                background-color: $progressPlayingColor;
            }
        }
        
        &__seeker {
            background-color: $player-seeker-inactive-color;
            z-index: 5;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            transform: translate(-100%, 0);
            transition: transform 0.2s;
            
            .player--playing & {
                background-color: $player-seeker-color;
            }
        }
        
        &__time {
            font-weight: 700;
            z-index: 6;
            color: darken($player-seeker-color, 40%);
            padding: 0 5px;
            opacity: 0.3;
            
            .player--playing & {
                opacity: 1;
            }
        }
        
        &__vol {
            margin: 0 10px 0 0 !important;
        }
    }
</style>
