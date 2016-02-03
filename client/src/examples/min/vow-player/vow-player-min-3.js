///////////////////////////////////////////
//////////////Fields////////////////////

//Prepare config
var config = new Configuration();

//Video width resolution
config.videoWidth = 320;

//Video height resolution
config.videoHeight = 240;

//Web Call Server Websocket URL
var url = setURL();

//The stream name can be an RTSP URL for playback
//Example: rtsp://192.168.1.5:1935/live/stream1
var streamName;

//The streamName can be also WebRTC stream ID. Example:
//var streamName = "XP34dq6aqJK0V09o5RbU";

//Get API instance
var f = Flashphoner.getInstance();

//get player instance
var wsPlayer;

//Current stream
var stream = {};

///////////////////////////////////////////
//////////////Initializing////////////////////

// Setup button actions
$(document).ready(function () {

    disablePlayBtn();
    disablePauseBtn();

    var url = setURL();
    $("#urlServer").val(url);

    $("#connectBtn").click(function () {
        var str = $("#connectBtn").text();
        if (str == "Connect") {
            disableConnBtn();
            connect();
        } else if (str == "Disconnect") {
            disableConnBtn();
            disconnect();
        }
    });

    $("#playBtn").click(function () {
        var str = $("#playBtn").text();
        if (str == "Play") {
            if ($("#streamId").val()) {
                disablePlayBtn();
                playStream();
            }
        } else if (str == "Stop") {
            disablePlayBtn();
            stopStream();
        }
    });

    $("#pauseBtn").click(function () {
        var str = $("#pauseBtn").text();
        if (str == "Pause") {
            pause();
        } else if (str == "Resume") {
            resume();
        }
    });

    $("#infoDiv").hide();
    $("#videoCanvas").click(function(){
            if ($("#infoDiv").is(':visible')){
                $("#infoDiv").hide();
            }else{
                $("#infoDiv").show();
            }
        }
    );

});

//set WCS URL
function setURL() {
    var proto;
    var url;
    var port;
    if (window.location.protocol == "http:") {
        proto = "ws://";
        port = "8080";
    } else {
        proto = "wss://";
        port = "8443";
    }

    url = proto + window.location.hostname + ":" + port;
    return url;
}

// Init player
function initOnLoad() {

    //add listeners
    f.addListener(WCSEvent.ErrorStatusEvent, errorEvent);
    f.addListener(WCSEvent.ConnectionStatusEvent, connectionStatusListener);
    f.addListener(WCSEvent.StreamStatusEvent, streamStatusListener);
    f.init();

    //create player
    var canvas = document.getElementById('videoCanvas');
    wsPlayer = new WSPlayer(canvas);
    wsPlayer.initLogger(3);
    initVisibility();
}

/////////////////////////////////////////////////////
///////////////Controls///////////////////////
/////////////////////////////////////////////////////

// Connect signaling part
function connect() {
    //connect to server
    f.connect({
        urlServer: $("#urlServer").val(),
        appKey: "defaultApp",
        useWsTunnel: true,
        useBase64BinaryEncoding: false,
        width: config.videoWidth,
        height: config.videoHeight
    });
}

// Disconnect
function disconnect() {
    f.disconnect();
}

function playFirstSound() {
    wsPlayer.playFirstSound();
}

function playStream() {
    //play a sound to enable mobile loudspeakers
    playFirstSound();
    var stream = new Stream();
    stream.name = document.getElementById("streamId").value;
    stream.hasVideo = true;
    stream.sdp = "v=0\r\n" +
    "o=- 1988962254 1988962254 IN IP4 0.0.0.0\r\n" +
    "c=IN IP4 0.0.0.0\r\n" +
    "t=0 0\r\n" +
    "a=sdplang:en\r\n" +
    "m=video 0 RTP/AVP 32\r\n" +
    "a=rtpmap:32 MPV/90000\r\n" +
    "a=recvonly\r\n" +
    "m=audio 0 RTP/AVP 0\r\n" +
    "a=rtpmap:0 PCMU/8000\r\n" +
    "a=recvonly\r\n";
    stream.mediaProvider = "WebRTC";
    this.stream = f.playStream(stream);
    wsPlayer.play();
}

function stopStream() {
    f.stopStream(stream);
}

function pause(){

    disablePauseBtn();

    wsPlayer.pause();
    f.pauseStream(stream);
}

function resume(){

    disablePauseBtn();

    wsPlayer.resume();
    f.playStream(stream);
}

function writeInfo(str) {
    var div = document.getElementById('infoDiv');
    div.innerHTML = div.innerHTML + str + "<BR>";
}

///////////////////////////////////////////
//////////////Listeners////////////////////

//Connection Status
function connectionStatusListener(event) {
    console.log(event.status);
    if (event.status == ConnectionStatus.Established) {
        console.log('Connection has been established. Press Play to get stream.');
        writeInfo("CONNECTED, press play");
        //init wsPlayer
        config.token = f.connection.authToken;
        config.urlWsServer = $("#urlServer").val();
        config.receiverPath = "../../../dependencies/websocket-player/WSReceiver.js";
        wsPlayer.init(config);
        displayConnectionEstablished();
    } else if (event.status == ConnectionStatus.Disconnected) {
        wsPlayer.stop();
        console.log("Disconnected");
        writeInfo("DISCONNECTED");
        displayConnectionDisconnected();
    } else if (event.status == ConnectionStatus.Failed) {
        wsPlayer.stop();
        writeInfo("CONNECTION FAILED");
        f.disconnect();
        displayConnectionFailed();
    }

    setStatus(event.status);
}

//Stream Status
function streamStatusListener(event) {
    console.log(event.status);
    switch (event.status) {
        case StreamStatus.Failed:
        case StreamStatus.Stoped:
            wsPlayer.stop();
            displayStreamStopped();
            break;
        case StreamStatus.Playing:
            displayStreamPlaying();
            break;
        case StreamStatus.Paused:
            displayStreamPaused();
            break;
    }
    writeInfo("Stream " + event.status);
    this.stream.status = event.status;
    setStreamStatus(event.status);
}

//Error listener
function errorEvent(event) {
    console.log(event.info);
    wsPlayer.stop();
}

///////////////////////////////////////////
//////////////Display UI////////////////////

// Set Connection Status
function setStatus(status) {

    $("#connStatus").text(status);
    $("#connStatus").className='';

    if (status == "ESTABLISHED") {
        $("#connStatus").attr("class","text-success");
    }

    if (status == "DISCONNECTED") {
        $("#connStatus").attr("class","text-muted");
    }

    if (status == "FAILED") {
        $("#connStatus").attr("class","text-danger");
    }
}

// Set Stream Status
function setStreamStatus(status) {

    $("#streamStatus").text(status);
    $("#streamStatus").className='';

    if (status == "FAILED") {
        $("#streamStatus").attr("class","text-danger");
    }

    if (status == "STOPPED") {
        $("#streamStatus").attr("class","text-muted");
    }

    if (status == "PLAYING") {
        $("#streamStatus").attr("class","text-success");
    }

    if (status == "PAUSED") {
        $("#streamStatus").attr("class","text-primary");
    }
}

// Display connection state
function displayConnectionDisconnected(){
    //Display DISCONNECTED state
    enableConnBtn();
    disablePauseBtn();
    disablePlayBtn();
    $("#pauseBtn").text("Pause");
    $("#playBtn").text("Play");
    $("#connectBtn").text("Connect");
}

function displayConnectionFailed(){
    //Display FAILED state
    enableConnBtn();
    $("#connectBtn").text("Connect");
}

// Display stream state
function displayConnectionEstablished(){
    // Display ESTABLISHED state
    enablePlayBtn();
    enablePauseBtn();
    enableConnBtn();
    $("#connectBtn").text("Disconnect");
}

function displayStreamStopped(){
    // Display stream stopped state
    $("#playBtn").text("Play");
    enablePlayBtn();
    disablePauseBtn();
    $("#pauseBtn").text("Pause");
}

function displayStreamPlaying(){
    // Display stream playing state
    $("#playBtn").text("Stop");
    enablePlayBtn();
    enablePauseBtn();
    $("#pauseBtn").text("Pause");
}

function displayStreamPaused(){
    // Display stream paused State
    enablePauseBtn();
    $("#pauseBtn").text("Resume");
}

// Enable disable buttons: connectionBtn, playBtn, pauseBtn
function enableConnBtn(){
    $("#connectionBtn").prop("disabled", false);
}

function disableConnBtn(){
    $("#connectionBtn").prop("disabled", true);
}

function enablePauseBtn(){
    $("#pauseBtn").prop("disabled", false);
}

function disablePauseBtn(){
    $("#pauseBtn").prop("disabled", true);
}

function enablePlayBtn(){
    $("#playBtn").prop("disabled", false);
}

function disablePlayBtn(){
    $("#playBtn").prop("disabled", true);
}


/////////////////////////////////////////////////////
///////////////Page visibility///////////////////////

var hidden = undefined;
function initVisibility() {
    var visibilityChange;
    if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
        this.hidden = "hidden";
        visibilityChange = "visibilitychange";
    } else if (typeof document.mozHidden !== "undefined") {
        this.hidden = "mozHidden";
        visibilityChange = "mozvisibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
        this.hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
        this.hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
    }
    if (typeof this.hidden === "undefined") {
        console.error("Visibility API not supported, player will continue to play when in background");
    } else {
        document.addEventListener(visibilityChange, visibilityHandler.bind(this), false);
    }
}

function visibilityHandler() {
    if (document[this.hidden]) {
        console.log("Document hidden, mute player");
        if (wsPlayer && stream && stream.status == StreamStatus.Playing) {
            wsPlayer.mute(true);
        }
    } else {
        console.log("Document active, unmute player");
        if (wsPlayer && stream && stream.status == StreamStatus.Playing) {
            wsPlayer.mute(false);
        }
    }
}