import os from "os";
import Vue from 'vue';

export function getSystemInfo() {
    let cpus = os.cpus() || [],
        firstCpuModel = (cpus.length && cpus[0].model) || 'unknown type';

    return [
        {name: 'App Version', value: document.title},
        {name: 'Platform', value: os.platform()},
        {name: 'Electron', value: process.versions.electron},
        {name: 'Chrome', value: process.versions.chrome},
        {name: 'Node', value: process.versions.node},
        {name: 'Vue', value: Vue.version},
        {name: 'CPUs', value: cpus.length + ' x ' + firstCpuModel},
        {name: 'NODE_ENV', value: process.env.NODE_ENV}
    ];    
}

