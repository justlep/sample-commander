import {assertFileExists, pathExists} from '@/helpers/fileHelper'
import {execFile} from 'child_process'
import {format} from 'util'
import Logger from '@/helpers/Logger'
import {convertToMelScale} from '@/processing/spectrogramScaler'
import nodePath from 'path'

const FFMPEG_TIMEOUT_IN_MILLIS = 60 * 1000;
const FINAL_SPECTROGRAM_FREQUENCY_RANGE = 20000;
const FINAL_SPECTROGRAM_WIDTH = 800;
const FINAL_SPECTROGRAM_HEIGHT = 256;
const LINEAR_SPECTROGRAM_MIN_VERTICAL_SOURCE_PIXELS_CONTAINING_FINAL_FREQ_RANGE = 1024;
const KEEP_LINEAR_SPECTROGRAM_IMAGE = false;

// keep this local for now, maybe put into config store later 
const SPECTROGRAM_BRIGTHNESS_FACTOR = 1.25;
const SPECTROGRAM_SATURATION_FACTOR = 1.25;

/**
 * @param {FileItem} fileItem
 * @returns {number} - The default frequency range of the spectrogram produced by ffmpeg showspectrumpic
 *                     (when used without problematic (slow) start/stop bandpass parameters).
 * @private
 */
function _getLinearSpectrogramFrequencyRange(fileItem) {
    let freqRange = fileItem.getNyquistFrequency();
    if (!freqRange) {
        throw new Error('FileItem ' + fileItem + ' has invalid Nyquist frequency ' + freqRange);
    }
    return freqRange;
}

/**
 * Generates a linear spectrogram image for the given audio file's path using the given ffmpeg executable.
 * If a linear spectrogram already exists, that one is returned.
 *
 * (!) Had some troubles with ffmpeg showspectrumpic here:
 *
 *    (1) Using bandpass parameters "start=0:stop=20000" causes processing slow-down of factor > 7
 *        -> Solution = don't use start/stop bandpass, instead generate a larger spectrogram,
 *        then use only the "interesting" spectrum parts during post-processing (Mel-scaling)
 *    (2) ffmpeg 4.1 showspectrumpic produces faulty spectrograms for different heights,
 *       -> Solution = use only heights 1024, 2048, 4096 which seemed to work fine
 *    (3) ffmpeg 4.1 (and other 2018 builds) crashes 
 *        when trying showspectrumpic height > 1024 for files of 1GB+ (height 2048 at 999MB works)
 *
 *    Documentation for ffmpeg showspectrumpic:
 *    --> https://ffmpeg.org/ffmpeg-filters.html#toc-showspectrumpic
 *
 * @param {FileItem} fileItem
 * @param {string} ffmpegExecutablePath
 * @param {string} [linearSpectrogramDir] - path to a folder for temporary files 
 *                                          If given, intermediate (linear) spectrogram images will be saved here,
 *                                          otherwise in the fileItems's parentDir
 * @return {Promise<string>} - resolve with the existing or newly generated linear spectrogram path, rejects if failed
 * @private
 */
function _getOrGenerateLinearSpectrogram(fileItem, ffmpegExecutablePath, linearSpectrogramDir) {
    const linearSpectrogramFilename = 'SPX_' + fileItem.id + '.png';
    const linearSpectrogramPath = nodePath.join(linearSpectrogramDir || fileItem.parentDir, linearSpectrogramFilename);

    if (!ffmpegExecutablePath) {
        return Promise.reject('Invalid ffmpegExecutable ');
    }
    
    return assertFileExists(linearSpectrogramPath)
        .then(() => {
            Logger.dev('Using existing linear spectrogram for %s', fileItem);
            return linearSpectrogramPath;
        })
        .catch(() => new Promise(async (resolve, reject) => {
            let linearSpectrogramFrequencyRange;
            
            try {
                linearSpectrogramFrequencyRange = _getLinearSpectrogramFrequencyRange(fileItem);
            } catch (err) {
                reject(err);
                return;
            }
            
            let minLinearSpectrogramHeight = (linearSpectrogramFrequencyRange / FINAL_SPECTROGRAM_FREQUENCY_RANGE) *
                    LINEAR_SPECTROGRAM_MIN_VERTICAL_SOURCE_PIXELS_CONTAINING_FINAL_FREQ_RANGE,
                ffmpegSafeHeightFactor = Math.min(4, Math.ceil(minLinearSpectrogramHeight / 1024)),
                linearSpectrogramHeight = 1024 * (ffmpegSafeHeightFactor === 3 ? 4 : ffmpegSafeHeightFactor);

            if (fileItem.filesize > 1024 * 1024 * 1023) {
                // for some strange reason, ffmpeg spectrumpic height > 1024 crashes for files of 1GB+ 
                linearSpectrogramHeight = 1024;
            }
            
            Logger.dev('Running ffmpeg for linear spectrogram of %s', fileItem.path);
            
            execFile(ffmpegExecutablePath, [
                '-hide_banner',
                '-y',
                '-i',
                fileItem.filename,
                '-lavfi',
                `showspectrumpic=size=${FINAL_SPECTROGRAM_WIDTH}x${linearSpectrogramHeight}:color=fire:scale=log:legend=0`,
                linearSpectrogramPath
            ], {
                cwd: fileItem.parentDir,
                timeout: FFMPEG_TIMEOUT_IN_MILLIS
            }, (err, stdout, stderr) => {
                if (err) {
                    reject( format('Failed to generate %s. Error is:\n%s', linearSpectrogramPath, stderr) );
                } else {
                    Logger.dev('Created linear spectrogram: %s', linearSpectrogramPath);
                    resolve(linearSpectrogramPath);
                }
            });
        }));
}

/**
 * Create a spectrogram image (in Mel scale) for the given audio file path. 
 * If non exists, a new spectrogram image will be generated.
 *
 * @param {FileItem} fileItem
 * @param {string} ffmpegExecutablePath - the path to the ffmpeg.exe (windows) or respective executable on other OS
 * @param {string} [linearSpectrogramDir] - if given, intermediate (linear) spectrogram images will be saved here,
 *                                          otherwise in the fileItems's parentDir          
 * @return {Promise<string>} - the path to the generated or already existing spectrogram image
 */
export async function getSpectrogramForFileItem(fileItem, ffmpegExecutablePath, linearSpectrogramDir) {
    const spectrogramPath = fileItem.getSpectrogramPath();

    let validSpectrogramPath = null;

    if (await pathExists(spectrogramPath)) {
        validSpectrogramPath = spectrogramPath;
    } else {
        try {
            const linearSpectrogramPath = await _getOrGenerateLinearSpectrogram(fileItem, ffmpegExecutablePath, linearSpectrogramDir);

            validSpectrogramPath = await new Promise((resolve, reject) => {
                convertToMelScale({
                    linearSpectrogramPath,
                    targetSpectrogramPath: spectrogramPath,
                    targetHeight: FINAL_SPECTROGRAM_HEIGHT,
                    deleteLinearSpectrogramAfterSuccess: !KEEP_LINEAR_SPECTROGRAM_IMAGE,
                    linearSpectrogramFrequencyRange: _getLinearSpectrogramFrequencyRange(fileItem),
                    targetFrequencyRange: FINAL_SPECTROGRAM_FREQUENCY_RANGE,
                    brightnessFactor: SPECTROGRAM_BRIGTHNESS_FACTOR,
                    saturationFactor: SPECTROGRAM_SATURATION_FACTOR
                })
                    .then(successfullyScaledSpectroPath => {
                        Logger.dev('Converted spectrogram to Mel scale');
                        resolve(successfullyScaledSpectroPath);
                    }).catch(err => {
                    Logger.error(err);
                    reject('Failed to convert spectrogram to Mel scale');
                });
            });

        } catch (err) {
            throw err;
        }
    }

    return validSpectrogramPath;
}
