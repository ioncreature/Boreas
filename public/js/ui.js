/**
 * @author Marenin Alex
 * November 2013
 */
 
$( function(){
    var buttonsContainer = $( '#buttons' ),
        videoContainer = $( '#video' ),
        joinRoomForm = $( '#join-room-form' ),
        buttonJoin = $( '#join' ),
        roomName = $( '#room-name' ),
        roomInfoName = $( '#room-info-name' );

    var localVideo = document.getElementById('local-video'),
        remoteVideos = $( '#remote-videos' );

    buttonsContainer.fadeIn( 600 );

    { // Video
        var room = new Room({
            socketUrl: config.socketUrl,
            mediaType: config.mediaType,
            autoConnect: true,
            iceServers: config.iceServers,
            localVideoEl: localVideo
        });

        room.on( 'connected', function( name ){
            console.log( 'Room connected', name );
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
                updateVideoContainerClass();
            }
            return e;
        }

        function getPeerEl( peer ){
            return document.getElementById( peer.id );
        }

        function removePeerEl( peer ){
            var e = getPeerEl( peer );
            if ( e )
                e.parentNode.removeChild( e );
            updateVideoContainerClass();
        }

        function updateVideoContainerClass(){
            var count = remoteVideos[0].children.length || 1;
            remoteVideos.removeClass( 'e1 e2 e3 e4 e5 e6' ).addClass( 'e' + count );
        }
    }


    { // Forms
        $( '#new-room' ).click( function(){
            buttonsContainer.fadeOut();
            videoContainer.fadeIn();
            room.createRoom( function( res ){
                if ( res.error )
                    alert( error );
                else
                    roomInfoName.val( room.name );
            });
        });
        $( '#open-join-room-form' ).click( function(){
            buttonsContainer.fadeOut( 300, function(){
                joinRoomForm.fadeIn();
            });
        });

        $( '#reject-join' ).click( function(){
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
        $( '#media-audio' ).change( mediaRadioChange );
        $( '#media-audio-video' ).change( mediaRadioChange );
        $( '#media-screen' ).change( mediaRadioChange );

        function mediaRadioChange(){
            var mediaType = $( this ).val();
            room.setLocalStreamType( mediaType );
        }
    }
});
