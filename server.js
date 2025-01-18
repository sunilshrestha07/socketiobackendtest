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
  }
  if (driverId) {
    connectedDrives[driverId] = socket.id; // Map driver ID to socket ID
  }

  // console.log('User Connected', socket.id);
  console.log('usrs', connectedUsers);
  console.log('drives', connectedDrives);

  //handel finddriveer event
  socket.on('findDriver', (formdata) => {
    // console.log(`user with id ${data.formdata.name} is searching for drivers`);
    io.emit('broadCastDrives', {formdata});
  });

  //handel driver request event
  socket.on('requestRideToUser', ({driverData, userId}) => {
    const recipientSocketId = connectedUsers[userId];

    if(recipientSocketId){
      io.to(recipientSocketId).emit('driverResponse', {driverData});
    }else{
      console.log('user not found');
    }

  });

  //handel ride accept triggered by user
  socket.on('AcceptRequest',({formdata,driverId})=>{
    const selectedDriverId = connectedDrives[driverId];
    if(selectedDriverId){
      io.to(selectedDriverId).emit('rideAccepted', {formdata});
      socket.broadcast.emit('terminateFindDriverRequest',{formdata});
    }
    Object.entries(connectedDrives).forEach(([driverId]) => {
      if(driverId!==selectedDriverId){
        io.to(driverId).emit('terminateFindDriverRequest',{formdata});
      }
    })
  })

  //handel cancel ride triggered by user
  socket.on('CancelRide',({driverId,formdata})=>{
    console.log( `driver id ${driverId}'ride has been calcled by user with id ${formdata.userId} has canceled the ride`);
    const selectedDriverId = connectedDrives[driverId];
    if(selectedDriverId){
      io.to(selectedDriverId).emit('rideHasBeenCancled', {formdata});
    }
  })

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

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
