// 서버와 연결
const socket = io();

const h1 = document.querySelector("h1");
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

//현재 카메라 장치 불러오기
async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label == camera.label) {
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

//오디오, 카메라 켜기
async function getMedia(deviceId) {
  const initialConstrains = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstrains = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstrains : initialConstrains
    );
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
}

function handleMuteClick() {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (muted === false) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
}

function handleCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff === true) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
  }
}

async function handleCameraChange() {
  await getMedia(camerasSelect.value);
  if (muted) {
    myStream.getAudioTracks().forEach((track) => (track.enabled = false));
  }
  if (cameraOff === true) {
    myStream.getVideoTracks().forEach((track) => (track.enabled = false));
  }
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}

h1.addEventListener("click", () => location.reload());
muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

/// welcome form

const welcome = document.getElementById("welcome");
const call = document.getElementById("call");
const children = call.children;
const peerFace = document.querySelector("#peerFace");
const msgForm = document.getElementById("msgForm");
const msg = document.getElementById("msg");
const ul = document.querySelector("ul");

call.hidden = true;
for (let i = 0; i < children.length; i++) {
  children[i].classList.add("hidden");
}

const welcomeForm = welcome.querySelector("form");

//양쪽이 똑같이 실행하는 코드
async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  for (let i = 0; i < children.length; i++) {
    children[i].classList.remove("hidden");
  }
  await getMedia();
  makeConnection();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  await initCall();
  socket.emit("join_room", input.value);
  roomName = input.value;
  input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code

function sendMsg(event) {
  event.preventDefault();
  if (myDataChannel) myDataChannel.send(msg.value);
  const li = document.createElement("li");
  li.innerText = `나: ${msg.value}`;
  ul.appendChild(li);
  msg.value = "";
}

function receiveMsg(event) {
  const li = document.createElement("li");
  li.innerText = `상대: ${event.data}`;
  ul.appendChild(li);
}

// Peer A
socket.on("welcome", async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat");
  msgForm.addEventListener("submit", sendMsg);
  myDataChannel.addEventListener("message", receiveMsg);
  console.log("made data channel");
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("sent the offer");
  socket.emit("offer", offer, roomName);
});
// offer를 주고 받기위해서는 서버가 필요함
// Peer B
socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    msgForm.addEventListener("submit", sendMsg);
    myDataChannel.addEventListener("message", receiveMsg);
  });
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});
// Peer A
socket.on("answer", (answer) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});

// RTC Code
let remoteStream = null;

// 브라우저 사이의 peerConnection을 만들기
function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("track", handleTrack); //p2p로 오디오와 비디오를 전달해야함
  myPeerConnection.oniceconnectionstatechange = function (event) {
    if (myPeerConnection.iceConnectionState === "disconnected") {
      remoteStream.getTracks().forEach((track) => track.stop());
      peerFace.srcObject = null;
      remoteStream = null;
    }
  };
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
}

function handleTrack(data) {
  console.log("handle track");
  remoteStream = data.streams[0];
  peerFace.srcObject = remoteStream;
  if (data.streams[0] === null) {
    peerFace.srcObject = null;
  }
}

msgForm.addEventListener("submit", sendMsg);
