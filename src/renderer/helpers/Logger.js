let DEFAULT_LOG_LEVEL_NAME = 'WARN',
    CONSOLE_ENABLED = (typeof console !== 'undefined'),
    NOP = function(){},
    Logger,
    getConsoleMethodOrDefault = function(consoleMethodName) {
        /*eslint no-console:0 */
        return CONSOLE_ENABLED ? (console[consoleMethodName] || console['log'] || NOP) : NOP;
    },
    getLogLevelObjectByNameOrObject = function(nameOrObject) {
        let wishedLevelObject = (typeof nameOrObject === 'string') ? Logger.LEVEL[nameOrObject] : nameOrObject;
        for (let logLevelKey in Logger.LEVEL) {
            if (!Logger.LEVEL.hasOwnProperty(logLevelKey)) {
                continue;
            }
            let levelObject = Logger.LEVEL[logLevelKey];
            if (levelObject === wishedLevelObject) {
                return levelObject;
            }
        }
        Logger.LEVEL.ERROR.fn('Invalid log level - defaulting to ' + DEFAULT_LOG_LEVEL_NAME);
        return Logger.LEVEL[DEFAULT_LOG_LEVEL_NAME];
    };

Logger = {
    LEVEL: {
        DEBUG: {prio: 10, fn: getConsoleMethodOrDefault('debug')},
        INFO:  {prio: 20, fn: getConsoleMethodOrDefault('info')},
        DEV:   {prio: 25, fn: getConsoleMethodOrDefault('log')},
        WARN:  {prio: 30, fn: getConsoleMethodOrDefault('warn')},
        ERROR: {prio: 40, fn: getConsoleMethodOrDefault('error')},
        OFF:   {prio: 50, fn: NOP}
    },
    /** @static */
    debug: NOP,
    /** @static */
    info: NOP,
    /** @static */
    dev: NOP,
    /** @static */
    warn: NOP,
    /** @static */
    error: NOP,
    /**
     * Sets a new log level. If an invalid level is given, {@link DEFAULT_LOG_LEVEL_NAME} will be used.
     * @param {Object|string} newLogLevelNameOrObject - the name of the log level OR the LEVEL.* object itself
     * @static
     */
    setLogLevel: function(newLogLevelNameOrObject) {
        let newLogLevel = getLogLevelObjectByNameOrObject(newLogLevelNameOrObject),
            newPrio = newLogLevel.prio,
            logLevel,
            logMethodName,
            isMethodEnabled;
        for (let logLevelKey in Logger.LEVEL) {
            if (Logger.LEVEL.hasOwnProperty(logLevelKey)) {
                logLevel = Logger.LEVEL[logLevelKey];
                logMethodName = logLevelKey.toLowerCase();
                isMethodEnabled = (logLevel.prio >= newPrio);
                Logger[logMethodName] = (isMethodEnabled) ? logLevel.fn : NOP;
            }
        }
    }
};

Logger.setLogLevel(DEFAULT_LOG_LEVEL_NAME);

export default Logger;
