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

    var remoteVideo = document.getElementById('remote-video'),
        localVideo = document.getElementById('local-video'),
        remoteVideos = $( '#remote-videos' );

    buttonsContainer.fadeIn();

    { // Video
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
            var stream = data.stream,
                peer = data.peer;
            room.attachStream( stream, addPeerEl( peer ) );
        });

        room.on( 'peerConnected', function( peer ){
            console.log( 'peerConnected', peer.id );
            addPeerEl( peer );
        });

        room.on( 'peerDisconnected', function( peer ){
            console.log( 'peerDisconnected' );
            removePeerEl( peer );
        });

        function addPeerEl( peer ){
            var e = getPeerEl( peer );
            if ( !e ){
                e = document.createElement( 'video' );
                e.id = peer.id;
                e.autoplay = true;
                remoteVideos.append( e );
                updateVideosContainerClass();
            }
            return e;
        }

        function getPeerEl( peer ){
            return document.getElementById( peer.id );
        }

        function removePeerEl( peer ){
            var e = getPeerEl( peer );
            if ( e )
                e.parent.removeChild( e );
            updateVideosContainerClass();
        }

        function updateVideosContainerClass(){
            var count = remoteVideos[0].children.length || 1;
            remoteVideos.removeClass( 'e1 e2 e3 e4 e5 e6' ).addClass( 'e' + count );
        }
    }


    { // Forms
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
    }


    { // Radio buttons
        $( '#mediaAudio' ).change( mediaRadioChange );
        $( '#mediaAudioVideo' ).change( mediaRadioChange );
        $( '#mediaScreen' ).change( mediaRadioChange );

        function mediaRadioChange(){
            var mediaType = $( this ).val();
            room.setLocalStreamType( mediaType );
        }
    }
});
