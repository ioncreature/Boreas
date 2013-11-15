/**
 * @author Alexander Marenin
 * October 2013
 */


/**
 * Classic single-parent inheritance
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
        base: {
            enumerable: false,
            value: function(){
                // It doesn't work in strict mode
                var callee = arguments.callee,
                    name = callee.name;

                if ( callee === ChildClass )
                    return BaseClass.apply( this, arguments );
                else if ( typeof BaseClass.prototype[name] === 'function' )
                    return BaseClass.prototype[name].apply( this, arguments );
                else
                    throw new ReferenceError( 'Unknown method "'+ name +'"' );
            }
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
 * @param {string?} eventName
 */
EventEmitter.prototype.removeListeners = function( eventName ){
    if ( !eventName )
        this._callbacks = {};
    else
        delete this._callbacks[eventName];
};


/**
 * @param {EventHandler} eventHandler
 */
EventEmitter.prototype.removeListener = function( eventHandler ){
    var name = eventHandler.name,
        index = this._callbacks[name].indexOf( eventHandler );

    if ( index > -1 )
        delete this._callbacks[name][i];
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
