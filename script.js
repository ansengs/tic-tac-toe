const state = {
  roomId: null,
  players: ['Player X', 'Player O'],
  current: 'x',
  board: Array(9).fill(0),
  spacesLeft: 9,
  inSession: false,
  restriction: null,
  mode: 'start'
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const mediaQuery = window.matchMedia('(max-width: 700px)');
const viewMap = {
  start: { selector: '.start-menu.container', className: 'show-grid' },
  side: { selector: '.side-menu.container', className: 'show-grid' },
  join: { selector: '.join-room.container', className: 'show-grid' },
  restriction: { selector: '.restriction.container', className: 'show-grid' },
  newGame: { selector: '.new-game.container', className: 'show-flex' },
  menu: { selector: '.menu-button', className: 'show-flex' },
  room: { selector: '.room-id', className: 'show-inline' },
  result: { selector: '.result', className: 'show-inline' },
  status: { selector: '.player-status', className: 'show-inline' }
};

function makeid(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function hideAllViews() {
  Object.values(viewMap).forEach(({ selector, className }) => {
    $$(selector).forEach((el) => el.classList.remove(className));
  });
  $('.side-menu.container')?.classList.remove('visible');
}

function showViews(keys) {
  hideAllViews();
  keys.forEach((key) => {
    const view = viewMap[key];
    if (!view) return;
    $$(view.selector).forEach((el) => el.classList.add(view.className));
  });
  animateBoard();
}

function animateBoard() {
  const joining = $('.join-room.container').classList.contains('show-grid');
  const choosing = $('.restriction.container').classList.contains('show-grid');
  const sideOpenOnMobile = $('.side-menu.container').classList.contains('visible') && mediaQuery.matches;
  $('#tic-tac-toe-board').classList.toggle('board-center', !joining && !choosing && !sideOpenOnMobile);
}

function setStatus(text) { $('.player-status').textContent = text; }
function setRoomId(id) { state.roomId = id; $('.room-id').textContent = `room id: ${id}`; }
function clearInvalidRoomId() { const input = $('#input-room-id'); input.classList.remove('invalid'); input.placeholder = 'enter room id'; }
function showInvalidRoomId() { const input = $('#input-room-id'); input.value = ''; input.placeholder = 'invalid room id'; input.classList.add('invalid'); }

function resetBoard() {
  state.current = 'x';
  state.board = Array(9).fill(0);
  state.spacesLeft = 9;
  state.inSession = true;
  updateBoard();
}

function startGame() {
  resetBoard();
  setStatus("X's Turn");
  showViews(['menu', 'room', 'status']);
}

function host(restriction) {
  state.restriction = restriction;
  setRoomId(makeid(5));
  state.inSession = false;
  resetBoard();
  state.inSession = false;
  setStatus('Waiting for Player to Join');
  showViews(['room', 'status', 'menu']);
}

function randomMatch() {
  setRoomId(makeid(5));
  state.restriction = 'public';
  startGame();
}

function attemptJoinById(value) {
  const roomId = (value || '').trim();
  if (!/^[A-Za-z0-9]{5}$/.test(roomId)) return showInvalidRoomId();
  setRoomId(roomId);
  state.restriction = 'private';
  startGame();
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
    const previewPiece = state.current === 'x' ? 'x' : 'o';
    box.style.backgroundImage = value === 1 ? "url('img/x.svg')" : value === -1 ? "url('img/o.svg')" : state.inSession ? `url('img/${previewPiece}.svg')` : '';
    if (value !== 0) box.classList.add('filled');
    if (value === 0 && state.inSession) box.classList.add('preview');
    box.disabled = !state.inSession || value !== 0;
    box.setAttribute('aria-label', value === 1 ? 'X square' : value === -1 ? 'O square' : 'Empty square');
  });
}

function end(result) {
  state.inSession = false;
  $('.result').textContent = result === 'cat' ? 'CAT' : `${result.toUpperCase()} WON`;
  showViews(['newGame', 'result', 'room', 'menu']);
  updateBoard();
}

function leave() {
  state.roomId = null;
  state.restriction = null;
  state.current = 'x';
  state.board = Array(9).fill(0);
  state.spacesLeft = 9;
  state.inSession = false;
  $('.room-id').textContent = '';
  $('.result').textContent = '';
  $('#input-room-id').value = '';
  clearInvalidRoomId();
  updateBoard();
  showViews(['start']);
}

window.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;

  if (target.classList.contains('host')) showViews(['restriction', 'menu']);
  else if (target.classList.contains('join')) showViews(['join', 'menu']);
  else if (target.classList.contains('random-match')) randomMatch();
  else if (target.classList.contains('leave')) leave();
  else if (target.classList.contains('menu-button')) {
    const side = $('.side-menu.container');
    if (side.classList.contains('visible')) side.classList.remove('visible');
    else {
      side.classList.add('show-grid', 'visible');
    }
    animateBoard();
  }
  else if (target.classList.contains('public')) host('public');
  else if (target.classList.contains('private')) host('private');
  else if (target.id === 'yes') startGame();
  else if (target.id === 'no') leave();
  else if (target.classList.contains('box') && state.inSession) {
    const index = Number(target.dataset.index);
    if (state.board[index] !== 0) return;
    state.board[index] = state.current === 'x' ? 1 : -1;
    state.spacesLeft -= 1;
    const result = resultCheck();
    if (result) return end(result);
    state.current = state.current === 'x' ? 'o' : 'x';
    setStatus(`${state.current.toUpperCase()}'s Turn`);
    updateBoard();
  }
});

$('#input-room-id').addEventListener('keyup', (event) => {
  if (event.key === 'Enter') attemptJoinById(event.target.value);
  else clearInvalidRoomId();
});

window.addEventListener('resize', animateBoard);
updateBoard();
showViews(['start']);
