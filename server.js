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
    socket = require( 'socket.io' ),
    socketUrl = config.protocol + '://' + config.host + ':' + config.externalPort;

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

server.listen( config.port, function(){
    console.log( 'HTTP server is listening port ' + config.port );
});


// HTTP


app.get( '/', function( req, res ){
    res.render( 'index', {
        socketUrl: socketUrl
    });
});

app.get( '/r/:id', function( req, res ){
    var id = req.params.id,
        room = rooms[id];
    if ( room )
        res.render( 'index', {
            socketUrl: socketUrl,
            roomName: room.name,
            needAuth: room.isPublic(),
            error: room.isFull() ? 'Room is full' : ''
        });
    else
        res.render( 'index', {
            socketUrl: socketUrl,
            error: 'Room "' + id + '" doesn\'t exists'
        });
});


// SOCKET


var rooms = {},
    peers = {};

io.sockets.on( 'connection', function( socket ){
    var peer;

    socket.on( 'disconnect', function(){
        var room = peer.getRoom();
        if ( room ){
            room.removePeer( peer );
            if ( room.isEmpty() )
                delete rooms[room.name];
        }
        delete peers[peer.getId()];
    });

    socket.on( 'initUser', function( data ){
        peer = new Peer( data.id, socket );
        peers[peer.getId()] = peer;
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
        peer.setRoom( room );
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
        else if ( room.isFull() )
            callback( {error: 'Room is full'} );
        else {
            room.addPeer( peer );
            peer.setRoom( room );
            callback( {name: room.name, peers: room.getPeerIds()} );
        }
    });

    socket.on( 'offer', function( offer, callback ){
        var remotePeerId = offer.id,
            remotePeer = remotePeerId && peers[remotePeerId];
        if ( !remotePeer )
            callback( {error: 'There is no remote peer'} );
        else
            remotePeer.socket.emit( 'offer', {id: peer.getId(), sdp: offer.sdp}, function( answer ){
                if ( answer.reject )
                    callback( {reject: true} );
                else
                    callback( {sdp: answer.sdp} );
            });
    });

    socket.on( 'iceCandidate', function( data ){
        var remotePeer = peers[data.id];
        if ( remotePeer )
            remotePeer.socket.emit( 'iceCandidate', {id: peer.getId(), candidate: data.candidate} );
    });
});


/**
 * @constructor
 */
function Room( name, password, ownerPeer ){
    this.name = name;
    this.password = password;
    this.peers = [];
    this.addPeer( ownerPeer );
}


Room.prototype.isPublic = function(){
    return !this.password;
};

Room.prototype.isPasswordCorrect = function( pass ){
    return !this.password || pass === this.password;
};


Room.prototype.isFull = function(){
    return this.peers.length >= config.roomCapacity;
};


Room.prototype.isEmpty = function(){
    return this.peers.length === 0;
};


Room.prototype.addPeer = function( peer ){
    var id = peer.getId();
    if ( !this.isFull() && this.peers.indexOf(id) === -1 )
        this.peers.push( id );
};


Room.prototype.removePeer = function( peer ){
    var id = peer.getId(),
        i = this.peers.indexOf( id );
    if ( i > -1 )
        this.peers.splice( i, 1 );
};


Room.prototype.getPeerIds = function(){
    return this.peers;
};


/**
 * @constructor
 */
function Peer( id, socket ){
    this.id = id;
    this.socket = socket;
}


Peer.prototype.getId = function(){
    return this.id;
};


Peer.prototype.setRoom = function( room ){
    this.room = room;
};


Peer.prototype.getRoom = function(){
    return this.room;
};


Peer.prototype.destroy = function(){
    delete this.room;
    delete this.socket;
};
