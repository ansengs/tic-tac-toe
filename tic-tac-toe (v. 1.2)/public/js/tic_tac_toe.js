// Connect to the same origin that served the page — works in dev and in production.
var socket = io();

var variables = {
    'roomId': null,
    'joined': null,
    'gameData': {
        "players": [],
        "player_turn": { 'x': null },
        "board": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0 },
        "spaces_left": 9,
        "in_session": false,
        "restriction": null,
    }
};
const mediaQuery = window.matchMedia('(max-width: 700px)');

function updateVariables(data) {
    if (Array.isArray(data[0])) {
        // data[0] = variables index; data[1] = variable data
        data.forEach(values => variables[values[0]] = values[1]);
    } else {
        variables[data[0]] = data[1];
    }
}

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


function visibility(visible, action_type) {
    var elements = '.room-id,.result,.new-game,.join-room,.player-status,.start-menu,.side-menu,.menu-button,.restriction';
    // Make elements visible or toggle
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
    }
    // Update elements to hide if window size decreased
    else if (action_type == 'decreased') {
        $('.active').each(function() {
            if ($(this).css('visibility') === 'visible' && $(`${visible}`).css('visibility') === 'visible') {
                $(this).css('visibility', 'hidden');
            }
        });
        return;
    }
    // Update elements to show if window size increased
    else if (action_type == 'increased') {
        $('.active').each(function() {
            if ($(this).css('display') != 'none' && $(`.start-menu`).css('visibility') != 'visible') {
                $(this).css('visibility', 'visible');
            }
        });
        return;
    }
    // Hide all elements in elements array, then show desired elements
    else {
        $(`${elements}`).css('display', 'none');
        $(`${elements}`).css('visibility', 'hidden');
        $(`${visible}`).css('display', '');
        $(`${visible}`).css('visibility', 'visible');
    }
    animate_board();
}

function animate_board() {
    var inPlay = $('.join-room').css('visibility') == 'hidden' &&
        $('.restriction').css('visibility') == 'hidden';
    var sideMenuVisible = $('.side-menu').css('visibility') !== 'hidden';

    function moveBoardYAxis(yAxisPercentage) {
        $('#tic-tac-toe-board').css('top', `${yAxisPercentage}%`);
        $('#tic-tac-toe-board').css('transform', `translate(-50%, -${yAxisPercentage}%)`);
    }

    if (inPlay) {
        if (sideMenuVisible && mediaQuery.matches) {
            moveBoardYAxis(80);
        } else {
            moveBoardYAxis(50);
        }
    } else {
        moveBoardYAxis(80);
    }
}

function joinRoom(roomId) {
    socket.emit('join-room', roomId, socket.id);
    updateVariables(['joined', true]);
    $('.room-id').text(`room id: ${roomId}`);
}

function host(restriction) {
    visibility('.room-id,.player-status,.menu-button');
    const new_room_id = makeid(5);
    $('.player-status').html('Waiting for Player to Join');
    $('.room-id').text(`room id: ${new_room_id}`);
    variables.gameData.restriction = restriction;
    socket.emit('host', [restriction, new_room_id]);
}

function end(result, players) {
    // Refresh website
    if (result === undefined && players === undefined) {
        window.location = window.parent.location.origin;
        return;
    }
    var isPlayer = players.includes(socket.id);
    // Game was unfinished
    if (players.length == 1) {
        if (isPlayer) {
            visibility('.new-game,.player-status,.room-id,.menu-button');
        }
        if (!isPlayer) {
            visibility('.player-status,.room-id,.menu-button');
        }
    }
    // Game finished
    else if (players.length == 2) {
        if (isPlayer) {
            var clientIsPlayerX = players[0] === socket.id;
            $('.result').text(
                ((result === 'x' && clientIsPlayerX) || (result === 'o' && !clientIsPlayerX) || result === 'null') ? 'WON' :
                (result === 'cat') ? 'CAT' : 'LOST'
            );
            visibility('.new-game,.result,.room-id,.menu-button');
        }
        // Spectator
        else if (!isPlayer) {
            visibility('.result,.room-id,.menu-button');
            if (result !== 'null') {
                $('.result').text(`${result.toUpperCase()} WON`);
            }
        }
    }
    variables.gameData.in_session = false;
}

function updateBoard(gameData) {
    // Set background image for each box; 1 = x, -1 = o, 0 = null
    var isPlayerTurn = Object.values(gameData.player_turn)[0] === socket.id;
    var gameResult = resultCheck(gameData.board, gameData.spaces_left);
    Object.entries(gameData.board).forEach(entry => {
        var [box_position, box_value] = entry;
        var selected = box_value != 0;
        $(`.box${box_position}`).css('display', 'inherit');
        // Set boxes state based on box value
        $(`.box${box_position}`).css('opacity', (selected) ? 1 : '');
        // Set background-image
        $(`.box${box_position}`).css('background-image',
            (box_value == 1) ? `url('/img/x.svg')` :
            (box_value == -1) ? `url('/img/o.svg')` :
            `url('/img/${Object.keys(gameData.player_turn)[0]}.svg')`
        );
        // Set visibility
        $(`.box${box_position}`).css('visibility',
            ((isPlayerTurn && gameResult == undefined) || selected) ? 'visible' : 'hidden'
        );
    });
}

function resultCheck(board, spaces_left) {
    var result = undefined;
    /* Winning line positions for a 3 in a row based on
    [
    0,1,2
    3,4,5
    6,7,8
    ]
    */
    var lines = [
        // Horizontal
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        // Vertical
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        // Diagonal
        [0, 4, 8],
        [2, 4, 6],
    ];
    for (const line of lines) {
        var line_total = 0;
        for (const position of line) {
            line_total += board[position];
        }
        if (result === 'x' || result === 'o') {
            break;
        } else {
            result =
                (line_total === 3) ? 'x' :
                (line_total === -3) ? 'o' :
                ((line_total !== 3 || line_total !== -3) && spaces_left === 0) ? 'cat' :
                undefined;
        }
    }
    return result;
}

var pendingDirectJoin = false;

function showInvalidRoomId() {
    const input = document.getElementById('input-room-id');
    if (!input) return;
    input.value = '';
    input.placeholder = 'invalid room id';
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
    // Room ids are 5 alphanumeric characters (see makeid above)
    if (!/^[A-Za-z0-9]{5}$/.test(roomId)) {
        showInvalidRoomId();
        return;
    }
    pendingDirectJoin = true;
    // Ask the server to join directly; it will reply with join-room-result.
    socket.emit('join-room', roomId, socket.id);
}

window.addEventListener('resize', () => {
    if (window.innerWidth <= 700) {
        visibility('.side-menu', 'decreased');
    } else if (window.innerWidth >= 701) {
        visibility('.side-menu', 'increased');
    }
});
window.addEventListener('keyup', (event) => {
    if (event.target.matches('#input-room-id')) {
        if (event.key === 'Enter') {
            attemptJoinById(event.target.value);
        } else {
            // User is typing — clear any prior "invalid" state
            clearInvalidRoomId();
        }
    }
});

window.addEventListener('click', (event) => {
    if (event.target.matches('.host')) {
        visibility('.restriction,.menu-button');
    }
    if (event.target.matches('.choice')) {
        (event.target.innerText === 'Private') ? host('private') :
            (event.target.innerText === 'Public') ? host('public') :
            (event.target.innerText === 'Yes') ?
            socket.emit('new-game', variables.roomId, socket.id) :
            end();
    }
    if (event.target.matches('.join')) {
        visibility('.join-room,.menu-button');
    }
    if (event.target.matches('.random-match')) {
        socket.emit('search-rooms', null, socket.id, true, 0, 0);
    }
    if (event.target.matches('.leave')) {
        end();
    }
    if (event.target.matches('.menu-button')) {
        visibility('.side-menu', 'toggle');
    }
    // For each box of board; emit chosen to game room
    var isPlayerTurn = Object.values(variables.gameData.player_turn)[0] === socket.id;
    for (var i = 0; i < 9; i++) {
        // Only updates if box not clicked and in session
        if (event.target.matches(`.box${[i]}`) && isPlayerTurn && variables.gameData.in_session == true) {
            var box_position = event.target.className.split(' ')[0][3];
            // Change board value to which box was clicked or tapped
            variables.gameData.board[box_position] = (Object.keys(variables.gameData.player_turn)[0] === 'x') ? 1 : -1;
            // Lower amount of moves left by 1
            variables.gameData.spaces_left--;
            // Change turn to other player
            variables.gameData.player_turn = (Object.keys(variables.gameData.player_turn)[0] === 'x') ? { 'o': variables.gameData.players[1] } : { 'x': variables.gameData.players[0] };

            socket.emit('data-update', [variables.gameData, variables.roomId]);
        }
    }
});

socket.on('search-rooms-restriction', (searchRoom, userId, isRandomMatch, iter, numOfGameRooms) => {
    var roomAvailable =
        ((isRandomMatch && variables.gameData.restriction === 'public' && variables.gameData.players.length === 1) || !isRandomMatch) ? searchRoom :
        'checked';
    socket.emit('search-rooms', roomAvailable, userId, isRandomMatch, iter, numOfGameRooms);
});

socket.on('room-available', (availableRoom, isRandomMatch) => {
    if (availableRoom != null) {
        joinRoom(availableRoom);
    } else if (isRandomMatch && availableRoom == null) {
        host('public');
    }
});

socket.on('join-room-result', (result) => {
    if (!pendingDirectJoin) return; // Random-match path manages its own state
    pendingDirectJoin = false;
    if (result && result.ok) {
        // Mirror the state that joinRoom() would have set; the view transition
        // happens when 'player-joined' arrives right after this.
        updateVariables(['joined', true]);
        $('.room-id').text(`room id: ${result.roomId}`);
    } else {
        showInvalidRoomId();
    }
});

socket.on('new-game', (roomId, userId) => {
    if (variables.gameData.in_session == false) {
        updateVariables([
            'gameData', {
                "players": variables.gameData.players,
                "player_turn": { 'x': variables.gameData.players[0] },
                "board": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0 },
                "spaces_left": 9,
                "in_session": 'pending',
                "restriction": variables.gameData.restriction,
            }
        ]);
    } else if (variables.gameData.in_session == 'pending') {
        updateVariables(
            ['gameData', {
                "players": variables.gameData.players,
                "player_turn": { 'x': variables.gameData.players[0] },
                "board": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0 },
                "spaces_left": 9,
                "in_session": (variables.gameData.players.length == 2) ? true : false,
                "restriction": variables.gameData.restriction,
            }]
        );
    }
    // Update layout for first player to choose to start new game
    // Player who decided to start a new game
    if (userId == socket.id && variables.gameData.in_session == 'pending') {
        updateBoard(variables.gameData);
        visibility('.menu-button,.room-id,.player-status');
        // Waiting for opponent to choose
        if (variables.gameData.players.length == 2) {
            $('.player-status').html('Waiting for Player to Choose');
        }
        // Chose new game, but no opponent exists
        else {
            $('.player-status').html('Waiting for Player to Join');
        }
    }
    // Start data-update if both players chose to start new game
    else if (variables.gameData.in_session == true) {
        visibility('.menu-button,.room-id,.player-status');
        socket.emit('data-update', [variables.gameData, variables.roomId]);
    }
});

socket.on('data-update', ([data, roomId]) => {
    updateVariables([
        ['gameData', data],
        ['roomId', roomId]
    ]);
    var gameResult = resultCheck(variables.gameData.board, variables.gameData.spaces_left);
    var inSession = variables.gameData.in_session;
    // End game if result has occurred
    if (gameResult != undefined) {
        end(gameResult, variables.gameData.players);
    }
    if (variables.gameData.in_session == 'pending') {
        if ($('.new-game').css('visibility') == 'visible') {
            $('.player-status').html('Player has joined' + "<br/>" + 'Waiting on you to choose');
        } else {
            $('.player-status').html('Waiting for Host to Start');
        }
    }
    // Set client and player turn status
    if (inSession == true && gameResult == undefined) {
        $('.player-status').css('visibility', 'visible');
        // is player
        if (variables.gameData.players.includes(socket.id)) {
            $('.player-status').html((Object.values(variables.gameData.player_turn)[0] == socket.id) ? "Your Turn" :
                `${Object.keys(variables.gameData.player_turn)[0].toUpperCase()}'s Turn`);
        }
        // is spectator
        else {
            $('.player-status').html('Spectating' + "<br/>" + `${Object.keys(variables.gameData.player_turn)[0].toUpperCase()}'s Turn`);
        }
    }
    updateBoard(variables.gameData);
});


socket.on('player-joined', (userId) => {
    var isHost = variables.gameData.players[0] == socket.id;
    if (isHost) {
        // No current opponent exists, then begin game
        var players = variables.gameData.players;
        if (players.length == 1) {
            players.push(userId);
            // If game ended and new player has joined
            updateVariables([
                ['gameData', {
                    "players": players,
                    "player_turn": { 'x': players[0] },
                    "board": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0 },
                    "spaces_left": 9,
                    "in_session": ($('.new-game').css('visibility') == 'visible') ? 'pending' : true,
                    "restriction": variables.gameData.restriction,
                }],
                ['roomId', variables.roomId]
            ]);
        }
        socket.emit('data-update', [variables.gameData, variables.roomId]);
    }
    if (variables.joined) {
        updateVariables(['joined', false]);
        visibility('.menu-button,.room-id,.player-status');
    }
});

socket.on('disconnected', (userId) => {
    var wasDisconnectUserPlayer = (userId === variables.gameData.players[0] || userId === variables.gameData.players[1]);
    // If player disconnected, end
    if (wasDisconnectUserPlayer) {
        var playerRemaining = variables.gameData.players.filter(item => item !== userId)[0];
        updateVariables([
            'gameData', {
                "players": [playerRemaining],
                "player_turn": { 'x': playerRemaining },
                "board": variables.gameData.board,
                "spaces_left": variables.gameData.spaces_left,
                "in_session": variables.gameData.in_session,
                "restriction": variables.gameData.restriction,
            }
        ]);
        end(null, [playerRemaining]);
        socket.emit('data-update', [variables.gameData, variables.roomId]);
        $('.player-status').html('Opponent disconnected');
    }
});
