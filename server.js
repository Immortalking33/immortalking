'use strict';

const express = require('express');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const RoomStates = {
  PLAYING: 'playing',
  PAUSED: 'paused',
};

const getUserCount = (roomId) => {
  return io.sockets.adapter.rooms[roomId].length;
}

const setRoomState = (roomId, state) => {
  const room = io.sockets.adapter.rooms[roomId];
  room.state = state;
  console.log("Set room state:", room.state);
}

const getRoomState = (roomId) => {
  const room = io.sockets.adapter.rooms[roomId];
  console.log("Get room state:", room.state);
  return room.state;
}

const recalcRoomTime = (roomId, videoProgress) => {
  const room = io.sockets.adapter.rooms[roomId];
  if (!room.time) room.time = {};
  room.time.date = new Date();
  room.time.progress = videoProgress;
  console.log("Recalced room time:", room.time.date, room.time.progress);
}

const getVideoProgress = (roomId) => {
  const room = io.sockets.adapter.rooms[roomId];
  console.log("Get room progress:", room.time);
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
  // let videoProgress;

  console.log('Received connection try', { roomId });

  socket.on('disconnect', () => console.log(`Client from room ${roomId} disconnected`));

  socket.join(roomId, () => {
    // If no progress is registered, we just start at zero and paused
    let isFirst = false;
    if (getVideoProgress(roomId) === null) {
      console.log("Progress was null");
      recalcRoomTime(roomId, 0);
      setRoomState(roomId, RoomStates.PAUSED);
      isFirst = true;
    }

    socket.emit('join', roomId, isFirst);
  });

  socket.on('update', (videoState, videoProgress) => {
    console.log('Received Update from ', socket.id, { videoState, videoProgress });
    const userCount = getUserCount(roomId);
    setRoomState(roomId, videoState);
    recalcRoomTime(roomId, videoProgress);

    const roomState = getRoomState(roomId);
    const updatedVideoProgress = getVideoProgress(roomId);
    socket.to(roomId).emit('update', socket.id, roomState, updatedVideoProgress, userCount);
  });

  socket.on('chat', (nick, message) => {
    console.log('Received Chat from ', socket.id);
    io.in(roomId).emit('chat', socket.id, nick, message);
  });

  // Emit current progress and state to single watcher on resync request
  socket.on('resync', () => {
    const userCount = getUserCount(roomId);
    const roomState = getRoomState(roomId);
    const videoProgress = getVideoProgress(roomId);

    socket.emit('update', socket.id, roomState, videoProgress, userCount);
  });
});
