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

const state = {
  mode: "solo",
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
  boardCards: document.querySelector("#boardCards"),
  playerOneHand: document.querySelector("#playerOneHand"),
  playerTwoHand: document.querySelector("#playerTwoHand"),
  resultTitle: document.querySelector("#resultTitle"),
  resultDetail: document.querySelector("#resultDetail"),
  playerOneWins: document.querySelector("#playerOneWins"),
  playerTwoWins: document.querySelector("#playerTwoWins"),
  chops: document.querySelector("#chops"),
  winRate: document.querySelector("#winRate"),
  flipCount: document.querySelector("#flipCount"),
  historyList: document.querySelector("#historyList"),
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

function evaluateSeven(cards) {
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

function renderCard(card) {
  const cardElement = document.createElement("div");
  cardElement.className = `card ${card.suit === "h" || card.suit === "d" ? "is-red" : ""}`;
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

function renderCards(container, cards) {
  container.replaceChildren(...cards.map(renderCard));
}

function cardText(cards) {
  return cards.map((card) => `${card.rank}${card.suit}`).join(" ");
}

function rankText(value) {
  return ranks[value - 2] || String(value);
}

function describeScore(scoreValue) {
  if (scoreValue.category === 0 || scoreValue.category === 5) {
    return `${scoreValue.name}, ${rankText(scoreValue.tiebreakers[0])} high`;
  }
  if (scoreValue.category === 4 || scoreValue.category === 8) {
    return `${scoreValue.name}, ${rankText(scoreValue.tiebreakers[0])} high`;
  }
  return `${scoreValue.name} (${scoreValue.tiebreakers.map(rankText).join(", ")})`;
}

function setWinnerUi(winner) {
  const p1Won = winner === "player1";
  const p2Won = winner === "player2";

  elements.playerOnePanel.classList.toggle("is-winner", p1Won);
  elements.playerTwoPanel.classList.toggle("is-winner", p2Won);
  elements.playerOneBadge.classList.toggle("is-hidden", !p1Won);
  elements.playerTwoBadge.classList.toggle("is-hidden", !p2Won);
}

function playFlip() {
  const flip = dealFlip();
  const score1 = evaluateSeven([...flip.player1, ...flip.board]);
  const score2 = evaluateSeven([...flip.player2, ...flip.board]);
  const comparison = compareScores(score1, score2);
  const winner = comparison > 0 ? "player1" : comparison < 0 ? "player2" : "chop";

  state.stats.total += 1;
  if (winner === "player1") state.stats.player1 += 1;
  if (winner === "player2") state.stats.player2 += 1;
  if (winner === "chop") state.stats.chops += 1;

  const playerOneName = state.mode === "solo" ? "You" : "Player 1";
  const playerTwoName = state.mode === "solo" ? "CPU" : "Player 2";
  const resultTitle =
    winner === "chop" ? "Chop pot" : `${winner === "player1" ? playerOneName : playerTwoName} wins`;

  state.history.unshift({
    title: resultTitle,
    detail: `${cardText(flip.player1)} vs ${cardText(flip.player2)} / ${cardText(flip.board)}`,
  });
  state.history = state.history.slice(0, 6);

  elements.playerOneName.textContent = playerOneName;
  elements.playerTwoName.textContent = playerTwoName;
  renderCards(elements.playerOneCards, flip.player1);
  renderCards(elements.playerTwoCards, flip.player2);
  renderCards(elements.boardCards, flip.board);
  elements.playerOneHand.textContent = describeScore(score1);
  elements.playerTwoHand.textContent = describeScore(score2);
  elements.resultTitle.textContent = resultTitle;
  elements.resultDetail.textContent =
    winner === "chop"
      ? `${describeScore(score1)}で引き分け`
      : `${winner === "player1" ? playerOneName : playerTwoName} takes it with ${
          winner === "player1" ? describeScore(score1) : describeScore(score2)
        }`;
  setWinnerUi(winner);
  renderStats();
  renderHistory();
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
    empty.textContent = "No flips yet";
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
  playFlip();
}

function resetSession() {
  state.stats = {
    player1: 0,
    player2: 0,
    chops: 0,
    total: 0,
  };
  state.history = [];
  renderStats();
  renderHistory();
  playFlip();
}

elements.dealButton.addEventListener("click", playFlip);
elements.resetButton.addEventListener("click", resetSession);
elements.soloModeButton.addEventListener("click", () => setMode("solo"));
elements.duoModeButton.addEventListener("click", () => setMode("duo"));

renderStats();
renderHistory();
playFlip();
