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
            name = generateId();
        while ( rooms[name] );

        var room = new Room( name, data.password || false, [id] );
        rooms[name] = room;
        cb( {name: room.name, peers: room.peers} );
    });
});


function generateId(){
    var p1 = cutRight( Math.random() * 100000, 5 ),
        p2 = cutRight( Date.now() * (Number(p1[0]) || 1), 5 );
    return p1 + p2;
}


function cutRight( str, /*int*/ count ){
    var s = String( str ),
        lastIndex = s.length - 1;
    return s.substring( lastIndex - count );
}


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