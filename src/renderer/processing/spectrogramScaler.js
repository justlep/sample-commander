import nodeFs from 'fs'
import Logger from '@/helpers/Logger'

const BYTES_PER_PIXEL = 4;

const _sourceLinesAndWeightsCache = {};

/**
 * @param {number} sourceWidth
 * @param {number} sourceHeight
 * @param {number} sourceFrequencyRange
 * @param {number} targetHeight
 * @param {number} [targetFrequencyRange] - defaults to sourceFrequencyRange
 * @return {LinesAndWeightsObject[]}
 * @private
 */
function _getTransformationSourceLinesAndWeights({sourceWidth, sourceHeight, sourceFrequencyRange, targetHeight, targetFrequencyRange = sourceFrequencyRange}){
    const CACHE_KEY = [sourceWidth, sourceHeight, sourceFrequencyRange, targetHeight, targetFrequencyRange].join('__');

    let linesAndWeights = _sourceLinesAndWeightsCache[CACHE_KEY] || [];

    // using Mel scale -> https://en.wikipedia.org/wiki/Mel_scale
    // -> 2595 * log10(1 + f/700) -> f(20000) === 3816.913632624
    // http://fooplot.com/?lang=de#W3sidHlwZSI6MCwiZXEiOiI3MDAqKDEwXih4LzI1OTUpLTEpIiwiY29sb3IiOiIjRDY3NTFBIn0seyJ0eXBlIjoxMDAwLCJ3aW5kb3ciOlsiMCIsIjQwMDAiLCIwIiwiMjAwMDAiXX1d
    // -> inverse -> 700*(10^(x/2595) - 1)
    // http://fooplot.com/#W3sidHlwZSI6MCwiZXEiOiIyNTk1KmxvZygxK3gvNzAwKSIsImNvbG9yIjoiI0Q4MDBGNSJ9LHsidHlwZSI6MTAwMCwid2luZG93IjpbIi0yNjQ4LjQ2MTUzODQ2MTUzNyIsIjI0ODUxLjUzODQ2MTUzODQ2IiwiLTQ5OS45OTk5OTk5OTk5OTk1NSIsIjQ1MDAiXX1d
    
    if (!linesAndWeights.length) {
        const BYTES_PER_LINE = sourceWidth * BYTES_PER_PIXEL;
        const EFFECTIVE_TARGET_FREQ_RANGE = Math.min(sourceFrequencyRange, targetFrequencyRange);
        const MEL_Y_FOR_MAX_FREQUENCY = 2595 * Math.log10(1 + EFFECTIVE_TARGET_FREQ_RANGE / 700);
        
        const SOURCE_HEIGHT_AT_MAX_FREQ = (EFFECTIVE_TARGET_FREQ_RANGE < sourceFrequencyRange) ? 
                        (EFFECTIVE_TARGET_FREQ_RANGE / sourceFrequencyRange * sourceHeight) : sourceHeight;

        // console.log('source: %s, sourceFreq: %s, targetFreq: %s, refHeight: %s', 
        //              sourceHeight, sourceFrequencyRange, EFFECTIVE_TARGET_FREQ_RANGE, SOURCE_HEIGHT_AT_MAX_FREQ);
        
        for (let y = 1; y <= targetHeight; y++) {
            let perc = y / targetHeight,
                fMel = 700 * (Math.pow(10, perc * MEL_Y_FOR_MAX_FREQUENCY / 2595) - 1) / EFFECTIVE_TARGET_FREQ_RANGE,
                // fSquared = perc * perc,                                                 // x^2 -> sqrt(x) scale
                // fSquaredCorrected = Math.pow(perc + FSQUARD_OFFSET, 2) / FSQUARED_OFFSET_SQUARE,
                // fLinear = perc,                                                         // 1:1
                f = fMel,
                line = Math.max(1, Math.min(f * SOURCE_HEIGHT_AT_MAX_FREQ, SOURCE_HEIGHT_AT_MAX_FREQ)),
                lineSafeZeroBased = line - 1,
                mod = line % 1;

            linesAndWeights[y - 1] = {
                line1ByteIndex: Math.floor(lineSafeZeroBased) * BYTES_PER_LINE,
                weight1: 1 - mod,
                line2ByteIndex: Math.ceil(lineSafeZeroBased) * BYTES_PER_LINE,
                weight2: (line <= sourceHeight) ? mod : 0
            };
        }
        _sourceLinesAndWeightsCache[CACHE_KEY] = linesAndWeights;
    }

    return linesAndWeights;
}

/**
 * @param {number} saturationFactor
 * @param {number} brightnessFactor
 * @returns {string} - a filter expression to assignable to a canvas context
 */
export function getCanvasFilterExpression(saturationFactor = 1, brightnessFactor = 1) {
    if (isNaN(saturationFactor) || saturationFactor <= 0 || isNaN(brightnessFactor) || brightnessFactor <= 0) {
        throw new Error(`Invalid filter factor(s) (brightnessFactor=${brightnessFactor}, saturationFactor=${saturationFactor})`);
    }
    return `saturate(${saturationFactor * 100}%) brightness(${brightnessFactor * 100}%)`;
}


/**
 * Takes an image file (path) of a spectrogram with linear frequency scale and known frequency range (y-axis), 
 * converting it into a new spectrogram image in `Mel` frequency scale limited to the range of 20.000 Hz (3816.9 Mel).
 * If the linear spectrogram has a freq range below 20kHz, the generated Mel spectrogram will have the same range (in Mel, respectively).
 * Optionally, the overall brightness/saturation can be increased by coefficients, too.
 * 
 * @param {string} linearSpectrogramPath - path to spectrogram picture
 * @param {string} targetSpectrogramPath - path to new spectrogram with frequency axis converted to non-linear scale
 * @param {number} [targetHeight] - defaults to the original one
 * @param {number} linearSpectrogramFrequencyRange - the max frequency covered by the linear spectrogram,
 *                                                   i.e. the frequency represented in its top-most pixel row
 * @param {boolean} [deleteLinearSpectrogramAfterSuccess=false] if true and source and target files are different, the source
 *                                                  file will be deleted after successful conversion (and saving)
 * @param {number} [targetFrequencyRange] - can be used to limit the scaled spectrogram frequency range to some lower range 
 *                                          than the linear one. Will be ignored if the given value is greater than the `linearSpectrogramFrequencyRange` 
 * @param {number} [saturationFactor = 1.0] - optional correction factor to apply on pixel saturation
 * @param {number} [brightnessFactor = 1.0] - optional correction factor to apply on pixel brightness
 * @return {Promise<string>} resolves with the converted spectrogram's path
 */
export function convertToMelScale({
                    linearSpectrogramPath, targetSpectrogramPath, targetHeight, linearSpectrogramFrequencyRange, 
                    deleteLinearSpectrogramAfterSuccess, targetFrequencyRange, saturationFactor = 1, brightnessFactor = 1}) {
    
    let filterExpression = null;
    if (brightnessFactor !== 1 && saturationFactor !== 1) {
        try {
            filterExpression = getCanvasFilterExpression(saturationFactor, brightnessFactor)
        } catch (err) {
            return Promise.reject(err);
        }
    }
    
    return new Promise( (resolve, reject) => {
        let img = new Image();
        img.onerror = function() {
            reject('Unable to load image: ' + linearSpectrogramPath);
        };
        
        img.onload = function() {
            const sourceWidth = img.width;
            const sourceHeight = img.height;
            const BYTES_PER_LINE = sourceWidth * BYTES_PER_PIXEL;

            if (sourceHeight % 2) {
                reject('Image height must be even, but is ' + sourceHeight);
                return;
            }

            let sourceCanvas = document.createElement('canvas'),
                targetCanvas = document.createElement('canvas'),
                sourceContext,
                targetContext;

            sourceCanvas.width = sourceWidth;
            sourceCanvas.height = sourceHeight;
            targetCanvas.width = sourceWidth;
            targetCanvas.height = targetHeight;

            sourceContext = sourceCanvas.getContext('2d');
            sourceContext.translate(0, sourceHeight);
            sourceContext.scale(1, -1);
            if (filterExpression) {
                sourceContext.filter = filterExpression;
            }
            sourceContext.drawImage(img, 0, 0);

            targetContext = targetCanvas.getContext('2d');
            
            let sourceData = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight).data,
                targetImageData = targetContext.getImageData(0, 0, sourceWidth, targetHeight),
                targetData = targetImageData.data,
                sourceLinesAndWeights = _getTransformationSourceLinesAndWeights({
                    sourceWidth: sourceWidth, 
                    sourceHeight: sourceHeight, 
                    sourceFrequencyRange: linearSpectrogramFrequencyRange, 
                    targetHeight,
                    targetFrequencyRange
                });
            //
            
            // console.warn('sourceHeight: ' + sourceHeight);
            
            // non-linear scaling here
            for (let y = 0; y < targetHeight; y++) {
                let targetByteIndex = (targetHeight - y - 1) * BYTES_PER_LINE,
                    lastTargetByteIndex = targetByteIndex + BYTES_PER_LINE,
                    sourceLineAndWeight = sourceLinesAndWeights[y],
                    {weight1, weight2, line1ByteIndex, line2ByteIndex} = sourceLineAndWeight; 
                
                while (targetByteIndex < lastTargetByteIndex) {
                    let p1 = sourceData[line1ByteIndex],
                        p2 = sourceData[line2ByteIndex],
                        weightedP1 = weight1 * p1,
                        weightedP2 = weight2 * p2,
                        targetPixel = (weightedP1 + weightedP2 + 0.5) << 0;

                    targetData[targetByteIndex] = targetPixel <= 255 ? targetPixel : 255;

                    line1ByteIndex++;
                    line2ByteIndex++;
                    targetByteIndex++;
                }
            }

            let _saveTargetCanvas = function(canvasToWrite) {
                canvasToWrite.toBlob(blob => {

                    let fileReader = new FileReader();

                    fileReader.onload  = function(/* progressEvent */) {
                        nodeFs.writeFile(targetSpectrogramPath, Buffer.from(this.result), function(err) {
                            if (err) {
                                reject(err);
                                return;
                            }

                            if (deleteLinearSpectrogramAfterSuccess && linearSpectrogramPath !== targetSpectrogramPath) {
                                // delete the linear spectrogram asynchronously, not blocking resolve in the current tick
                                nodeFs.unlink(linearSpectrogramPath, deletionError => {
                                    if (deletionError) {
                                        // TODO add feedback channel for notifying the user? keep silently? add persistent error log?
                                        Logger.error('Failed to delete linear spectrogram file: ' + linearSpectrogramPath);
                                    } else {
                                        Logger.debug('Deleted linear spectrogram file: %s', linearSpectrogramPath);
                                    }
                                });
                            }
                            
                            // eslint-disable-next-line no-console
                            Logger.debug('Finished writing spectrogram: ' + targetSpectrogramPath);
                            resolve(targetSpectrogramPath);
                        });
                    };

                    fileReader.onerror = () => reject('FileReader failed');
                    fileReader.readAsArrayBuffer(blob);

                }, 'image/png');
            };
            
            // in case we need to resize, anyway, we'll leave final mirroring to the resized version
            targetContext.putImageData(targetImageData, 0, 0);
            _saveTargetCanvas(targetCanvas);
        };

        img.src = linearSpectrogramPath;
    });
}

/**
 * @typedef {Object} LinesAndWeightsObject
 * @property {number} line1ByteIndex
 * @property {number} weight1
 * @property {number} line2ByteIndex
 * @property {number} weight2
 */
