/**
 * @author Marenin Alex
 * October 2013
 */


var crypto = require( 'crypto' );

exports.CONFIG_DIR = './config/';
exports.noop = function(){};

/**
 * @param {string} route
 * @param {Object} data
 * @return string
 */
exports.format = function( route, data ){
    var placeholders = route.match( /:\w+/g ) || [],
        res = route,
        i;

    for ( i = 0; i < placeholders.length; i++ )
        res = res.replace( new RegExp(placeholders[i], 'g'), data[placeholders[i].substr(1)] );

    return res;
};


exports.formatString = function( format, data ){
    var placeholders = format.match( /\{\{\w+\}\}/g ) || [],
        res = format,
        i;

    for ( i = 0; i < placeholders.length; i++ )
        res = res.replace( new RegExp(placeholders[i], 'g'), data[placeholders[i].replace(/[\{\}]/g, '') || ''] );

    return res;
};


/**
 * @param {Object|null} destination
 * @param {Object} source
 * @return Object
 */
exports.mixin = function mixin( destination, source ){
    var res = destination ? destination : {};

    if ( source )
        for ( var k in source ) if ( source.hasOwnProperty(k) )
            res[k] = source[k];

    return res;
};


/**
 * @param {Object} original
 * @param {Object} newSample
 * @return Object|null
 */
exports.objectDiff = function( original, newSample ){
    var diff = {},
        count = 0;
    for ( var k in newSample ) if ( newSample.hasOwnProperty(k) )
        if ( original[k] !== newSample[k] ){
            diff[k] = newSample[k];
            count ++;
        }

    return count ? diff : false;
};


/**
 * @param {string} configName
 * @param {string?} configDir
 * @return Object
 */
exports.getConfig = function( configName, configDir ){
    var dir = configDir || exports.CONFIG_DIR,
        common = requireConfig( 'common' );
    return exports.mixin( common, requireConfig(configName) );

    function requireConfig( name ){
        var conf = require( dir + name + '.js' );
        return conf._extends
            ? exports.mixin( requireConfig(conf._extends), conf )
            : conf;
    }
};


/**
 * @param {long} ts
 * @param {string?} delimiter
 * @returns {string}
 */
exports.timestampToDate = function( ts, delimiter ){
    var d = new Date( ts ),
        day = makeTwoDigit( d.getDate() ),
        month = makeTwoDigit( d.getMonth() + 1 ),
        year = d.getFullYear(),
        hour = makeTwoDigit( d.getHours() ),
        minute = makeTwoDigit( d.getMinutes() ),
        del = delimiter || '.';
    return year + del + month + del + day + ' ' + hour + ':' + minute;
};


/**
 * @param {string} password
 * @returns {string}
 */
exports.passwordHash = function( password ){
    return crypto.createHash( 'md5' ).update(
        crypto.createHash( 'sha1' ).update( password ).digest( 'hex' ) + 'salt'
    ).digest( 'hex' );
};


exports.getRemoteIpFromRequest = function( req ){
    var ip = req.ip;
    if ( ip == '127.0.0.1' )
        return false;
    else
        return ip;
};


exports.trim = function( val ){
    return String( val ).trim();
};

