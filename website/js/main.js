/**
 * @author Marenin Alex
 * October 2013
 */


$( function(){



});











function Chat( options ){
    this.remoteVideo = options.remoteVideo;
    this.localVideo = options.localVideo;
    this.socketUrl = options.socketUrl;
}


Chat.prototype.start = function( callback ){
    this.socket = io.connect( this.socketUrl );
    this.socket.on( 'connect', function(){} );
};

