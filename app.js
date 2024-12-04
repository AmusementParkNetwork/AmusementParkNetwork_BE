const express = require("express");
const app = express();
const socketIo = require("socket.io");
// const cors = require("cors");

// app.use(
//   cors({
//     origin: "0.0.0.0", // TODO: 클라이언트 주소로 변경
//     credentials: true,
//   })
// );

const server = app.listen(8080, () => {
  console.log("server opened");
});

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // TODO: 클라이언트 주소로 변경
    credentials: true,
  },
});

const rooms = {
  1: [], // 운영팀방 유저 배열
  2: [], // 영역1 유저 배열
  3: [], // 영역2 유저 배열
};

let socketID = [];
let userID = [];

io.on("connection", (socket) => {
  // 유저 입장
  socket.on("join", (userName, roomNumber) => {
    socket.join(roomNumber);

    rooms[roomNumber].push({
      id: socket.id,
      username: userName,
    });

    // 입장 했는지 해당 방에 알림
    io.to(roomNumber).emit("userJoined", {
      username: userName,
      users: rooms[roomNumber],
    });
  });

  // 유저 연결 해제
  socket.on("disconnect", () => {
    for (let roomNumber in rooms) {
      rooms[roomNumber] = rooms[roomNumber].filter(
        (user) => user.id !== socket.id
      );

      // 남은 유저들에게 퇴장 알림
      io.to(roomNumber).emit("userLeft", {
        users: rooms[roomNumber],
      });
    }
  });

  // 채팅
  socket.on("chat", (message, roomNumber) => {
    if (roomNumber === "1") {
      // 1번방은 전체 방에 메시지 전송
      io.emit("chat", message);
    } else {
      // 2, 3번방은 해당 방에만 메시지 전송
      io.to(roomNumber).emit("chat", message);
    }
  });
});
