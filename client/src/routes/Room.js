import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import ArrowForwardIcon from "@material-ui/icons/ArrowForward";

const Container = styled.div`
  display: flex;
  height: 100vh;
  width: 100%;
  margin: auto;
  flex-wrap: wrap;
  flex-direction: column;
`;

const StyledVideo = styled.audio`
  height: 40%;
  width: 50%;
`;

const Video = (props) => {
  const ref = useRef();

  useEffect(() => {
    props.peer.on("stream", (stream) => {
      ref.current.srcObject = stream;
    });
  }, []);

  return (
    <div
      style={{
        display: "flex",
        width: "25%",
        height: "100%",
        background: "#444444",
        color: "white",
        justifyContent: "center",
        alignItems: "center",
        borderRight: "2px solid white",
      }}
    >
      <StyledVideo playsInline autoPlay ref={ref}></StyledVideo>
      <h1>UserName</h1>
    </div>
  );
};

const Room = (props) => {
  const [peers, setPeers] = useState([]);
  const socketRef = useRef();
  const userVideo = useRef();
  const peersRef = useRef([]);
  const roomID = props.match.params.roomID;

  useEffect(() => {
    socketRef.current = io.connect("/");
    navigator.mediaDevices
      .getUserMedia({ video: false, audio: true })
      .then((stream) => {
        userVideo.current.srcObject = stream;
        socketRef.current.emit("join room", roomID);
        socketRef.current.on("all users", (users) => {
          const peers = [];
          users.forEach((userID) => {
            const peer = createPeer(userID, socketRef.current.id, stream);
            peersRef.current.push({
              peerID: userID,
              peer,
            });
            peers.push(peer);
          });
          setPeers(peers);
        });

        socketRef.current.on("user joined", (payload) => {
          const peer = addPeer(payload.signal, payload.callerID, stream);
          peersRef.current.push({
            peerID: payload.callerID,
            peer,
          });

          setPeers((users) => [...users, peer]);
        });

        socketRef.current.on("receiving returned signal", (payload) => {
          const item = peersRef.current.find((p) => p.peerID === payload.id);
          item.peer.signal(payload.signal);
        });
      });
  }, []);

  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socketRef.current.emit("sending signal", {
        userToSignal,
        callerID,
        signal,
      });
    });

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socketRef.current.emit("returning signal", { signal, callerID });
    });

    peer.signal(incomingSignal);

    return peer;
  }

  return (
    <Container>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: "100vw",
          border: "0",
          margin: "0",
          padding: "0",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column-reverse",
            height: "80%",
            borderBottom: "3px solid white"
          }}
        >
          <div
            style={{
              display: "flex",
              height: "60px",
              width: "100%",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <ArrowBackIcon fontSize="large" />
            <h4>1/25</h4>
            <ArrowForwardIcon fontSize="large" />
          </div>
          <div
            style={{
              height: "auto",
              display: "flex",
              flexGrow: "5",
              backgroundImage:
                "url(https://images.unsplash.com/photo-1582456780653-aabf23f711b9?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=750&q=80)",
              width: "100%",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
            }}
          ></div>
        </div>
        <div style={{ display: "flex", overflow: "hidden", height: "20%",background:"#DDDDDD" }}>
          <div
            style={{
              display: "flex",
              width: "25%",
              height: "100%",
              background: "#444444",
              color: "white",
              justifyContent: "center",
              alignItems: "center",
              borderRight:'2px solid white'
            }}
          >
            <StyledVideo
              muted
              playsInline
              autoPlay
              ref={userVideo}
            ></StyledVideo>
            <h1>You</h1>
          </div>
          {peers.map((peer, index) => {
            return <Video key={index} peer={peer} />;
          })}
        </div>
      </div>

      <button
        style={{
          position: "fixed",
          top: "20px",
          right: "30px",
          padding: "8px",
          borderRadius: "10px",
          background: "red",
        }}
      >
        <a
          style={{ color: "white", fontWeight: "600", textDecoration: "none" }}
          href="/"
        >
          Leave Meeting
        </a>
      </button>
    </Container>
  );
};

export default Room;
