/**
 * @author Marenin Alex
 * October 2013
 */


var commander = require( 'commander' );
commander
    .usage( '[options]' )
    .option( '-p, --port [port]', 'Set Web server port', false )
    .option( '-c, --config [config]', 'Set the config name to use, default is "dev"', 'dev' )
    .parse( process.argv );


var util = require( './util' ),
    http = require( 'http' ),
    express = require( 'express' ),
    config = util.getConfig( commander.config ),
    socket = require( 'socket.io' );


var app = express(),
    server = http.createServer( app ),
    io = socket.listen( server );

app.disable( 'x-powered-by' );
app.set( 'trust proxy', config.proxyUsed );
app.set( 'views', './view' );
app.set( 'view engine', 'jade' );

app.use( express.bodyParser() );
app.use( express.methodOverride() );
app.use( config.debug ? express.logger('dev') : express.logger() );
app.use( '/public', express.static('./public') );
app.use( app.router );

server.listen( commander.port || config.port );


// ROUTING


app.get( '/', function( req, res ){
    res.render( 'index', {
        socketUrl: config.socketUrl
    });
});
