/**
 * @author Marenin Alex
 * October 2013
 */


/**
 * @param {Object} options
 * @inherits EventEmitter
 * @constructor
 */
function Room( options ){
    this.socketUrl = options.socketUrl;
    this.iceServers = options.iceServers;
    this.id = Date.now().toString();
    this.mediaType = options.mediaType || Room.MEDIA_VIDEO;
    this.streamManager = new StreamManager();
    this.localVideoEl = options.localVideoEl;
    this.peers = [];
    this.connected = false;

    if ( options.autoConnect )
        this.connect();
}
inherit( Room, EventEmitter );


Room.MEDIA_AUDIO = 'audio';
Room.MEDIA_VIDEO = 'video';
Room.MEDIA_AUDIO_VIDEO = 'audio video';
Room.MEDIA_SCREEN = 'screen';


Room.prototype.connect = function(){
    var room = this;
    room.io = io.connect( room.socketUrl );
    room.io.on( 'connect', function(){
        room.connected = true;
        room.io.emit( 'initUser', {id: room.id} );
        room.emit( 'connected' );
    });

    room.io.on( 'disconnect', function(){
        room.connected = false;
        room.emit( 'disconnected' );
    });

    room.io.on( 'offer', function( offer, fn ){
        var id = offer.id,
            peer = room.getPeerById( id ) || room.addPeer( id );
        peer.addStream( room.localStream );
        peer.setOffer( offer.sdp, fn );
    });

    room.io.on( 'iceCandidate', function( req ){
        var id = req.id,
            peer = room.getPeerById( id );
        if ( peer && req.candidate )
            peer.addIceCandidate( req.candidate );
    });

    room.setLocalStreamType( room.mediaType );
};


Room.prototype.isConnected = function(){
    return !!this.connected;
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

        peer.on( 'disconnect', function(){
            room.emit( 'peerDisconnected', peer );
            room.removePeer( peer );
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


Room.prototype.removePeer = function( peer ){
    var i = this.peers.indexOf( peer );
    if ( i > -1 ){
        this.peers[i].destroy();
        this.peers.splice( i, 1 );
    }
};


Room.prototype.attachStream = function( stream, node, volume ){
    this.streamManager.attachStream( stream, node );
};


Room.prototype.setLocalStreamType = function( mediaType ){
    var room = this;
    room.streamManager.getLocalStream( mediaType, function( error, stream ){
        if ( error )
            room.emit( 'localStreamError', error );
        else {
            room.localStream = stream;
            if ( room.localVideoEl )
                room.attachStream( stream, room.localVideoEl );
            room.emit( 'localStream', stream );
            room.changePeersStream( stream );
        }
    });
};


Room.prototype.changePeersStream = function( stream ){
    this.peers.forEach( function( peer ){
        peer.changeStream( stream );
    });
};


/**
 * @constructor
 * @extends EventEmitter
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
        if ( peer.pc.signalingState === 'stable' ){
            peer.connected = true;
            peer.emit( 'connected' );
        }
    };
    this.pc.onnegotiationneeded = function(){
        console.log( 'Negotiation Needed' );
    };
    this.pc.oniceconnectionstatechange = function(){
        console.log( 'iceConnectionState', peer.pc.iceConnectionState );
        switch ( peer.pc.iceConnectionState ){
            case 'new':
            case 'checking':
            case 'completed':
            case 'connected':
                break;
            case 'failed':
            case 'disconnected':
            case 'closed':
                peer.connected = false;
                peer.emit( 'disconnect' );
                break;
        }
    }
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


Peer.prototype.destroy = function(){
    this.removeListeners();
    // TODO
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
                if ( answer.error )
                    alert( error );
                else
                    peer.pc.setRemoteDescription( new RTCSessionDescription(answer.sdp) );
            });
        });
    });
};


Peer.prototype.addIceCandidate = function( candidate ){
    this.pc.addIceCandidate( new RTCIceCandidate(candidate) );
};


Peer.prototype.addStream = function( stream ){
    this.localStream = stream;
    this.pc.addStream( stream );
};


Peer.prototype.changeStream = function( stream ){
    var oldStream = this.localStream;
    this.pc.removeStream( oldStream );
    this.connect( stream );
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


/**
 * @param {Room.MEDIA_AUDIO|Room.MEDIA_VIDEO|Room.MEDIA_SCREEN} type
 * @param {function(error?, stream?)} callback
 */
StreamManager.prototype.getLocalStream = function( type, callback ){
    var manager = this;
    if ( this.localStreams[type] )
        callback( null, this.localStreams[type] );
    else if ( Room.MEDIA_AUDIO === type )
        this.getUserMedia( {video: false, audio: true}, saveStream );
    else if ( Room.MEDIA_VIDEO === type )
        this.getUserMedia( {video: true, audio: false}, saveStream );
    else if ( Room.MEDIA_AUDIO_VIDEO === type )
            this.getUserMedia( {video: true, audio: true}, saveStream );
    else if ( Room.MEDIA_SCREEN === type ){
        removeStream( Room.MEDIA_AUDIO_VIDEO );
        removeStream( Room.MEDIA_VIDEO );
        this.getUserMedia({
            video: {
                mandatory: {chromeMediaSource: 'screen'}
            },
            audio: true
        }, saveStream );
    }
    else
        throw new TypeError( 'Unknown media type: "' + type + '"' );

    function saveStream( error, stream ){
        if ( !error )
            manager.localStreams[type] = stream;
        callback( error, stream );
    }

    function removeStream( type ){
        var stream = manager.localStreams[type];
        delete manager.localStreams[type];
        if ( stream )
            stream.stop();
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