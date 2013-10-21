/**
 * @author Marenin Alex
 * October 2013
 */


var util = require( './util' ),
    commander = require( 'commander' ),
    express = require( 'express' );


commander
    .usage( '[options]' )
    .option( '-p, --port [port]', 'Set Web server port', 1337 )
    .option( '-c, --config [name]', 'Set the config name to use, default is "dev"', 'dev' )
    .parse( process.argv );

var config = util.getConfig( commander.config );