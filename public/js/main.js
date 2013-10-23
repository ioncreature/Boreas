/**
 * @author Marenin Alex
 * October 2013
 */


/**
 * @param {Object} options
 * @param {boolean?} options.autoConnect
 * @constructor
 */
function Server( options ){
    this.socketUrl = options.socketUrl;
    if ( options.autoConnect )
        this.connect();
}


Server.prototype.connect = function(){
    this.socket = io.connect( this.socketUrl );
    this.emit( 'connect' );
};


Server.prototype.emit = function( event, data, callback ){
    if ( arguments.length === 2 )
        this.socket.emit( event, data );
    else if ( arguments.length === 3 )
        this.socket.emit( event, data, callback );
    else
        throw new Error( 'WTF' );
};


Server.prototype.on = function( event, callback ){
    this.socket.on( event, callback );
};


/**
 * @param {Server} server
 * @param {Object} options
 * @constructor
 */
function Peer( server, options ){
    this.server = server;
    this.remoteVideo = options.remoteVideo;
    this.remoteAudio = options.remoteAudio;
    this.id = options.id || Date.now().toString();
}


Peer.prototype.connect = function(){
    this.server.emit( 'initUser', {id: this.id} );
};


Peer.prototype.joinRoom = function( options, callback ){
    var peer = this;
    this.socket.emit( 'joinRoom', {
        roomName: options.roomName,
        password: options.password || ''
    }, function( res ){
        if ( res.error )
            callback( res.error );
        else {
            peer.room = new Room( res.roomName, res.members );
            peer.connectWithRoomMembers();
            callback( null, peer.room );
        }
    });
};


Peer.prototype.createRoom = function( options, callback ){
    var peer = this;
    this.server.emit( 'createRoom', {
        roomName: options.roomName,
        password: options.password
    }, function( res ){
        if ( res.error )
            callback( error );
        else {
            peer.room = new Room( res.roomName, res.members );
            callback( null, peer.room );
        }
    });
};


Peer.prototype.connectWithRoomMembers = function(){
    this.room.getMembers().forEach( function( remotePeer ){
        this.connectPeer( remotePeer );
    }, this );
};


/**
 * @param {RemotePeer} peer
 */
Peer.prototype.connectPeer = function( peer ){
    RemotePeer.initConnection();
};


function RemotePeer( id ){
    this.id = id;
}


RemotePeer.prototype.connect = function( user ){};


/**
 * @param {string} name
 * @param {Array} members
 * @constructor
 */
function Room( name, members ){
    this.name = name;
    this.members = members.map( function( id ){
        return new RemotePeer( id );
    });
}


/**
 * @returns {Array}
 */
Room.prototype.getMembers = function(){
    return this.members || [];
};


/**
 * @constructor
 */
function StreamManager(){
    this.localStreams = {};
    StreamManager._instance = this;
}


StreamManager.MEDIA_AUDIO = 'audio';
StreamManager.MEDIA_VIDEO = 'video';
StreamManager.MEDIA_SCREEN = 'screen';


StreamManager.getInstance = function(){
    return StreamManager._instance || new StreamManager();
};


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