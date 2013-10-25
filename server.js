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


// HTTP


app.get( '/', function( req, res ){
    res.render( 'index', {
        socketUrl: config.socketUrl
    });
});


// SOCKET

var rooms = {},
    peers = {};

io.sockets.on( 'connection', function( socket ){
    var id,
        peer;

    socket.on( 'disconnect', function (){
        delete peers[id];
    });

    socket.on( 'initUser', function( data, cb ){
        id = data.id;
        peer = new Peer( id, socket );
        peers[id] = peer;
    });

    socket.on( 'createRoom', function( data, cb ){
        var name = data.name;
        if ( name ){
            if ( rooms[name] ){
                cb( {error: 'Room already exists'} );
                return;
            }
        }
        else do
            name = util.generateId();
        while ( rooms[name] );

        var room = new Room( name, data.password || false, [id] );
        rooms[name] = room;
        peer.setRoomName( room.name );
        cb( {name: room.name, peers: room.peers} );
    });
});


/**
 * @constructor
 */
function Room( name, password, peers ){
    this.name = name;
    this.password = password;
    this.peers = peers;
}


/**
 * @constructor
 */
function Peer( id, socket ){
    this.id = id;
    this.socket = socket;
}


Peer.prototype.setRoomName = function( id ){
    this.roomId = id;
};
