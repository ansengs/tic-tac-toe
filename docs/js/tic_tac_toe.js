(() => {
  const variables = {
    roomId: null,
    joined: null,
    gameData: {
      players: ['x', 'o'],
      player_turn: { x: 'x' },
      board: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
      spaces_left: 9,
      in_session: false,
      restriction: null
    }
  };

  const mediaQuery = window.matchMedia('(max-width: 700px)');
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function makeid(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i += 1) result += characters.charAt(Math.floor(Math.random() * characters.length));
    return result;
  }

  function setDisplay(selector, display) {
    $$(selector).forEach((el) => { el.style.display = display; });
  }

  function setVisibility(selector, value) {
    $$(selector).forEach((el) => { el.style.visibility = value; });
  }

  function isVisible(el) {
    return el && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
  }

  function visibility(visible, actionType) {
    const elements = '.room-id,.result,.new-game,.join-room,.player-status,.start-menu,.side-menu,.menu-button,.restriction';

    if (actionType === 'toggle') {
      if (mediaQuery.matches) {
        $$('.active').forEach((el) => {
          if (getComputedStyle(el).display !== 'none') el.style.visibility = isVisible(el) ? 'hidden' : 'visible';
        });
      }
      $$(visible).forEach((el) => {
        el.style.display = getComputedStyle(el).display === 'none' ? '' : 'none';
        el.style.visibility = getComputedStyle(el).visibility === 'hidden' ? 'visible' : 'hidden';
      });
      animateBoard();
      return;
    }

    if (actionType === 'decreased') {
      $$('.active').forEach((el) => {
        const target = $(visible);
        if (isVisible(el) && isVisible(target)) el.style.visibility = 'hidden';
      });
      return;
    }

    if (actionType === 'increased') {
      $$('.active').forEach((el) => {
        const startMenu = $('.start-menu');
        if (getComputedStyle(el).display !== 'none' && !isVisible(startMenu)) el.style.visibility = 'visible';
      });
      return;
    }

    setDisplay(elements, 'none');
    setVisibility(elements, 'hidden');
    setDisplay(visible, '');
    setVisibility(visible, 'visible');
    animateBoard();
  }

  function animateBoard() {
    const board = $('#tic-tac-toe-board');
    const joinHidden = getComputedStyle($('.join-room')).visibility === 'hidden';
    const restrictHidden = getComputedStyle($('.restriction')).visibility === 'hidden';
    const inPlay = joinHidden && restrictHidden;
    const sideMenuVisible = getComputedStyle($('.side-menu')).visibility !== 'hidden';
    const y = inPlay ? (sideMenuVisible && mediaQuery.matches ? 80 : 50) : 80;
    board.style.top = `${y}%`;
    board.style.transform = `translate(-50%, -${y}%)`;
  }

  function resetBoard() {
    variables.gameData.board = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
    variables.gameData.spaces_left = 9;
    variables.gameData.player_turn = { x: 'x' };
    variables.gameData.in_session = true;
    $('.result').textContent = '';
    updateBoard(variables.gameData);
  }

  function startGame(roomId, restriction) {
    variables.roomId = roomId || makeid(5);
    variables.gameData.restriction = restriction || 'public';
    $('.room-id').textContent = `room id: ${variables.roomId}`;
    $('.player-status').textContent = "X's Turn";
    resetBoard();
    visibility('.menu-button,.room-id,.player-status');
  }

  function host(restriction) {
    startGame(makeid(5), restriction);
  }

  function end(result) {
    if (result === undefined) {
      resetBoard();
      visibility('.start-menu');
      return;
    }
    variables.gameData.in_session = false;
    $('.result').textContent = result === 'cat' ? 'CAT' : `${result.toUpperCase()} WON`;
    visibility('.new-game,.result,.room-id,.menu-button');
  }

  function updateBoard(gameData) {
    const currentMark = Object.keys(gameData.player_turn)[0];
    const gameResult = resultCheck(gameData.board, gameData.spaces_left);

    Object.entries(gameData.board).forEach(([position, value]) => {
      const box = $(`.box${position}`);
      const selected = value !== 0;
      box.style.display = 'inherit';
      box.style.opacity = selected ? '1' : '';
      box.style.backgroundImage = value === 1
        ? "url('img/x.svg')"
        : value === -1
          ? "url('img/o.svg')"
          : `url('img/${currentMark}.svg')`;
      box.style.visibility = ((gameData.in_session || selected) && gameResult === undefined) || selected ? 'visible' : 'hidden';
    });
  }

  function resultCheck(board, spacesLeft) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const line of lines) {
      const total = Number(board[line[0]]) + Number(board[line[1]]) + Number(board[line[2]]);
      if (total === 3) return 'x';
      if (total === -3) return 'o';
    }
    return spacesLeft === 0 ? 'cat' : undefined;
  }

  function showInvalidRoomId() {
    const input = $('#input-room-id');
    input.value = '';
    input.placeholder = 'enter any 5-character room id';
    input.classList.add('invalid');
  }

  function clearInvalidRoomId() {
    const input = $('#input-room-id');
    if (input.classList.contains('invalid')) {
      input.classList.remove('invalid');
      input.placeholder = 'enter room id';
    }
  }

  function attemptJoinById(raw) {
    const roomId = (raw || '').trim();
    if (!/^[A-Za-z0-9]{5}$/.test(roomId)) {
      showInvalidRoomId();
      return;
    }
    startGame(roomId, 'private');
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth <= 700) visibility('.side-menu', 'decreased');
    else visibility('.side-menu', 'increased');
    animateBoard();
  });

  window.addEventListener('keyup', (event) => {
    if (event.target.matches('#input-room-id')) {
      if (event.key === 'Enter') attemptJoinById(event.target.value);
      else clearInvalidRoomId();
    }
  });

  window.addEventListener('click', (event) => {
    const target = event.target;
    if (target.matches('.host')) visibility('.restriction,.menu-button');

    if (target.matches('.choice')) {
      const text = target.textContent.trim();
      if (text === 'Private') host('private');
      else if (text === 'Public') host('public');
      else if (text === 'Yes') startGame(variables.roomId || makeid(5), variables.gameData.restriction || 'public');
      else if (text === 'No') end();
    }

    if (target.matches('.join')) visibility('.join-room,.menu-button');
    if (target.matches('.random-match')) startGame(makeid(5), 'public');
    if (target.matches('.leave')) end();
    if (target.matches('.menu-button')) visibility('.side-menu', 'toggle');

    for (let i = 0; i < 9; i += 1) {
      if (target.matches(`.box${i}`) && variables.gameData.in_session === true && variables.gameData.board[i] === 0) {
        const mark = Object.keys(variables.gameData.player_turn)[0];
        variables.gameData.board[i] = mark === 'x' ? 1 : -1;
        variables.gameData.spaces_left -= 1;
        const gameResult = resultCheck(variables.gameData.board, variables.gameData.spaces_left);
        if (gameResult !== undefined) {
          updateBoard(variables.gameData);
          end(gameResult);
          return;
        }
        variables.gameData.player_turn = mark === 'x' ? { o: 'o' } : { x: 'x' };
        $('.player-status').textContent = `${Object.keys(variables.gameData.player_turn)[0].toUpperCase()}'s Turn`;
        updateBoard(variables.gameData);
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    updateBoard(variables.gameData);
    visibility('.start-menu');
  });
})();
