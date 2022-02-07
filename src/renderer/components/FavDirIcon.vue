<template lang="pug">
    
    span.favDirIcon.icon--star(:class="cssClass", :title="tooltip", @click.stop="toggleFav")
    
</template>
    
<script>
    import { get } from 'vuex-pathify'
    
    export default {
        props: {
            path: String
        },
        computed: {
            ...get([
                'config/favDirs'
            ]),
            isFav() {
                return this.favDirs ? this.favDirs.includes(this.path) : false;
            },
            tooltip() {
                return this.isFav ? 'Remove folder from bookmarks' : 'Bookmark folder';  
            },
            cssClass() {
                return this.isFav ? 'favDirIcon--active' : '';
            }
        },
        methods: {
            toggleFav() {
                this.$store.commit('config/toggleFavDir', this.path);
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
