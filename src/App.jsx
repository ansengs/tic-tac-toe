import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const initialGame = {
  players: [],
  playerTurn: { mark: 'x', socketId: null },
  board: Array(9).fill(0),
  spacesLeft: 9,
  inSession: false,
  restriction: null,
  newGameVotes: [],
  result: null,
};

function makeRoomId(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function resultLabel(result, game, socketId) {
  if (!result) return '';
  if (result === 'cat') return 'CAT';
  if (result === 'opponent-disconnected') return 'Opponent disconnected';
  if (result === 'opponent-left') return 'Opponent left';

  const playerIndex = game.players.indexOf(socketId);
  if (playerIndex === -1) return `${result.toUpperCase()} WON`;
  const playerMark = playerIndex === 0 ? 'x' : 'o';
  return result === playerMark ? 'WON' : 'LOST';
}

export default function App() {
  const socketRef = useRef(null);
  const [socketId, setSocketId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [game, setGame] = useState(initialGame);
  const [screen, setScreen] = useState('start');
  const [sideOpen, setSideOpen] = useState(false);
  const [joinValue, setJoinValue] = useState('');
  const [joinError, setJoinError] = useState(false);
  const [statusOverride, setStatusOverride] = useState('');

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setSocketId(socket.id));
    socket.on('host-result', ({ ok, roomId: nextRoomId }) => {
      if (!ok) return;
      setRoomId(nextRoomId);
      setScreen('playing');
      setStatusOverride('Waiting for Player to Join');
    });
    socket.on('join-result', ({ ok, roomId: nextRoomId }) => {
      if (!ok) {
        setJoinError(true);
        setJoinValue('');
        return;
      }
      setRoomId(nextRoomId);
      setScreen('playing');
      setStatusOverride('');
    });
    socket.on('random-room-found', ({ roomId: foundRoomId }) => {
      if (foundRoomId) {
        socket.emit('join-room', { roomId: foundRoomId });
      } else {
        hostRoom('public');
      }
    });
    socket.on('game-state', ({ roomId: nextRoomId, game: nextGame }) => {
      setRoomId(nextRoomId);
      setGame(nextGame);
      setScreen('playing');
      setStatusOverride('');
    });
    socket.on('game-ended', ({ result, game: nextGame }) => {
      setGame(nextGame);
      setScreen('result');
      setStatusOverride(resultLabel(result, nextGame, socket.id));
    });
    socket.on('opponent-left', ({ disconnected }) => {
      setScreen('result');
      setStatusOverride(disconnected ? 'Opponent disconnected' : 'Opponent left');
    });

    return () => socket.disconnect();
  }, []);

  const isPlayer = game.players.includes(socketId);
  const myMark = game.players[0] === socketId ? 'x' : game.players[1] === socketId ? 'o' : null;
  const isMyTurn = game.inSession && game.playerTurn.socketId === socketId;
  const showBoardLow = screen === 'start' || screen === 'join' || screen === 'restriction';

  const statusText = useMemo(() => {
    if (statusOverride) return statusOverride;
    if (screen === 'result') return resultLabel(game.result, game, socketId);
    if (game.newGameVotes?.length === 1 && !game.inSession) {
      return game.newGameVotes.includes(socketId) ? 'Waiting for Player to Choose' : 'Player has joined\nWaiting on you to choose';
    }
    if (!game.inSession) return game.players.length === 1 ? 'Waiting for Player to Join' : 'Waiting for Host to Start';
    if (!isPlayer) return `Spectating\n${game.playerTurn.mark.toUpperCase()}'s Turn`;
    return isMyTurn ? 'Your Turn' : `${game.playerTurn.mark.toUpperCase()}'s Turn`;
  }, [game, isMyTurn, isPlayer, screen, socketId, statusOverride]);

  function hostRoom(restriction) {
    const nextRoomId = makeRoomId();
    const hostId = socketRef.current?.id || socketId;
    setRoomId(nextRoomId);
    setGame({ ...initialGame, restriction, players: [hostId] });
    socketRef.current?.emit('host-room', { roomId: nextRoomId, restriction });
  }

  function randomMatch() {
    setSideOpen(false);
    socketRef.current?.emit('random-match');
  }

  function joinRoom(event) {
    event?.preventDefault();
    const nextRoomId = joinValue.trim();
    if (!/^[A-Za-z0-9]{5}$/.test(nextRoomId)) {
      setJoinError(true);
      setJoinValue('');
      return;
    }
    setJoinError(false);
    socketRef.current?.emit('join-room', { roomId: nextRoomId });
  }

  function leaveRoom() {
    if (roomId) socketRef.current?.emit('leave-room', { roomId });
    setRoomId('');
    setGame(initialGame);
    setScreen('start');
    setSideOpen(false);
    setStatusOverride('');
  }

  function move(index) {
    if (!isMyTurn || game.board[index] !== 0) return;
    socketRef.current?.emit('make-move', { roomId, index });
  }

  function voteNewGame() {
    socketRef.current?.emit('new-game-vote', { roomId });
    setScreen('playing');
    setStatusOverride(game.players.length === 2 ? 'Waiting for Player to Choose' : 'Waiting for Player to Join');
  }

  function marker(value) {
    if (value === 1) return 'x';
    if (value === -1) return 'o';
    return game.playerTurn.mark;
  }

  function canPreview(index) {
    return isMyTurn && game.board[index] === 0 && game.inSession;
  }

  return (
    <main className="main-bg">
      <button
        className={`menu-button ${screen !== 'start' ? 'visible' : ''}`}
        aria-label="Toggle menu"
        onClick={() => setSideOpen((open) => !open)}
      >
        <span />
      </button>

      <nav className={`side-menu ${sideOpen ? 'visible' : ''}`} aria-label="Side menu">
        <button onClick={randomMatch}>Random Match</button>
        <button onClick={() => { setScreen('join'); setSideOpen(false); }}>Join Player</button>
        <button onClick={() => { setScreen('restriction'); setSideOpen(false); }}>Host</button>
        <button onClick={leaveRoom}>Leave</button>
      </nav>

      {roomId && <div className="room-id">room id: {roomId}</div>}

      <section className={`board-wrap ${showBoardLow ? 'board-low' : ''}`} aria-label="Tic tac toe board">
        <div className="board-grid">
          {game.board.map((value, index) => (
            <button
              key={index}
              className={`box ${value !== 0 ? 'selected' : ''} ${canPreview(index) ? 'previewable' : ''}`}
              aria-label={`Cell ${index + 1}`}
              onClick={() => move(index)}
              disabled={!canPreview(index)}
            >
              {(value !== 0 || canPreview(index)) && <img src={`/img/${marker(value)}.svg`} alt="" />}
            </button>
          ))}
        </div>
      </section>

      {screen === 'start' && (
        <section className="panel start-menu" aria-label="Start menu">
          <button onClick={randomMatch}>Random Match</button>
          <button onClick={() => setScreen('join')}>Join Player</button>
          <button onClick={() => setScreen('restriction')}>Host</button>
        </section>
      )}

      {screen === 'join' && (
        <form className="panel join-room" onSubmit={joinRoom}>
          <h1>Join Room</h1>
          <input
            value={joinValue}
            onChange={(event) => { setJoinValue(event.target.value); setJoinError(false); }}
            placeholder={joinError ? 'invalid room id' : 'enter room id'}
            className={joinError ? 'invalid' : ''}
            maxLength={5}
            autoFocus
          />
          <button type="submit">Join</button>
        </form>
      )}

      {screen === 'restriction' && (
        <section className="panel restriction">
          <h1>Room Restriction</h1>
          <div className="choice-row">
            <button onClick={() => hostRoom('public')}>Public</button>
            <button onClick={() => hostRoom('private')}>Private</button>
          </div>
        </section>
      )}

      {(screen === 'playing' || screen === 'result') && (
        <p className={`player-status ${screen === 'result' ? 'result-text' : ''}`}>{statusText}</p>
      )}

      {screen === 'result' && isPlayer && (
        <section className="new-game-card">
          <h2>NEW GAME</h2>
          <div className="choice-row compact">
            <button onClick={voteNewGame}>Yes</button>
            <button onClick={leaveRoom}>No</button>
          </div>
        </section>
      )}

      {myMark && <div className="mark-pill">You are {myMark.toUpperCase()}</div>}
    </main>
  );
}
