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
        roomInfoName = $( '#roomInfoName' );

    var mediaAudioEl = $( '#mediaAudio' ),
        mediaAudioVideoEl = $( '#mediaAudioVideo' ),
        mediaScreenEl = $( '#mediaScreen' );

    var remoteVideo = document.getElementById('remote-video'),
        localVideo = document.getElementById('local-video'),
        remoteAudio = document.getElementById('remote-audio');

    buttonsContainer.fadeIn();

    var room = new Room({
        socketUrl: config.socketUrl,
        mediaType: config.mediaType,
        autoConnect: true,
        iceServers: config.iceServers,
        localVideoEl: localVideo
    });

    room.on( 'connected', function(){
        console.log( 'Room connected' );
    });

    room.on( 'disconnected', function(){
        console.log( 'Room disconnected' );
    });

    room.on( 'localStream', function( stream ){
        console.log( 'localStream', stream );
    });

    room.on( 'localStreamError', function( error ){
        var message = 'Error with local stream: ' + error.name;
        console.error( message );
        alert( message );
    });

    room.on( 'remoteStream', function( data ){
        console.log( 'remoteStream', data );
        var stream = data.stream;
        room.attachStream( stream, remoteVideo );
    });

    room.on( 'peerConnected', function( peer ){
        console.log( 'peerConnected', peer.id );
    });

    room.on( 'peerDisconnected', function( peer ){
        console.log( 'peerDisconnected' );
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

    mediaAudioVideoEl.change( mediaRadioChange );
    mediaAudioEl.change( mediaRadioChange );
    mediaScreenEl.change( mediaRadioChange );

    function mediaRadioChange(){
        var mediaType = $( this ).val();
        room.setLocalStreamType( mediaType );
    }
});
