<template lang="pug">
    
    span.favDirIcon.fa.fa-star(:class="cssClass", :title="tooltip", @click.stop="toggleFav")
    
</template>
    
<script>
    import { get } from 'vuex-pathify'
    
    export default {
        props: {
            path: String,
            isStatic: false
        },
        computed: {
            ...get([
                'config/favDirs'
            ]),
            isFav() {
                return this.favDirs ? this.favDirs.includes(this.path) : false;
            },
            tooltip() {
                return this.isStatic ? 'Clicking this icon next to folders adds or removes it from the bookmarks list' :
                       this.isFav ? 'Remove folder from bookmarks' : 'Bookmark folder';  
            },
            cssClass() {
                return (this.isStatic ? 'favDirIcon--static ' : '') + (this.isFav ? 'favDirIcon--active' : '');
            }
        },
        methods: {
            toggleFav() {
                if (!this.isStatic) {
                    this.$store.commit('config/toggleFavDir', this.path);
                }
            }
        }
    }
    
</script>

<style lang="scss">
    
    .favDirIcon {
        margin-right: 5px;
        opacity: 0.3;
        cursor: pointer;

        &--static,
        &--active {
            opacity: 1;
        }
        
        &--static {
            cursor: default;
        }
    }
    
</style>
