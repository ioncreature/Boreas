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
    if ( options.autoConnect )
        this.connect();
    this.remoteVideo = options.remoteVideo;
    this.remoteAudio = options.remoteAudio;
    this.iceServers = options.iceServers;
    this.id = Date.now().toString();
    this.mediaType = StreamManager.MEDIA_VIDEO;
    this.streamManager = new StreamManager();
    this.peers = [];
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
        var id = offer.id,
            peer = room.getPeerById( id ) || room.addPeer( id );
        peer.setOffer( offer.sdp, fn );
    });

    room.io.on( 'iceCandidate', function( req ){
        var id = req.id,
            peer = room.getPeerById( id );
        if ( peer )
            peer.addIceCandidate( req.candidate );
    });
};


Room.prototype.joinRoom = function( options, callback ){
    var room = this;
    this.io.emit( 'joinRoom', {
        roomName: options.roomName,
        password: options.password || ''
    }, function( res ){
        if ( res.error )
            callback( res.error );
        else {
            room.roomName = res.roomName;
            room.addPeer( res.peers );
            room.connectWithMembers();
            callback( null, room );
        }
    });
};


Room.prototype.createRoom = function( options, callback ){
    var room = this;
    this.io.emit( 'createRoom', {
        roomName: options.roomName,
        password: options.password
    }, function( res ){
        if ( res.error )
            callback( error );
        else {
            room.roomName = res.roomName;
            room.addPeer( res.peers );
            callback( null, room );
        }
    });
};


Room.prototype.addPeer = function( peerId ){
    var room = this;
    if ( peerId instanceof Array )
        peerId.forEach( function( id ){
            this.addPeer( id );
        }, this );
    else {
        var peer = new Peer( peerId, {iceServers: options.iceServers} );
        this.peers.push( peer );
        peer.on( 'iceCandidate', function( candidate ){
            room.io.emit( 'iceCandidate', {id: room.id, candidate: candidate} );
        });

        peer.on( 'getOffer', function( offer ){
            room.io.emit( 'offer', {id: room.id, sdp: offer.sdp}, offer.callback );
        });
    }
};


Room.prototype.connectWithPeers = function(){
    this.peers.forEach( function( peer ){
        !peer.connected && peer.connect();
    }, this );
};


Room.prototype.getPeerById = function( id ){
    var peers = this.peers;
    for ( var i = 0; i < peers.legth; i++ )
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

    this.pc = new Peer.PeerConnection( this.iceServers );
    this.pc.onicecandidate = function( event ){
        peer.emit( 'iceCandidate', event.candidate );
    };
    this.pc.onaddstream = function( event ){
        peer.stream = event.stream;
        peer.emit( 'addStream', event.stream );
    };
}
inherit( Peer, EventEmitter );
Peer.PeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;


Peer.prototype.connect = function(){
    var peer = this;
    this.getOffer( function( sdp, callback ){
        peer.emit( 'getOffer', {sdp: sdp, callback: callback} );
    });
};


Peer.prototype.setOffer = function( sdp, callback ){
    var peer = this;
    this.pc.setRemoteDescription( new RTCSessionDescription(sdp) );
    this.pc.createAnswer( function( sdp ){
        peer.pc.setLocalDescription( sdp );
        callback( sdp );
    });
};


Peer.prototype.getOffer = function( callback ){
    var peer = this;
    this.pc.createOffer( function( offerSdp ){
        peer.pc.setLocalDescription( offerSdp );
        callback( offerSdp, function( remoteSdp ){
            peer.pc.setRemoteDescription( new RTCSessionDescription(remoteSdp) );
        });
    });
};


Peer.prototype.addIceCandidate = function( candidate ){
    this.pc.addIceCandidate( new RTCIceCandidate(candidate) );
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
StreamManager.MEDIA_SCREEN = 'screen';


/**
 * @param {StreamManager.MEDIA_AUDIO|StreamManager.MEDIA_VIDEO|StreamManager.MEDIA_SCREEN} type
 * @param {Function} callback
 */
StreamManager.prototype.getLocalStream = function( type, callback ){
    if ( this.localStreams[type] )
        callback( null, this.localStreams[type] );
    else if ( StreamManager.MEDIA_AUDIO === type )
        this.getUserMedia( {video: false, audio: true}, callback );
    else if ( StreamManager.MEDIA_VIDEO === type )
        this.getUserMedia( {video: true, audio: true}, callback );
    else if ( StreamManager.MEDIA_SCREEN === type )
        this.getUserMedia( {video: true, audio: true, mediaSource: 'screen'}, callback );
    else
        throw new TypeError( 'Unknown media type: "' + type + '"' );
};


/**
 * @param {Object} options
 * @param {Function} callback
 */
StreamManager.prototype.getUserMedia = function getUserMedia( options, callback ){
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
 * @constructor
 */
function EventEmitter(){}


/**
 * @param {string} eventName
 * @param {Function} callback
 * @param {Object?} context
 * @returns {EventHandler} callback handler
 */
EventEmitter.prototype.on = function( eventName, callback, context ){
    this._callbacks = this._callbacks || {};
    var handler = new EventHandler( this, eventName, callback, context );

    if ( this._callbacks[eventName] )
        this._callbacks[eventName].push( handler );
    else
        this._callbacks[eventName] = [handler];
    return handler;
};


/**
 * @param {string} eventName
 * @param {Function} callback
 * @param {Object?} context
 */
EventEmitter.prototype.once = function( eventName, callback, context ){
    var handler = this.on( eventName, callback, context );
    handler.setOnce( true );
    return handler;
};


/**
 * @param {string} eventName
 * @param {?} eventData
 */
EventEmitter.prototype.emit = function( eventName, eventData ){
    this._callbacks = this._callbacks || {};
    if ( this._callbacks[eventName] )
        this._callbacks[eventName].forEach( function( handler ){
            handler.exec( eventData );
        });
};


/**
 * @param {string} eventName
 */
EventEmitter.prototype.removeListeners = function( eventName ){
    delete this._callbacks[eventName];
};


/**
 * @param eventHandler
 */
EventEmitter.prototype.removeListener = function( eventHandler ){
    var name = eventHandler.name,
        index = this._callbacks[name].indexOf( eventHandler );

    if ( index > -1 )
        delete this._callbacks[name][i];
};


EventEmitter.prototype.removeAllListeners = function( eventName ){
    this._callbacks = [];
};


/**
 * @param {EventEmitter} emitter
 * @param {string} eventName
 * @param {Function} fn
 * @param {Object?} context
 * @constructor
 */
function EventHandler( emitter, eventName, fn, context ){
    this.emitter = emitter;
    this.name = eventName;
    this.fn = fn;
    this.context = context;
}


EventHandler.prototype.exec = function(){
    this.fn.apply( this.context || null, arguments );
    if ( this.once )
        this.remove();
};


EventHandler.prototype.remove = function(){
    this.emitter.removeListener( this );
};


EventHandler.prototype.setOnce = function( val ){
    this.once = !!val;
};


/**
 * @param {Function} ChildClass
 * @param {Function} BaseClass
 */
function inherit( ChildClass, BaseClass ){
    if ( typeof BaseClass != 'function' || typeof ChildClass != 'function' )
        throw new TypeError( 'Both parameters should be functions' );

    var proto = mixin( {}, ChildClass.prototype );
    ChildClass.prototype = Object.create( BaseClass.prototype, {
        constructor: {
            enumerable: false,
            value: ChildClass
        },
        base: function(){
            // It doesn't work in strict mode
            var name = arguments.callee.name;
            if ( typeof BaseClass.prototype[name] === 'function' )
                BaseClass.prototype[name].apply( this, arguments );
            else
                throw new ReferenceError( 'Unknown method "'+ name +'"' );
        }
    });
    mixin( ChildClass.prototype, proto );
}


/**
 * @param {Object} destination
 * @param {Object} source
 */
function mixin( destination, source ){
    for ( var k in source ) if ( source.hasOwnProperty(k) )
        destination[k] = source[k];
    return destination;
}