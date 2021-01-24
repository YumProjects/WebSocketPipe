const WebSocket = require("ws");
const readline = require("readline");

function run(port, outgoingHost){
    var server = new WebSocket.Server({ port: port });
    var outgoingWs;

    server.on("connection", function(incomingWs, req) {
        // Make sure there's not already someone connected
        if(outgoingWs != undefined && outgoingWs.readyState != WebSocket.CLOSED){
            incomingWs.close();
            return;
        }

        var outgoingQueue = [];

        var remoteAddr = req.socket.remoteAddress;
        console.log("Connection from %s for '%s' (protocol: '%s').", remoteAddr, req.url, incomingWs.protocol);

        // Begin connecting to outgoing
        var outgoingUri = "ws://" + outgoingHost + req.url;
        console.log("Connecting to '%s'...", outgoingUri);
        outgoingWs = new WebSocket(outgoingUri, incomingWs.protocol);

        outgoingWs.on("open", function(){
            console.log("Connected to outgoing.")

            // Send any queued messages
            for(var i = 0; i < outgoingQueue.length; i++){
                outgoingWs.send(outgoingQueue[i]);
            }
            outgoingQueue = [];
        });

        outgoingWs.on("message", function(message){
            incomingWs.send(message);
        });

        outgoingWs.on("close", function(){
            console.log("Outgoing disconnected.");
            if(incomingWs.readyState != WebSocket.CLOSED && incomingWs.readyState != WebSocket.CLOSING){
                incomingWs.close();
            }
        });

        outgoingWs.on("error", function(err){
            console.log("Outgoing error: %s", err);
            outgoingWs.close();
        });

        incomingWs.on("message", function(message){
            if(outgoingWs.readyState == WebSocket.OPEN){
                outgoingWs.send(message);
            }
            else{
                // If outgoing isn't connected yet than queue it
                outgoingQueue.push(message);
            }
        })
    
        incomingWs.on("close", function(){
            console.log("Incoming disconnected.");
            if(outgoingWs.readyState != WebSocket.CLOSED && outgoingWs.readyState != WebSocket.CLOSING){
                outgoingWs.close();
            }
        });

        incomingWs.on("error", function(err){
            console.log("Incoming error: %s", err);
            incomingWs.close();
        });
    });
    
    server.on("listening", function(){
        console.log("Listening...");
    });
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Server port: ", function(portStr){
    var port = Number.parseInt(portStr);
    rl.question("Outgoing host: ", function(outgoingHost){
        run(port, outgoingHost);
    });
});