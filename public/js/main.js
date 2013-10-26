/**
 * @author Marenin Alex
 * October 2013
 */


/**
 * @param {Object} options
 * @constructor
 */
function Room( options ){
    this.socketUrl = options.socketUrl;
    this.iceServers = options.iceServers;
    this.id = Date.now().toString();
    this.mediaType = StreamManager.MEDIA_VIDEO || options.mediaType;
    this.streamManager = new StreamManager();
    this.peers = [];

    if ( options.autoConnect )
        this.connect();
}
inherit( Room, EventEmitter );


Room.prototype.connect = function(){
    var room = this;
    room.io = io.connect( room.socketUrl );
    room.io.on( 'connect', function(){
        room.io.emit( 'initUser', {id: room.id} );
        room.emit( 'connected' );
    });

    room.io.on( 'offer', function( offer, fn ){
        console.log( 'offer', offer );
        var id = offer.id,
            peer = room.getPeerById( id ) || room.addPeer( id );
        peer.addStream( room.localStream );
        peer.setOffer( offer.sdp, fn );
    });

    room.io.on( 'iceCandidate', function( req ){
        console.log( 'iceCandidate', req );
        var id = req.id,
            peer = room.getPeerById( id );
        if ( peer && req.candidate )
            peer.addIceCandidate( req.candidate );
    });

    room.streamManager.getLocalStream( StreamManager.MEDIA_VIDEO, function( error, stream ){
        room.localStream = stream;
    });
};


Room.prototype.joinRoom = function( options, callback ){
    var room = this;
    this.io.emit( 'joinRoom', {
        name: options.name,
        password: options.password || ''
    }, function( res ){
        if ( res.error )
            callback( {error: res.error} );
        else {
            room.name = res.name;
            room.addPeer( res.peers );
            room.connectWithPeers();
            callback( {room: room} );
        }
    });
};


Room.prototype.createRoom = function( options, callback ){
    var room = this,
        params = {},
        cb;
    if ( arguments.length === 1 ){
        params.name = false;
        params.password = false;
        cb = options;
    }
    else {
        params.name = options.name;
        params.password = options.password;
        cb = callback;
    }

    this.io.emit( 'createRoom', params, function( res ){
        if ( res.error )
            cb( {error: res.error} );
        else {
            room.name = res.name;
            cb( {room: room} );
        }
    });
};


/**
 * @param {string|string[]} peerId
 */
Room.prototype.addPeer = function( peerId ){
    var room = this;
    if ( peerId instanceof Array )
        peerId.forEach( function( id ){
            this.addPeer( id );
        }, this );
    else if ( peerId != this.id ){
        var peer = new Peer( peerId, {iceServers: this.iceServers} );
        this.peers.push( peer );

        peer.on( 'iceCandidate', function( candidate ){
            room.io.emit( 'iceCandidate', {id: peer.id, candidate: candidate} );
        });

        peer.on( 'getOffer', function( offer ){
            room.io.emit( 'offer', {id: peer.id, sdp: offer.sdp}, offer.callback );
        });

        peer.on( 'connected', function(){
            room.emit( 'peerConnected', peer );
        });

        peer.on( 'remoteStream', function( stream ){
            room.emit( 'remoteStream', {peer: peer, stream: stream} );
        });
    }
    return peer;
};


Room.prototype.connectWithPeers = function(){
    this.peers.forEach( function( peer ){
        !peer.connected && peer.connect( this.localStream );
    }, this );
};


Room.prototype.getPeerById = function( id ){
    var peers = this.peers;
    for ( var i = 0; i < peers.length; i++ )
        if ( peers[i].id === id )
            return peers[i];
    return false;
};


/**
 * @constructor
 */
function Peer( id, options ){
    var peer = this;
    this.id = id;
    this.iceServers = options.iceServers;

    this.pc = new Peer.PeerConnection( {iceServers: this.iceServers} );
    this.pc.onicecandidate = function( event ){
        peer.emit( 'iceCandidate', event.candidate );
    };
    this.pc.onaddstream = function( event ){
        peer.remoteStream = event.stream;
        peer.emit( 'remoteStream', event.stream );
    };
    this.pc.onsignalingstatechange = function(){
        console.log( peer.pc.signalingState );
        if ( peer.pc.signalingState === 'stable' ){
            peer.connected = true;
            peer.emit( 'connected' );
        }
    };
    this.pc.onnegotiationneeded = function(){
        console.log( 'onnegotiationneeded' );
    };
}
inherit( Peer, EventEmitter );
Peer.PeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;


Peer.prototype.connect = function( stream ){
    var peer = this;
    this.addStream( stream );
    this.getOffer( function( sdp, callback ){
        peer.emit( 'getOffer', {sdp: sdp, callback: callback} );
    });
};


Peer.prototype.setOffer = function( sdp, callback ){
    var peer = this;
    this.pc.setRemoteDescription( new RTCSessionDescription(sdp), function(){
        peer.pc.createAnswer( function( sdp ){
            peer.pc.setLocalDescription( sdp );
            callback( {sdp: sdp} );
        });
    });
};


Peer.prototype.getOffer = function( callback ){
    var peer = this;
    this.pc.createOffer( function( offerSdp ){
        peer.pc.setLocalDescription( offerSdp, function(){
            callback( offerSdp, function( answer ){
                peer.pc.setRemoteDescription( new RTCSessionDescription(answer.sdp) );
            });
        });
    });
};


Peer.prototype.addIceCandidate = function( candidate ){
    this.pc.addIceCandidate( new RTCIceCandidate(candidate) );
};


Peer.prototype.sendMedia = function( mediaType, callback ){
    var peer = this,
        manager = new StreamManager();
    manager.getLocalStream( mediaType, function( error, stream ){
        if ( error )
            callback( error );
        else
            peer.pc.addStream( stream );
    });
};


Peer.prototype.sendAudio = function(){
    this.sendMedia( StreamManager.MEDIA_AUDIO );
};


Peer.prototype.sendVideo = function(){
    this.sendMedia( StreamManager.MEDIA_VIDEO );
};


Peer.prototype.sendAudioVideo = function(){
    this.sendMedia( StreamManager.MEDIA_AUDIO_VIDEO );
};


Peer.prototype.sendScreen = function(){
    this.sendMedia( StreamManager.MEDIA_SCREEN );
};


Peer.prototype.addStream = function( stream ){
    this.pc.addStream( stream );
};


/**
 * @constructor
 * @singleton
 */
function StreamManager(){
    if ( !StreamManager._instance ){
        this.localStreams = {};
        StreamManager._instance = this;
    }
    return StreamManager._instance;
}


StreamManager.MEDIA_AUDIO = 'audio';
StreamManager.MEDIA_VIDEO = 'video';
StreamManager.MEDIA_AUDIO_VIDEO = 'audio video';
StreamManager.MEDIA_SCREEN = 'screen';


/**
 * @param {StreamManager.MEDIA_AUDIO|StreamManager.MEDIA_VIDEO|StreamManager.MEDIA_SCREEN} type
 * @param {function(error?, stream?)} callback
 */
StreamManager.prototype.getLocalStream = function( type, callback ){
    var manager = this;
    if ( this.localStreams[type] )
        callback( null, this.localStreams[type] );
    else if ( StreamManager.MEDIA_AUDIO === type )
        this.getUserMedia( {video: false, audio: true}, saveStream );
    else if ( StreamManager.MEDIA_VIDEO === type )
        this.getUserMedia( {video: true, audio: false}, saveStream );
    else if ( StreamManager.MEDIA_AUDIO_VIDEO === type )
            this.getUserMedia( {video: true, audio: true}, saveStream );
    else if ( StreamManager.MEDIA_SCREEN === type )
        this.getUserMedia( {video: true, audio: true, mediaSource: 'screen'}, saveStream );
    else
        throw new TypeError( 'Unknown media type: "' + type + '"' );

    function saveStream( error, stream ){
        if ( !error )
            manager.localStreams[type] = stream;
        callback( error, stream );
    }
};


/**
 * @param {Object} options
 * @param {Function} callback
 */
StreamManager.prototype.getUserMedia = function( options, callback ){
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    navigator.getUserMedia(
        { audio: options.audio, video: options.video },
        function( stream ){
            callback( null, stream );
        },
        function( error ){
            callback( error );
        }
    );
};


/**
 * @param {Stream} stream
 * @param {Element} node
 */
StreamManager.prototype.attachStream = function( stream, node ){
    if ( !node )
        throw new Error( 'Hey man, where is my video node? Fuck off!' );

    if ( isFirefox() )
        node.mozSrcObject = stream;
    else
        node.src = URL.createObjectURL( stream );

    node.play && node.play();

    function isFirefox(){
        return !!navigator.mozGetUserMedia;
    }
};