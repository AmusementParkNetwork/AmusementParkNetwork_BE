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

let crowdedDegree = {
  2: 0,
  3: 0
}; // 각 방마다의 혼잡도 저장

let waitingNumbers = {
  2: 0,
  3: 0,
};  // 방별 대기인원 수
const waitingTimePerPerson = 2;  // 대기시간 1명당 5분 증가

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

  // 혼잡도 조정
  socket.on("crowded", (userName, roomNumber) => {
    // 혼잡도 증가
    crowdedDegree[Number(roomNumber)]++;
    message = `${roomNumber} 구역 현재 혼잡도 ${crowdedDegree[roomNumber]}입니다.`
    // 각 구역 방과 1번방에 메세지 전송
    io.to(roomNumber).emit("chat", message);
    io.to("1").emit("chat", message);

  // 대기인원 관리
  socket.on("waiting", (userName, roomNumber) => {
    if (waitingNumbers[Number(roomNumber)] !== undefined) {
      // 방별 대기인원 수 증가
      waitingNumbers[Number(roomNumber)]++;
      // 대기시간 1명당 5분 증가
      let estimatedWaitTime = waitingNumbers[Number(roomNumber)] * waitingTimePerPerson;
      let message = `${roomNumber}번 구역 현재 대기 인원 ${waitingNumbers[Number(roomNumber)]}명\n
                      예상 대기시간: ${estimatedWaitTime}분`;
      // 메시지 전송
      io.to("1").emit("chat", message);
      io.to(roomNumber).emit("chat", message);
    } else {
      console.error(`잘못된 구역 번호: ${roomNumber}`);
    }
  });
});
