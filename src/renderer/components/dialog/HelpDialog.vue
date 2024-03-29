<template lang="pug">

    .modal.is-active
        .modal-background(@click="close")
        .modal-card
            header.modal-card-head
                p.modal-card-title(style="text-align:right")
                    span.icon--help
                    |  Help

                .customDirs__tabs
                    gb-tabs(name="foo", v-model="selectedTabValue", :tabs="TABS", size="small")
                    
            section.modal-card-body
                .dialog__box
                    .help__block(v-if="selectedTab.isShortcuts")
                        .help__content: table.help__table: tbody
                            tr
                                td [Shift] + Mousewheel
                                td File width (i.e. the horizontal raster inside the Source panel)*
                            tr
                                td [Ctrl] + Mousewheel
                                td Spectrogram heights*
                            tr
                                td [Rightclick]
                                td Show a context menu for following clicked elements:
                                    ul(style="padding-left: 15px")
                                        li - Source Panel header
                                        li - Source Panel files 
                                        li - Target Panel header
                                        li - Target Panel folders
                                    p Rightclicks on spectrograms will pause/unpause playback.
                            
                            tr(v-for="help in HOTKEY_DESCRIPTIONS")
                                td {{ help.hotkey }}
                                td {{ help.description }}

                        .help_footnote * [Shift] / [Ctrl] + Mousewheel can be combined for changing the horizontal and vertical layout of the Source Panel simultaneously     
                        
                    .help__block.help__block--systeminfo(v-if="selectedTab.isSystemInfo")
                        table.help__table.help__table--systemInfo 
                            tbody: tr(v-for="info in $options.systemInfo") 
                                td {{ info.name }}
                                td {{ info.value }}
                        
                    .help__block.help__block--about(v-if="selectedTab.isAbout")
                        p. 
                            Sample Commander is free, open-source software licensed under the 
                            <a role="button" @click="selectLicenseTab">GNU General Public License v3</a>,<br> 
                            intending to make it freely available and stay freely available.

                        p {{ COPYRIGHT }} &lt;<a style="user-select: all">{{ CONTACT_EMAIL }}</a>> 

                        p Feedback is welcome! :-)<br>
                        
                        | <b>Found a bug?</b> &nbsp; Please send a description along with your <a role="button" @click="gotoSystemInfo">System Info</a>. Thank you!

                        .help__hr
                        
                        dl.help__urls
                            dt The project on Github:
                            dd:  a(target="_blank", :href="REPO_URL") {{ REPO_URL }}
                            dt Releases for download:
                            dd: a(target="_blank", :href="RELEASES_URL") {{ RELEASES_URL }} 
                            dt Changelog:
                            dd: a(target="_blank", :href="CHANGELOG_URL") {{ CHANGELOG_URL }}
                            dt FFmpeg binaries:
                            dd.
                                For audio file analysis and conversions, Sample Commander requires some free, 
                                open-source FFmpeg executables.<br> 
                                Those executables do <b>not come bundled</b> with Sample Commander, 
                                but can be downloaded and used freely.<br>
                                <a target="_blank" :href="REPO_URL + '#setting-up-ffmpeg-once-only'">More info on the Github page</a>, including all links and details.
                                
                        .help__hr
                            
                        p.
                            Sample Commander also uses a couple of JavaScript modules and libraries provided under free licenses.<br>
                            More details on the project page. 
                        
                    .help__block(v-if="selectedTab.isLicense")
                        GPL3License
                        
                    .help__block.help__block--faq(v-if="selectedTab.isFaq")
                        p  Most questions may already be answered on the Github page:<br>
                            a(target="_blank", :href="REPO_URL") {{ REPO_URL }}
                        
                        | If something is still unclear, feel free to send me an email:<br>
                        a(style="user-select: all") {{ CONTACT_EMAIL }}
                        
                        .help__hr
                        dl.help__faq
                            dt Where are spectrogram images stored?
                            dd. 
                                Spectrogram images are saved in the same folder as their respective audio file.<br>
                                A spectrogram for some "sample.wav" will be saved as "sample.wav.SPX.png".
                            dt What's the difference between "Quick" and "Full Content" duplicates check?
                            dd. 
                                In "Quick mode", two same-sized files are checked for identity by reading only a few kilobytes in the middle the files.
                                This works very fast, but may cause false-positives e.g. if you modify fragments of a copied file "left or right of the middle" 
                                without effects on the file size (e.g. silencing), or if both files contain total silence in the middle.

            footer.modal-card-foot
                .dialog__buttons
                    button.button.is-primary(@click="close") Close

</template>

<script>
    import { sync } from 'vuex-pathify'
    import FavDirIcon from '@/components/FavDirIcon'
    import GPL3License from './GPL3License'
    import { HOTKEY_DESCRIPTIONS, REPO_URL, CHANGELOG_URL, RELEASES_URL, COPYRIGHT, CONTACT_EMAIL } from '@/constants'
    import { getSystemInfo } from '@/helpers/systemInfo'

    const TABS = [
        {value: 'help-about', label: 'About Sample Commander', isAbout: true},
        {value: 'help-shortcuts', label: 'Mouse & Keyboard', isShortcuts: true},
        {value: 'help-faq', label: 'Questions & Answers', isFaq: true},
        {value: 'help-license', label: 'License', isLicense: true},
        {value: 'help-systeminfo', label: 'System Info', isSystemInfo: true}
    ];
    
    export default {
        props: {
            value: Boolean
        },
        data: () => ({
            selectedTabValue: TABS[0].value
        }),
        computed: {
            ...sync([
                'config/sourcePath',
                'config/targetPath',
                'config/lastSourcePaths',
                'config/lastTargetPaths',
                'config/favDirs'
            ]),
            selectedTab() {
                return TABS.find(mode => mode.value === this.selectedTabValue);
            }
        },
        methods: {
            close() {
                this.$emit('input', null);
            },
            selectLicenseTab() {
                this.selectedTabValue = TABS.find(m => m.isLicense).value;
            },
            gotoSystemInfo() {
                this.selectedTabValue = TABS.find(m => m.isSystemInfo).value;
            }
        },
        beforeCreate() {
            this.TABS = TABS;
            this.$options.systemInfo = getSystemInfo();
        },
        created() {
            this.$onGlobal('close-dialog-requested', () => this.close());
            Object.assign(this, {
                HOTKEY_DESCRIPTIONS,
                REPO_URL,
                CHANGELOG_URL,
                RELEASES_URL,
                CONTACT_EMAIL,
                COPYRIGHT
            });
        },
        components: {
            FavDirIcon,
            GPL3License
        }
    }


</script>

<style lang="scss">

    @import '~@/styles/configDialog';
    
    .help {

        &__subject {
            font-size: 15px;
        }
        
        &__content {
            padding: 5px 0 20px 20px;
            
            &:last-child {
                padding-bottom: 0;
            }
        }
        
        &__table {
            &--systemInfo {
                user-select: all;
            }
            
            th,
            td {
                padding: 1px 20px 1px 10px;
                border-bottom: 1px solid rgba(#fff, 0.1);
                
                &:first-child {
                    text-align: right;
                    white-space: nowrap;
                    font-family: monospace;
                }
            }
            
            tr:last-child th,
            tr:last-child td {
                border: none !important;
            }
        }

        &__footnote {
            color: #aaa;
            font-style: italic;
        }
        
        &__block {
            p {
                padding-bottom: 1em;
            }
            
            &--about {
                padding: 10px 10px 0;
            }
        }
        
        &__faq {
            dt {
                color: $color-orange;
                
                &:before {
                    padding-right: 5px;
                    content: 'Q:';
                    font-weight: bold;
                }
            }
            dd {
                padding: 0.2em 0 1em 2.5em;
                
                &:last-child {
                    padding-bottom: 0;
                }
            }
        }

        &__urls {
            dt {
                color: $color-orange;

                &:before {
                    //padding-right: 5px;
                    //content: '-';
                    font-weight: bold;
                }
            }
            dd {
                padding: 0.2em 0 1em 1.5em;

                &:last-child {
                    padding-bottom: 0;
                }
            }
        }
        
        &__links {
            li {
                padding-bottom: 0.5em;
            }
        }
        
        &__hr {
            height: 1px;
            overflow: hidden;
            background: #555;
            margin: 1em 0;
        }
    }

</style>
