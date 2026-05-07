var variables = {
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

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; i++) result += characters.charAt(Math.floor(Math.random() * characters.length));
  return result;
}

function visibility(visible, action_type) {
  var elements = '.room-id,.result,.new-game,.join-room,.player-status,.start-menu,.side-menu,.menu-button,.restriction';
  if (action_type == 'toggle') {
    if (mediaQuery.matches) {
      $('.active').each(function() {
        if ($(this).css('display') != 'none') {
          $(this).css('visibility', ($(this).css('visibility') === 'visible') ? 'hidden' : 'visible');
        }
      });
    }
    $(`${visible}`).toggle();
    $(`${visible}`).css('visibility', $(`${visible}`).css('visibility') == 'hidden' ? 'visible' : 'hidden');
  } else if (action_type == 'decreased') {
    $('.active').each(function() {
      if ($(this).css('visibility') === 'visible' && $(`${visible}`).css('visibility') === 'visible') $(this).css('visibility', 'hidden');
    });
    return;
  } else if (action_type == 'increased') {
    $('.active').each(function() {
      if ($(this).css('display') != 'none' && $(`.start-menu`).css('visibility') != 'visible') $(this).css('visibility', 'visible');
    });
    return;
  } else {
    $(`${elements}`).css('display', 'none');
    $(`${elements}`).css('visibility', 'hidden');
    $(`${visible}`).css('display', '');
    $(`${visible}`).css('visibility', 'visible');
  }
  animate_board();
}

function animate_board() {
  var inPlay = $('.join-room').css('visibility') == 'hidden' && $('.restriction').css('visibility') == 'hidden';
  var sideMenuVisible = $('.side-menu').css('visibility') !== 'hidden';
  function moveBoardYAxis(yAxisPercentage) {
    $('#tic-tac-toe-board').css('top', `${yAxisPercentage}%`);
    $('#tic-tac-toe-board').css('transform', `translate(-50%, -${yAxisPercentage}%)`);
  }
  if (inPlay) moveBoardYAxis(sideMenuVisible && mediaQuery.matches ? 80 : 50);
  else moveBoardYAxis(80);
}

function resetBoard() {
  variables.gameData.board = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
  variables.gameData.spaces_left = 9;
  variables.gameData.player_turn = { x: 'x' };
  variables.gameData.in_session = true;
  $('.result').text('');
  updateBoard(variables.gameData);
}

function startGame(roomId, restriction) {
  variables.roomId = roomId || makeid(5);
  variables.gameData.restriction = restriction || 'public';
  $('.room-id').text(`room id: ${variables.roomId}`);
  $('.player-status').html('X\'s Turn');
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
  $('.result').text(result === 'cat' ? 'CAT' : `${result.toUpperCase()} WON`);
  visibility('.new-game,.result,.room-id,.menu-button');
}

function updateBoard(gameData) {
  var currentMark = Object.keys(gameData.player_turn)[0];
  var gameResult = resultCheck(gameData.board, gameData.spaces_left);
  Object.entries(gameData.board).forEach(entry => {
    var box_position = entry[0], box_value = entry[1];
    var selected = box_value != 0;
    $(`.box${box_position}`).css('display', 'inherit');
    $(`.box${box_position}`).css('opacity', selected ? 1 : '');
    $(`.box${box_position}`).css('background-image',
      box_value == 1 ? `url('./img/x.svg')` :
      box_value == -1 ? `url('./img/o.svg')` :
      `url('./img/${currentMark}.svg')`
    );
    $(`.box${box_position}`).css('visibility', (gameData.in_session || selected) && gameResult == undefined ? 'visible' : selected ? 'visible' : 'hidden');
  });
}

function resultCheck(board, spaces_left) {
  var lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const line of lines) {
    var total = Number(board[line[0]]) + Number(board[line[1]]) + Number(board[line[2]]);
    if (total === 3) return 'x';
    if (total === -3) return 'o';
  }
  return spaces_left === 0 ? 'cat' : undefined;
}

function showInvalidRoomId() {
  const input = document.getElementById('input-room-id');
  if (!input) return;
  input.value = '';
  input.placeholder = 'enter any 5-character room id';
  input.classList.add('invalid');
}

function clearInvalidRoomId() {
  const input = document.getElementById('input-room-id');
  if (!input) return;
  if (input.classList.contains('invalid')) {
    input.classList.remove('invalid');
    input.placeholder = 'enter room id';
  }
}

function attemptJoinById(raw) {
  const roomId = (raw || '').trim();
  if (!/^[A-Za-z0-9]{5}$/.test(roomId)) return showInvalidRoomId();
  startGame(roomId, 'private');
}

window.addEventListener('resize', () => {
  if (window.innerWidth <= 700) visibility('.side-menu', 'decreased');
  else if (window.innerWidth >= 701) visibility('.side-menu', 'increased');
});

window.addEventListener('keyup', (event) => {
  if (event.target.matches('#input-room-id')) {
    if (event.key === 'Enter') attemptJoinById(event.target.value);
    else clearInvalidRoomId();
  }
});

window.addEventListener('click', (event) => {
  if (event.target.matches('.host')) visibility('.restriction,.menu-button');
  if (event.target.matches('.choice')) {
    if (event.target.innerText === 'Private') host('private');
    else if (event.target.innerText === 'Public') host('public');
    else if (event.target.innerText === 'Yes') startGame(variables.roomId || makeid(5), variables.gameData.restriction || 'public');
    else end();
  }
  if (event.target.matches('.join')) visibility('.join-room,.menu-button');
  if (event.target.matches('.random-match')) startGame(makeid(5), 'public');
  if (event.target.matches('.leave')) end();
  if (event.target.matches('.menu-button')) visibility('.side-menu', 'toggle');

  for (var i = 0; i < 9; i++) {
    if (event.target.matches(`.box${i}`) && variables.gameData.in_session == true && variables.gameData.board[i] == 0) {
      var mark = Object.keys(variables.gameData.player_turn)[0];
      variables.gameData.board[i] = mark === 'x' ? 1 : -1;
      variables.gameData.spaces_left--;
      var gameResult = resultCheck(variables.gameData.board, variables.gameData.spaces_left);
      if (gameResult !== undefined) {
        updateBoard(variables.gameData);
        end(gameResult);
        return;
      }
      variables.gameData.player_turn = mark === 'x' ? { o: 'o' } : { x: 'x' };
      $('.player-status').html(`${Object.keys(variables.gameData.player_turn)[0].toUpperCase()}'s Turn`);
      updateBoard(variables.gameData);
    }
  }
});

$(function() {
  updateBoard(variables.gameData);
  visibility('.start-menu');
});
