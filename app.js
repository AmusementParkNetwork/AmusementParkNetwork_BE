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

const server = app.listen(9000, () => {
  console.log("server opened");
});

const io = socketIo(server, {
  cors: {
    origin: "http://flrou.site",
    // origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

const rooms = {
  1: [], // 운영팀방 유저 배열
  2: [], // 영역1 유저 배열
  3: [], // 영역2 유저 배열
};

let crowdedDegree = {
  2: 0,
  3: 0,
}; // 각 방마다의 혼잡도 저장

let waitingNumbers = {
  2: 0,
  3: 0,
}; // 방별 대기인원 수
const waitingTimePerPerson = 5; // 대기시간 1명당 5분 증가

io.on("connection", (socket) => {
  // 유저 입장
  socket.on("join", (userName, roomNumber) => {
    console.log("join", "name:", userName, "room:", roomNumber);
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

  // 유저 퇴장
  socket.on("leave", (userName, roomNumber) => {
    console.log("leave", "name:", userName, "room:", roomNumber);

    if (rooms[roomNumber]) {
      const leavingUser = rooms[roomNumber].find(
        (user) => user.id === socket.id
      );
      console.log("leaving user:", leavingUser);

      rooms[roomNumber] = rooms[roomNumber].filter(
        (user) => user.id !== socket.id
      );
      console.log("remaining users:", rooms[roomNumber]);

      io.to(roomNumber).emit("userLeft", {
        username: leavingUser ? leavingUser.username : null,
        users: rooms[roomNumber],
      });
    }
  });

  // 유저 연결 해제
  socket.on("disconnect", () => {
    for (let roomNumber in rooms) {
      // 퇴장하는 유저 찾기
      const leavingUser = rooms[roomNumber].find(
        (user) => user.id === socket.id
      );

      rooms[roomNumber] = rooms[roomNumber].filter(
        (user) => user.id !== socket.id
      );

      io.to(roomNumber).emit("userLeft", {
        username: leavingUser ? leavingUser.username : null,
        users: rooms[roomNumber],
      });
    }
  });

  // 채팅
  socket.on("chat", (message, roomNumber) => {
    if (roomNumber === 1) {
      // 1번방은 전체 방에 메시지 전송
      io.emit("chat", message);
    } else {
      // 2, 3번방은 해당 방에만 메시지 전송
      io.to(roomNumber).emit("chat", message);
    }
  });

  // 혼잡도 증가
  socket.on("crowded", (roomNumber) => {
    crowdedDegree[roomNumber]++;

    const crowdedData = {
      degree: crowdedDegree[roomNumber],
      percentage: Math.min(crowdedDegree[roomNumber] * 10, 100),
    };
    console.log(roomNumber, crowdedData);

    io.to(roomNumber).emit("crowdedNum", crowdedData);
    io.to(1).emit("crowdedNum", crowdedData);
  });

  // 대기인원 증가
  socket.on("waiting", (roomNumber) => {
    if (waitingNumbers[Number(roomNumber)] !== undefined) {
      // 방별 대기인원 수 증가
      waitingNumbers[Number(roomNumber)]++;

      const waitingData = {
        number: waitingNumbers[roomNumber],
        time: waitingNumbers[roomNumber] * waitingTimePerPerson,
      };
      console.log(roomNumber, waitingData);

      io.to(roomNumber).emit("waitingNum", waitingData);
      io.to(1).emit("waitingNum", waitingData);
    } else {
      console.error(`잘못된 구역 번호: ${roomNumber}`);
    }
  });
});
