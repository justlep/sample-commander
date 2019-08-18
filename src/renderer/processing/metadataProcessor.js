import {execFile} from 'child_process';
import Logger from '@/helpers/Logger'
import {format} from 'util';

/**
 * Determines metadata (e.g. sample rate) for this file using the ffprobe executable.
 * If the metadata is in the cache, that cached version is returned.
 *
 * @param {FileItem} fileItem
 * @param {string} ffprobeExecutablePath
 * @returns {Promise<{duration: String, sampleRate: Number}>}
 */
export async function getMetadataForFileItem(fileItem, ffprobeExecutablePath) {
    if (!ffprobeExecutablePath) {
        throw new Error('Invalid ffprobeExecutablePath');
    }

    let metadataJson;
    
    try {
        let metadataJsonString = await new Promise((resolve, reject) => {
                Logger.dev('Running ffprobe for metadata of %s', fileItem.path);
    
                execFile(ffprobeExecutablePath, [
                    '-hide_banner',
                    '-show_streams',
                    '-select_streams', 'a:0',
                    // '-sexagesimal',  // <-- for duration getting formatted like "0:09:39.396984" 
                    '-show_entries', 'stream=duration,duration_ts,sample_rate,time_base',
                    '-print_format', 'json',
                    fileItem.path
                ], {
                    timeout: 3000,
                    shell: false,
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'ignore']
                }, (err, stdout, stderr) => {
                    if (err) {
                        reject(format('ffprobe failed to load metadata for %s, error: %s', fileItem.path, stderr));
                    } else {
                        resolve('' + stdout);
                    }
                });
            }),
            json = JSON.parse(metadataJsonString),
            firstStream = json && json.streams[0],
            sampleRate,
            duration,
            durationInMins;
        
        if (firstStream) {
            sampleRate = firstStream && parseInt(firstStream['sample_rate'], 10);
            
            let durationInSecs = parseFloat(firstStream.duration);

            // Logger.dev(firstStream);
            
            if (!isNaN(durationInSecs)) {
                // duration is in minutes
                let hours = (durationInSecs / 3600) << 0, 
                    mins = ((durationInSecs - (hours * 3600)) / 60) << 0, 
                    secs = (durationInSecs % 60) << 0,
                    parts = [];

                if (durationInSecs >= 1) {
                    if (hours) {
                        parts.push(hours + 'h');
                    }
                    if (mins) {
                        parts.push(mins + 'm');
                    }
                    if (secs) {
                        parts.push(secs + 's');
                    }
                } else {
                    parts.push(((durationInSecs * 1000) << 0) + 'ms');
                }
                duration = parts.join(' ');
                durationInMins = durationInSecs / 60;
            }
        }

        metadataJson = {
            sampleRate: sampleRate || null, 
            duration,
            durationInMins
        };
        
    } catch (err) {
        Logger.error('Failed to process metadata: %o', err);
        throw new Error(format('Failed to process metadata JSON  for %s, error: %s', fileItem.path, err));
    }
    
    // Logger.dev('Finished metadata for %s -> %o', fileItem.filename, metadataJson);
    return metadataJson;
}
