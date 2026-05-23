export var SocketEvents;
(function (SocketEvents) {
    SocketEvents["CONNECT"] = "connection";
    SocketEvents["DISCONNECT"] = "disconnect";
    SocketEvents["MESSAGE"] = "message";
    SocketEvents["TYPING"] = "typing";
    SocketEvents["RECEIPT"] = "receipt";
    SocketEvents["JOIN_ROOM"] = "join_room";
    SocketEvents["LEAVE_ROOM"] = "leave_room";
    SocketEvents["ERROR"] = "error";
})(SocketEvents || (SocketEvents = {}));
