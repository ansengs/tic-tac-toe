const state = {
  roomId: null,
  players: ['Player X', 'Player O'],
  current: 'x',
  board: Array(9).fill(0),
  spacesLeft: 9,
  inSession: false,
  restriction: null
};
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const mediaQuery = window.matchMedia('(max-width: 700px)');
const views = ['.start-menu.container', '.side-menu.container', '.join-room.container', '.restriction.container', '.new-game.container', '.room-id', '.result', '.player-status', '.menu-button'];

function makeid(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
function show(selectors) {
  views.forEach((selector) => $$(selector).forEach((el) => el.classList.remove('show')));
  selectors.split(',').map((s) => s.trim()).filter(Boolean).forEach((selector) => $$(selector).forEach((el) => el.classList.add('show')));
  $('.side-menu.container').classList.remove('visible');
  animateBoard();
}
function animateBoard() {
  const inPlay = !$('.join-room.container').classList.contains('show') && !$('.restriction.container').classList.contains('show');
  $('#tic-tac-toe-board').classList.toggle('board-center', inPlay && !($('.side-menu.container').classList.contains('visible') && mediaQuery.matches));
}
function setStatus(text) { $('.player-status').innerHTML = text; }
function setRoomId(id) { state.roomId = id; $('.room-id').textContent = `room id: ${id}`; }
function clearInvalidRoomId() { const input = $('#input-room-id'); input.classList.remove('invalid'); input.placeholder = 'enter room id'; }
function showInvalidRoomId() { const input = $('#input-room-id'); input.value = ''; input.placeholder = 'invalid room id'; input.classList.add('invalid'); }

function startGame() {
  state.current = 'x'; state.board = Array(9).fill(0); state.spacesLeft = 9; state.inSession = true;
  setStatus('Your Turn'); show('.menu-button,.room-id,.player-status'); updateBoard();
}
function host(restriction) {
  state.restriction = restriction; setRoomId(makeid(5)); state.inSession = false;
  setStatus('Waiting for Player to Join'); show('.room-id,.player-status,.menu-button'); updateBoard();
}
function randomMatch() { host('public'); setTimeout(startGame, 500); }
function attemptJoinById(value) {
  const roomId = (value || '').trim();
  if (!/^[A-Za-z0-9]{5}$/.test(roomId)) return showInvalidRoomId();
  setRoomId(roomId); state.restriction = 'private'; startGame();
}
function resultCheck() {
  const b = state.board;
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const line of lines) {
    const total = line.reduce((sum, i) => sum + b[i], 0);
    if (total === 3) return 'x';
    if (total === -3) return 'o';
  }
  return state.spacesLeft === 0 ? 'cat' : undefined;
}
function updateBoard() {
  $$('.box').forEach((box, index) => {
    box.classList.remove('filled', 'preview');
    const value = state.board[index];
    box.style.backgroundImage = value === 1 ? "url('img/x.svg')" : value === -1 ? "url('img/o.svg')" : "";
    if (value !== 0) box.classList.add('filled');
    box.disabled = !state.inSession || value !== 0;
    box.setAttribute('aria-label', value === 1 ? 'X square' : value === -1 ? 'O square' : 'Empty square');
  });
}
function end(result) {
  state.inSession = false;
  $('.result').textContent = result === 'cat' ? 'CAT' : result ? `${result.toUpperCase()} WON` : 'WON';
  show('.new-game,.result,.room-id,.menu-button');
  updateBoard();
}
function leave() { location.reload(); }

window.addEventListener('click', (event) => {
  const target = event.target.closest('button'); if (!target) return;
  if (target.matches('.host')) show('.restriction,.menu-button');
  else if (target.matches('.join')) show('.join-room,.menu-button');
  else if (target.matches('.random-match')) randomMatch();
  else if (target.matches('.leave')) leave();
  else if (target.matches('.menu-button')) { $('.side-menu.container').classList.toggle('visible'); animateBoard(); }
  else if (target.matches('.public')) host('public');
  else if (target.matches('.private')) host('private');
  else if (target.id === 'yes') startGame();
  else if (target.id === 'no') leave();
  else if (target.matches('.box') && state.inSession) {
    const index = Number(target.dataset.index);
    if (state.board[index] !== 0) return;
    state.board[index] = state.current === 'x' ? 1 : -1;
    state.spacesLeft -= 1;
    const result = resultCheck();
    updateBoard();
    if (result) return end(result);
    state.current = state.current === 'x' ? 'o' : 'x';
    setStatus(`${state.current.toUpperCase()}'s Turn`);
  }
});
$('#input-room-id').addEventListener('keyup', (event) => {
  if (event.key === 'Enter') attemptJoinById(event.target.value); else clearInvalidRoomId();
});
window.addEventListener('resize', animateBoard);
updateBoard();
