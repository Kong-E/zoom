// 서버와 연결
const socket = io();

const welcome = document.getElementById("welcome");
const room = document.getElementById("room");
const nameForm = welcome.querySelector("form#name");
const enterForm = welcome.querySelector("form#enter");

room.hidden = true;

let roomName;

//새로운 li태그 생성
function addMessage(message) {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}

//메세지 전송 버튼을 누르면
function handleMessageSubmit(event) {
  event.preventDefault();
  const input = room.querySelector("form#msg input");
  const value = input.value;
  //new_message 전송
  socket.emit("new_message", input.value, roomName, () => {
    addMessage(`You: ${value}`);
  });
  input.value = "";
}

//방 보여주는 호출 함수
function showRoom(count) {
  welcome.hidden = true;
  room.hidden = false;
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${count}명)`;
  const msgForm = room.querySelector("form#msg");
  msgForm.addEventListener("submit", handleMessageSubmit);
}

//닉네임 저장버튼을 누르면
function handleNameSubmit(event) {
  event.preventDefault();
  const input = nameForm.querySelector("input");
  socket.emit("nickname", input.value);
}

function handleRoomSubmit(event) {
  event.preventDefault();
  const input = enterForm.querySelector("input");
  socket.emit("enter_room", input.value, showRoom);
  roomName = input.value;
  input.value = "";
}

//닉네임 저장
nameForm.addEventListener("submit", handleNameSubmit);

//방에 들어가기
enterForm.addEventListener("submit", handleRoomSubmit);

//welcome을 받으면
socket.on("welcome", addMessage);

//bye를 받으면
socket.on("bye", addMessage);

//상대에게 new_message를 받으면
socket.on("new_message", addMessage);

socket.on("room_change", (rooms) => {
  const ul = welcome.querySelector("ul");
  ul.innerHTML = "";
  if (rooms.length === 0) {
    return;
  }
  ul.innerHTML = "";
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.innerText = room;
    ul.append(li);
  });
});
