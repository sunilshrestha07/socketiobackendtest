import express from 'express';
import http from 'http';
import {Server} from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const connectedUsers = {};
const connectedDrives = {};

//handel socket connection
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.token; // User token
  const driverId = socket.handshake.auth.drivertoken;

  if (userId) {
    connectedUsers[userId] = socket.id; // Map user ID to socket ID
    console.log(`User ${userId} connected with socket ID: ${socket.id}`);
  }

  // Check if the connection is from a driver
  if (driverId) {
    connectedDrives[driverId] = socket.id; // Map driver ID to socket ID
    console.log(`Driver ${driverId} connected with socket ID: ${socket.id}`);
  }
  // console.log('User Connected', socket.id);
  console.log('conntected usrs', connectedUsers);
  console.log('conntected drives', connectedDrives);

  //handel finddriveer event
  socket.on('findDriver', ({userId}) => {
    console.log(`userwith id ${userId} is searcnig for drives`);
    io.emit('broadCastDrives', {userId});
  });

  //handel driver request event
  socket.on('driverRequest', ({driverId, user}) => {
    console.log(`driver with id ${driverId} is requesting user with id ${user}`);
    // io.emit('driverIsRequesting', {driverId});
    const recipientSocketId = connectedUsers[user];

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('driverIsRequesting', {
        driverId: driverId,
      });
    } else {
      console.log('user not found');
    }
  });

  //handel disconnect
  socket.on('disconnect', () => {
    // Remove the socket ID from both collections
    if (userId) {
      delete connectedUsers[userId];
      console.log(`User ${userId} disconnected.`);
    }
    if (driverId) {
      delete connectedDrives[driverId];
      console.log(`Driver ${driverId} disconnected.`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
