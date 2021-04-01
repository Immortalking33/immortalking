'use strict';

const express = require('express');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const RoomStates = {
  PLAYING: 'playing',
  PAUSED: 'paused',
};

const rooms = new Map();

const setupRoom = (roomId) => {
  const room = {
    participants: new Map()
  };
  rooms.set(roomId, room);
  return room;
}

const tearDownRoom = (roomId) => {
  rooms.delete(roomId);
}

const addUserToRoom = (roomId, nick, socketId) => {
  const room = room.get(roomId);
  if (room.participants.has(nick)) {
    return false;
  } else {
    room.participants.set(nick, socketId);
    return true;
  }
}

const removeUserFromRoom = (roomId, nick, socketId) => {
  const room = room.get(roomId);
  if (room.participants.has(nick) && room.participants.get(nick) === socketId) {
    room.participants.delete(nick);
    return true;
  } else {
    return false;
  }
}

const getUserCount = (roomId) => {
  return rooms.get(roomId).participants.size;
}

const setRoomState = (roomId, state) => {
  const room = rooms.get(roomId);
  room.state = state;
}

const getRoomState = (roomId) => {
  const room = rooms.get(roomId);
  return room.state;
}

const recalcRoomTime = (roomId, videoProgress) => {
  const room = rooms.get(roomId);
  if (!room.time) room.time = {};
  room.time.date = new Date();
  room.time.progress = videoProgress;
}

const getVideoProgress = (roomId) => {
  const room = rooms.get(roomId);
  if (!room.time) return null;

  const additionalProgress =
    room.state === RoomStates.PLAYING && ((new Date()) - room.time.date) / 1000;
  return room.time.progress + additionalProgress;
}

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server);

io.on('connection', socket => {
  const roomId = socket.handshake.query['room'] || socket.id;
  let room;
  if (rooms.has(roomId)) {
    room = rooms.get(roomId);
    if room.participants.has()
  } else {
    room = setupRoom(roomId);
  }
  //const room = rooms.get(roomId);
  let videoProgress = parseInt(socket.handshake.query['videoProgress']);

  console.log('Received connection try', { roomId, videoProgress });

  socket.on('disconnect', () => {
    console.log(`Client from room ${roomId} disconnected`);
    removeUserFromRoom(roodId, )
  });

  socket.join(roomId, (nick) => {
    if (getVideoProgress(roomId) === null) {
      recalcRoomTime(roomId, videoProgress);
    }

    const userCount = getUserCount(roomId);
    videoProgress = getVideoProgress(roomId);
    setRoomState(roomId, RoomStates.PAUSED);
    const roomState = getRoomState(roomId);

    socket.emit('join', roomId, roomState, videoProgress, userCount);
    socket.to(roomId).emit('update', socket.id, roomState, videoProgress, userCount);
    // socket.to(roomId).emit('join');
  });

  socket.on('update', (videoState, videoProgress) => {
    console.log('Received Update from ', socket.id, { videoState, videoProgress });
    const userCount = getUserCount(roomId);
    setRoomState(roomId, videoState);
    recalcRoomTime(roomId, videoProgress);

    const roomState = getRoomState(roomId);
    videoProgress = getVideoProgress(roomId);
    socket.to(roomId).emit('update', socket.id, roomState, videoProgress, userCount);
  });

  socket.on('chat', (nick, message) => {
    console.log('Received Chat from ', socket.id);
    io.in(roomId).emit('chat', socket.id, nick, message);
  });
});
