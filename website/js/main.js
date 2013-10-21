/**
 * @author Marenin Alex
 * October 2013
 */


function Chat( options ){
    this.remoteVideo = options.remoteVideo;
    this.localVideo = options.localVideo;
    this.socketUrl = options.socketUrl;
    this.id = String( Date.now() + Math.random() );
}


Chat.MEDIA_AUDIO = 1;
Chat.MEDIA_VIDEO = 2;
Chat.MEDIA_SCREEN = 3;


Chat.prototype.connect = function(){
    this.socket = io.connect( this.socketUrl );
    this.socket.emit( 'initUser', {userId: this.id} );
};


Chat.prototype.joinRoom = function( options, callback ){
    var chat = this;
    this.socket.emit( 'joinRoom', {
        roomName: options.roomName,
        password: options.password || '',
        mediaType: options.media || Chat.MEDIA_VIDEO
    }, function( res ){
        if ( res.error )
            callback( res.error );
        else {
            chat.roomName = res.roomName;
            chat.members = res.members;
            chat.connectWithMembers();
            callback();
        }
    });
};


Chat.prototype.connectWithMembers = function(){

};