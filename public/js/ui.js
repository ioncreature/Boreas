/**
 * @author Marenin Alex
 * November 2013
 */
 
$( function(){
    var buttonsContainer = $( '#buttons' ),
        videoContainer = $( '#video' ),
        joinRoomForm = $( '#joinRoomForm' ),
        buttonJoin = $( '#join' ),
        roomName = $( '#roomName' ),
        roomInfoName = $( '#roomInfoName' ),
        localStreamShowed = false;

    var remoteVideo = document.getElementById('remote-video'),
        localVideo = document.getElementById('local-video'),
        remoteAudio = document.getElementById('remote-audio');

    buttonsContainer.fadeIn();

    var room = new Room({
        socketUrl: config.socketUrl,
        mediaType: 'audio video',
        autoConnect: true,
        iceServers: [{url: 'stun:stun.l.google.com:19302'}]
    });

    room.on( 'connected', function(){
        room.streamManager.getLocalStream( StreamManager.MEDIA_VIDEO, function( error, stream ){
            if ( error )
                alert( 'Error happened when tried to catch local media stream' );
            else
                room.streamManager.attachStream( stream, localVideo );
        });
    });

    room.on( 'remoteStream', function( data ){
        console.log( 'remoteStream', data );
        var stream = data.stream;
        room.streamManager.attachStream( stream, remoteVideo );
    });

    room.on( 'peerConnected', function( peer ){
        console.log( 'peerConnected', peer.id );
    });

    $( '#newRoom' ).click( function(){
        buttonsContainer.fadeOut();
        videoContainer.fadeIn();
        room.createRoom( function( res ){
            if ( res.error )
                alert( error );
            else
                roomInfoName.val( room.name );
        });
    });
    $( '#openJoinRoomForm' ).click( function(){
        buttonsContainer.fadeOut( 300, function(){
            joinRoomForm.fadeIn();
        });
    });

    $( '#rejectJoin' ).click( function(){
        joinRoomForm.fadeOut( 200, function(){
            buttonsContainer.fadeIn();
            roomName.trigger( 'change' );
        });
    });

    buttonJoin.click( function(){
        var name = roomName.val().trim();
        if ( name )
            room.joinRoom({ name: name }, function( res ){
                if ( res.error )
                    alert( res.error );
                else {
                    joinRoomForm.fadeOut();
                    videoContainer.fadeIn();
                    roomInfoName.val( room.name );
                }
            });
        else
            roomName.closest( '.form-group' ).addClass( 'has-error' );
    });

    roomName.on( 'keydown keyup change', function(){
        roomName.closest( '.form-group' ).removeClass( 'has-error' );
    });
});
