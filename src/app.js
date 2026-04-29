const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const suits = ["s", "h", "d", "c"];
const suitSymbols = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};
const rankLabels = {
  T: "10",
  J: "J",
  Q: "Q",
  K: "K",
  A: "A",
};
const categoryNames = [
  "High Card",
  "One Pair",
  "Two Pair",
  "Three of a Kind",
  "Straight",
  "Flush",
  "Full House",
  "Four of a Kind",
  "Straight Flush",
];
const storageKey = "poker-allin-flip-session";

const state = {
  mode: "solo",
  currentFlip: null,
  revealedBoardCount: 0,
  isOpeningBoard: false,
  revealTimer: null,
  stats: {
    player1: 0,
    player2: 0,
    chops: 0,
    total: 0,
  },
  history: [],
};

const elements = {
  soloModeButton: document.querySelector("#soloModeButton"),
  duoModeButton: document.querySelector("#duoModeButton"),
  dealButton: document.querySelector("#dealButton"),
  resetButton: document.querySelector("#resetButton"),
  playerOneName: document.querySelector("#playerOneName"),
  playerTwoName: document.querySelector("#playerTwoName"),
  playerOnePanel: document.querySelector("#playerOnePanel"),
  playerTwoPanel: document.querySelector("#playerTwoPanel"),
  playerOneBadge: document.querySelector("#playerOneBadge"),
  playerTwoBadge: document.querySelector("#playerTwoBadge"),
  playerOneCards: document.querySelector("#playerOneCards"),
  playerTwoCards: document.querySelector("#playerTwoCards"),
  playerOneEquity: document.querySelector("#playerOneEquity"),
  playerTwoEquity: document.querySelector("#playerTwoEquity"),
  boardCards: document.querySelector("#boardCards"),
  playerOneHand: document.querySelector("#playerOneHand"),
  playerTwoHand: document.querySelector("#playerTwoHand"),
  resultTitle: document.querySelector("#resultTitle"),
  resultDetail: document.querySelector("#resultDetail"),
  playerOneWins: document.querySelector("#playerOneWins"),
  playerTwoWins: document.querySelector("#playerTwoWins"),
  playerOneStatLabel: document.querySelector("#playerOneStatLabel"),
  playerTwoStatLabel: document.querySelector("#playerTwoStatLabel"),
  chops: document.querySelector("#chops"),
  winRate: document.querySelector("#winRate"),
  flipCount: document.querySelector("#flipCount"),
  historyList: document.querySelector("#historyList"),
  preflopStep: document.querySelector("#preflopStep"),
  flopStep: document.querySelector("#flopStep"),
  turnStep: document.querySelector("#turnStep"),
  riverStep: document.querySelector("#riverStep"),
  winnerSummary: document.querySelector("#winnerSummary"),
  winnerSubtext: document.querySelector("#winnerSubtext"),
  winnerPanel: document.querySelector(".winner-panel"),
};

function createDeck() {
  return suits.flatMap((suit) => ranks.map((rank) => ({ rank, suit, value: ranks.indexOf(rank) + 2 })));
}

function shuffle(cards) {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function dealFlip() {
  const deck = shuffle(createDeck());
  return {
    player1: deck.slice(0, 2),
    player2: deck.slice(2, 4),
    board: deck.slice(4, 9),
  };
}

function cardKey(card) {
  return `${card.rank}${card.suit}`;
}

function getRemainingDeck(knownCards) {
  const known = new Set(knownCards.map(cardKey));
  return createDeck().filter((card) => !known.has(cardKey(card)));
}

function combinations(cards, size) {
  const result = [];

  function visit(start, combo) {
    if (combo.length === size) {
      result.push(combo);
      return;
    }

    for (let index = start; index <= cards.length - (size - combo.length); index += 1) {
      visit(index + 1, [...combo, cards[index]]);
    }
  }

  visit(0, []);
  return result;
}

function evaluateFive(cards) {
  const values = cards.map((card) => card.value).sort((a, b) => b - a);
  const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
  const counts = new Map();

  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const isFlush = cards.every((card) => card.suit === cards[0].suit);
  const straightHigh = getStraightHigh(uniqueValues);

  if (isFlush && straightHigh) {
    return score(8, [straightHigh]);
  }

  if (groups[0][1] === 4) {
    return score(7, [groups[0][0], groups.find((group) => group[1] === 1)[0]]);
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return score(6, [groups[0][0], groups[1][0]]);
  }

  if (isFlush) {
    return score(5, values);
  }

  if (straightHigh) {
    return score(4, [straightHigh]);
  }

  if (groups[0][1] === 3) {
    const kickers = groups.filter((group) => group[1] === 1).map((group) => group[0]);
    return score(3, [groups[0][0], ...kickers]);
  }

  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const pairs = groups.filter((group) => group[1] === 2).map((group) => group[0]);
    const kicker = groups.find((group) => group[1] === 1)[0];
    return score(2, [...pairs, kicker]);
  }

  if (groups[0][1] === 2) {
    const kickers = groups.filter((group) => group[1] === 1).map((group) => group[0]);
    return score(1, [groups[0][0], ...kickers]);
  }

  return score(0, values);
}

function getStraightHigh(uniqueValues) {
  const values = uniqueValues.includes(14) ? [...uniqueValues, 1] : uniqueValues;

  for (let index = 0; index <= values.length - 5; index += 1) {
    const window = values.slice(index, index + 5);
    if (window.every((value, offset) => value === window[0] - offset)) {
      return window[0] === 14 && window[1] === 5 ? 5 : window[0];
    }
  }

  return null;
}

function score(category, tiebreakers) {
  return {
    category,
    tiebreakers,
    comparable: [category, ...tiebreakers],
    name: categoryNames[category],
  };
}

function evaluateBest(cards) {
  if (cards.length < 5) {
    return null;
  }

  return combinations(cards, 5)
    .map(evaluateFive)
    .sort(compareScores)
    .at(-1);
}

function compareScores(a, b) {
  const maxLength = Math.max(a.comparable.length, b.comparable.length);
  for (let index = 0; index < maxLength; index += 1) {
    const left = a.comparable[index] || 0;
    const right = b.comparable[index] || 0;
    if (left !== right) {
      return left - right;
    }
  }
  return 0;
}

function calculateEquity(player1, player2, visibleBoard) {
  const missingBoardCount = 5 - visibleBoard.length;
  const knownCards = [...player1, ...player2, ...visibleBoard];
  const remainingDeck = getRemainingDeck(knownCards);
  const useSampling = missingBoardCount >= 3;
  const sampleSize = visibleBoard.length === 0 ? 5000 : 1800;
  const completions = useSampling
    ? Array.from({ length: sampleSize }, () => shuffle(remainingDeck).slice(0, missingBoardCount))
    : combinations(remainingDeck, missingBoardCount);
  const totals = {
    player1: 0,
    player2: 0,
    chops: 0,
  };

  for (const completion of completions) {
    const board = [...visibleBoard, ...completion];
    const score1 = evaluateBest([...player1, ...board]);
    const score2 = evaluateBest([...player2, ...board]);
    const comparison = compareScores(score1, score2);

    if (comparison > 0) totals.player1 += 1;
    if (comparison < 0) totals.player2 += 1;
    if (comparison === 0) totals.chops += 1;
  }

  const total = completions.length;
  return {
    player1: (totals.player1 + totals.chops / 2) / total,
    player2: (totals.player2 + totals.chops / 2) / total,
    chops: totals.chops / total,
    isEstimate: useSampling,
  };
}

function renderCard(card) {
  const cardElement = document.createElement("div");
  cardElement.className = `card suit-${card.suit}`;
  const rank = rankLabels[card.rank] || card.rank;
  const suit = suitSymbols[card.suit];
  cardElement.setAttribute("aria-label", `${rank} of ${card.suit}`);
  cardElement.innerHTML = `
    <span class="card-rank">${rank}</span>
    <span class="card-suit">${suit}</span>
    <span class="card-corner">${suit}</span>
  `;
  return cardElement;
}

function renderHiddenCard(index) {
  const cardElement = document.createElement("div");
  cardElement.className = "card is-hidden-card";
  cardElement.setAttribute("aria-label", `hidden board card ${index + 1}`);
  return cardElement;
}

function renderCards(container, cards) {
  container.replaceChildren(...cards.map(renderCard));
}

function renderBoard(cards, revealedCount) {
  const visibleCards = cards.slice(0, revealedCount).map(renderCard);
  const hiddenCards = Array.from({ length: 5 - revealedCount }, (_, index) =>
    renderHiddenCard(revealedCount + index),
  );
  containerReplace(elements.boardCards, [...visibleCards, ...hiddenCards]);
}

function containerReplace(container, children) {
  container.replaceChildren(...children);
}

function cardText(cards) {
  return cards.map((card) => `${card.rank}${card.suit}`).join(" ");
}

function rankText(value) {
  return ranks[value - 2] || String(value);
}

function percent(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

function describeScore(scoreValue) {
  if (!scoreValue) {
    return "役: ボード公開待ち";
  }

  if (scoreValue.category === 0 || scoreValue.category === 5) {
    return `${scoreValue.name}, ${rankText(scoreValue.tiebreakers[0])} high`;
  }
  if (scoreValue.category === 4 || scoreValue.category === 8) {
    return `${scoreValue.name}, ${rankText(scoreValue.tiebreakers[0])} high`;
  }
  return `${scoreValue.name} (${scoreValue.tiebreakers.map(rankText).join(", ")})`;
}

function getStreetName(revealedCount) {
  if (revealedCount === 0) return "Preflop";
  if (revealedCount < 3) return `Flop ${revealedCount}/3`;
  if (revealedCount === 3) return "Flop";
  if (revealedCount === 4) return "Turn";
  return "River";
}

function getActionText() {
  if (state.isOpeningBoard) return "Opening...";
  if (state.revealedBoardCount === 5) return "Next Flip";
  return "Board Open";
}

function setWinnerUi(winner) {
  const p1Won = winner === "player1";
  const p2Won = winner === "player2";

  elements.playerOnePanel.classList.toggle("is-winner", p1Won);
  elements.playerTwoPanel.classList.toggle("is-winner", p2Won);
  elements.playerOneBadge.classList.toggle("is-hidden", !p1Won);
  elements.playerTwoBadge.classList.toggle("is-hidden", !p2Won);
}

function loadStoredSession() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (!stored) return;

    state.stats = {
      player1: Number(stored.stats?.player1) || 0,
      player2: Number(stored.stats?.player2) || 0,
      chops: Number(stored.stats?.chops) || 0,
      total: Number(stored.stats?.total) || 0,
    };
    state.history = Array.isArray(stored.history) ? stored.history.slice(0, 6) : [];
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function saveStoredSession() {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        stats: state.stats,
        history: state.history,
      }),
    );
  } catch {
    // Storage may be unavailable in strict private browsing modes.
  }
}

function startFlip() {
  stopBoardOpening();
  state.currentFlip = dealFlip();
  state.revealedBoardCount = 0;
  renderCurrentFlip();
}

function handleBoardAction() {
  if (state.isOpeningBoard) return;

  if (!state.currentFlip || state.revealedBoardCount === 5) {
    startFlip();
    return;
  }

  openBoardAutomatically();
}

function openBoardAutomatically() {
  state.isOpeningBoard = true;
  renderActionButton();
  revealNextBoardCard();
}

function revealNextBoardCard() {
  if (state.revealedBoardCount >= 5) {
    stopBoardOpening();
    renderCurrentFlip();
    return;
  }

  state.revealedBoardCount += 1;
  renderCurrentFlip();

  if (state.revealedBoardCount === 5) {
    stopBoardOpening();
    renderActionButton();
    return;
  }

  state.revealTimer = window.setTimeout(revealNextBoardCard, getRevealDelay(state.revealedBoardCount));
}

function stopBoardOpening() {
  if (state.revealTimer) {
    window.clearTimeout(state.revealTimer);
  }
  state.revealTimer = null;
  state.isOpeningBoard = false;
}

function getRevealDelay(revealedCount) {
  if (revealedCount < 3) return 260;
  if (revealedCount === 3) return 1300;
  if (revealedCount === 4) return 1500;
  return 760;
}

function renderActionButton() {
  elements.dealButton.textContent = getActionText();
  elements.dealButton.disabled = state.isOpeningBoard;
  elements.dealButton.classList.toggle("is-opening", state.isOpeningBoard);
  elements.dealButton.classList.toggle("is-next", !state.isOpeningBoard && state.revealedBoardCount === 5);
}

function renderCurrentFlip() {
  const flip = state.currentFlip;
  const visibleBoard = flip.board.slice(0, state.revealedBoardCount);
  const score1 = evaluateBest([...flip.player1, ...visibleBoard]);
  const score2 = evaluateBest([...flip.player2, ...visibleBoard]);
  const shouldCalculateEquity =
    state.revealedBoardCount === 0 || state.revealedBoardCount === 3 || state.revealedBoardCount >= 4;
  const equity = shouldCalculateEquity ? calculateEquity(flip.player1, flip.player2, visibleBoard) : null;
  const playerOneName = state.mode === "solo" ? "You" : "Player 1";
  const playerTwoName = state.mode === "solo" ? "CPU" : "Player 2";
  const streetName = getStreetName(state.revealedBoardCount);
  const equityPrefix = equity?.isEstimate ? "推定勝率" : "勝率";

  elements.playerOneName.textContent = playerOneName;
  elements.playerTwoName.textContent = playerTwoName;
  elements.playerOneStatLabel.textContent = playerOneName;
  elements.playerTwoStatLabel.textContent = playerTwoName;
  renderActionButton();
  renderCards(elements.playerOneCards, flip.player1);
  renderCards(elements.playerTwoCards, flip.player2);
  renderBoard(flip.board, state.revealedBoardCount);
  elements.playerOneHand.textContent = describeScore(score1);
  elements.playerTwoHand.textContent = describeScore(score2);
  if (equity) {
    elements.playerOneEquity.textContent = `${equityPrefix} ${percent(equity.player1)}`;
    elements.playerTwoEquity.textContent = `${equityPrefix} ${percent(equity.player2)}`;
  }
  renderStreetMeter(state.revealedBoardCount);

  if (state.revealedBoardCount < 5) {
    elements.resultTitle.textContent = streetName;
    elements.resultDetail.textContent = "";
    elements.winnerSummary.textContent = "カードを公開してください";
    elements.winnerSubtext.textContent = `${streetName} 時点の勝率を表示中`;
    elements.winnerPanel.classList.remove("is-final");
    setWinnerUi(null);
    return;
  }

  finishFlip(flip, score1, score2, playerOneName, playerTwoName);
}

function finishFlip(flip, score1, score2, playerOneName, playerTwoName) {
  const comparison = compareScores(score1, score2);
  const winner = comparison > 0 ? "player1" : comparison < 0 ? "player2" : "chop";
  const resultTitle =
    winner === "chop" ? "Chop pot" : `${winner === "player1" ? playerOneName : playerTwoName} wins`;

  state.stats.total += 1;
  if (winner === "player1") state.stats.player1 += 1;
  if (winner === "player2") state.stats.player2 += 1;
  if (winner === "chop") state.stats.chops += 1;

  state.history.unshift({
    title: resultTitle,
    detail: `${cardText(flip.player1)} vs ${cardText(flip.player2)} / ${cardText(flip.board)}`,
  });
  state.history = state.history.slice(0, 6);

  elements.resultTitle.textContent = "River";
  elements.resultDetail.textContent = "";
  elements.winnerSummary.textContent = resultTitle;
  elements.winnerSubtext.textContent =
    winner === "chop"
      ? "引き分けを記録しました"
      : "勝ち数を記録しました";
  elements.winnerPanel.classList.add("is-final");
  setWinnerUi(winner);
  renderStats();
  renderHistory();
  saveStoredSession();
}

function renderStreetMeter(revealedCount) {
  elements.preflopStep.classList.toggle("is-active", revealedCount === 0);
  elements.flopStep.classList.toggle("is-active", revealedCount > 0 && revealedCount <= 3);
  elements.turnStep.classList.toggle("is-active", revealedCount === 4);
  elements.riverStep.classList.toggle("is-active", revealedCount === 5);
}

function renderStats() {
  const winRate =
    state.stats.total === 0 ? 0 : Math.round((state.stats.player1 / state.stats.total) * 100);

  elements.playerOneWins.textContent = state.stats.player1;
  elements.playerTwoWins.textContent = state.stats.player2;
  elements.chops.textContent = state.stats.chops;
  elements.winRate.textContent = `${winRate}%`;
  elements.flipCount.textContent = `${state.stats.total} flips`;
}

function renderHistory() {
  if (state.history.length === 0) {
    const empty = document.createElement("li");
    empty.className = "history-item";
    empty.textContent = "No completed flips yet";
    elements.historyList.replaceChildren(empty);
    return;
  }

  const items = state.history.map((item) => {
    const listItem = document.createElement("li");
    listItem.className = "history-item";
    listItem.innerHTML = `<strong>${item.title}</strong><span>${item.detail}</span>`;
    return listItem;
  });
  elements.historyList.replaceChildren(...items);
}

function setMode(mode) {
  state.mode = mode;
  elements.soloModeButton.classList.toggle("is-active", mode === "solo");
  elements.duoModeButton.classList.toggle("is-active", mode === "duo");
  startFlip();
}

function resetSession() {
  state.stats = {
    player1: 0,
    player2: 0,
    chops: 0,
    total: 0,
  };
  state.history = [];
  saveStoredSession();
  renderStats();
  renderHistory();
  startFlip();
}

elements.dealButton.addEventListener("click", handleBoardAction);
elements.resetButton.addEventListener("click", resetSession);
elements.soloModeButton.addEventListener("click", () => setMode("solo"));
elements.duoModeButton.addEventListener("click", () => setMode("duo"));

loadStoredSession();
renderStats();
renderHistory();
startFlip();
