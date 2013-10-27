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

config.port = commander.port || config.port;

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

server.listen( config.port );


// HTTP


app.get( '/', function( req, res ){
    var socketUrl = config.protocol + '://' + config.host + ':' + config.port;
    res.render( 'index', {
        socketUrl: socketUrl
    });
});


// SOCKET


var rooms = {},
    peers = {};

io.sockets.on( 'connection', function( socket ){
    var peer;

    socket.on( 'disconnect', function (){
        delete peers[peer.id];
    });

    socket.on( 'initUser', function( data, cb ){
        peer = new Peer( data.id, socket );
        peers[peer.id] = peer;
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
            name = util.generateId(6);
        while ( rooms[name] );

        var room = new Room( name, data.password || false, peer );
        rooms[name] = room;
        peer.setRoomName( name );
        cb( {name: room.name, peers: room.getPeerIds()} );
    });

    socket.on( 'joinRoom', function( data, callback ){
        var name = data.name,
            room = name && rooms[name];

        if ( !name )
            callback( {error: 'Room name cannot be empty'} );
        else if ( !room )
            callback( {error: 'Unable to find room with such name'} );
        else if ( !room.isPasswordCorrect(data.password) )
            callback( {error: 'Wrong password'} );
        else {
            room.addPeer( peer );
            callback( {name: room.name, peers: room.getPeerIds()} );
        }
    });

    socket.on( 'offer', function( offer, callback ){
        var remotePeerId = offer.id,
            remotePeer = remotePeerId && peers[remotePeerId];
        if ( !remotePeer )
            callback( {error: 'There is no remote peer'} );
        else
            remotePeer.socket.emit( 'offer', {id: peer.id, sdp: offer.sdp}, function( answer ){
                if ( answer.reject )
                    callback( {reject: true} );
                else
                    callback( {sdp: answer.sdp} );
            });
    });

    socket.on( 'iceCandidate', function( data ){
        var remotePeer = peers[data.id];
        if ( remotePeer )
            remotePeer.socket.emit( 'iceCandidate', {id: peer.id, candidate: data.candidate} );
    });
});


/**
 * @constructor
 */
function Room( name, password, ownerPeer ){
    this.name = name;
    this.password = password;
    this.owner = ownerPeer;
    this.peers = [];
    this.addPeer( ownerPeer );
}


Room.prototype.isPasswordCorrect = function( pass ){
    return !this.password || pass === this.password;
};


Room.prototype.addPeer = function( id ){
    if ( this.peers.indexOf(id) === -1 )
        this.peers.push( id );
};


Room.prototype.getPeerIds = function(){
    return this.peers.map( function( peer ){
        return peer.id;
    });
};


/**
 * @constructor
 */
function Peer( id, socket ){
    this.id = id;
    this.socket = socket;
}


Peer.prototype.setRoomName = function( name ){
    this.roomName = name;
};
