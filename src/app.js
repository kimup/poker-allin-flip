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
  streetDelayMs: 2000,
  handMode: "random",
  handBannerTimer: null,
  pendingAction: null,
  activeHandSlot: {
    target: "player1",
    index: 0,
  },
  selectedHands: {
    player1: [],
    player2: [],
  },
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
  streetDelaySelect: document.querySelector("#streetDelaySelect"),
  handSettings: document.querySelector("#handSettings"),
  handModeSelect: document.querySelector("#handModeSelect"),
  selectedHands: document.querySelector("#selectedHands"),
  cardPicker: document.querySelector("#cardPicker"),
  handInputMessage: document.querySelector("#handInputMessage"),
  handBanner: document.querySelector("#handBanner"),
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
  modeDialog: document.querySelector("#modeDialog"),
  modeDialogTitle: document.querySelector("#modeDialogTitle"),
  modeDialogText: document.querySelector("#modeDialogText"),
  modeCancelButton: document.querySelector("#modeCancelButton"),
  modeConfirmButton: document.querySelector("#modeConfirmButton"),
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
  const specified = getSpecifiedHands();
  const knownCards = [...specified.player1, ...specified.player2];
  const deck = shuffle(getRemainingDeck(knownCards));
  return {
    player1: specified.player1.length === 2 ? specified.player1 : deck.splice(0, 2),
    player2: specified.player2.length === 2 ? specified.player2 : deck.splice(0, 2),
    board: deck.slice(0, 5),
  };
}

function getSpecifiedHands() {
  if (state.handMode !== "specified") {
    elements.handInputMessage.textContent = "";
    return { player1: [], player2: [] };
  }

  const player1 = isCompleteHand(state.selectedHands.player1) ? state.selectedHands.player1 : [];
  const player2 = isCompleteHand(state.selectedHands.player2) ? state.selectedHands.player2 : [];
  elements.handInputMessage.textContent =
    player1.length || player2.length ? "2枚揃ったハンドだけ指定として使用中" : "";
  return {
    player1: [...player1],
    player2: [...player2],
  };
}

function isCompleteHand(cards) {
  return cards.length === 2 && cards.every(Boolean);
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
  if (state.revealedBoardCount === 5) return "Next Hand";
  return "Board Open";
}

function setWinnerUi(winner) {
  const p1Won = winner === "player1";
  const p2Won = winner === "player2";

  elements.playerOnePanel.classList.toggle("is-winner", p1Won);
  elements.playerTwoPanel.classList.toggle("is-winner", p2Won);
  elements.playerOnePanel.classList.remove("is-leading");
  elements.playerTwoPanel.classList.remove("is-leading");
  elements.playerOnePanel.classList.remove("is-locked");
  elements.playerTwoPanel.classList.remove("is-locked");
  elements.playerOneBadge.textContent = "Winner";
  elements.playerTwoBadge.textContent = "Winner";
  elements.playerOneBadge.classList.toggle("is-hidden", !p1Won);
  elements.playerTwoBadge.classList.toggle("is-hidden", !p2Won);
}

function clearWinnerUi() {
  elements.playerOnePanel.classList.remove("is-winner");
  elements.playerTwoPanel.classList.remove("is-winner");
  elements.playerOnePanel.classList.remove("is-locked");
  elements.playerTwoPanel.classList.remove("is-locked");
  elements.playerOneBadge.classList.add("is-hidden");
  elements.playerTwoBadge.classList.add("is-hidden");
}

function setLeaderUi(equity) {
  if (!equity || state.revealedBoardCount === 5) return;

  const margin = Math.abs(equity.player1 - equity.player2);
  const playerOneLocked = equity.player1 >= 1;
  const playerTwoLocked = equity.player2 >= 1;
  const playerOneLeads = equity.player1 > equity.player2 && margin >= 0.01;
  const playerTwoLeads = equity.player2 > equity.player1 && margin >= 0.01;

  elements.playerOnePanel.classList.toggle("is-locked", playerOneLocked);
  elements.playerTwoPanel.classList.toggle("is-locked", playerTwoLocked);
  elements.playerOnePanel.classList.toggle("is-leading", playerOneLeads && !playerOneLocked);
  elements.playerTwoPanel.classList.toggle("is-leading", playerTwoLeads && !playerTwoLocked);
  elements.playerOneBadge.textContent = playerOneLocked ? "Locked" : "Winner";
  elements.playerTwoBadge.textContent = playerTwoLocked ? "Locked" : "Winner";
  elements.playerOneBadge.classList.toggle("is-hidden", !playerOneLocked);
  elements.playerTwoBadge.classList.toggle("is-hidden", !playerTwoLocked);
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

function startFlip(options = {}) {
  stopBoardOpening();
  const hadFlip = Boolean(state.currentFlip);
  state.currentFlip = dealFlip();
  state.revealedBoardCount = 0;
  if (hadFlip && options.showBanner) showHandBanner();
  renderCurrentFlip();
}

function showHandBanner() {
  elements.handBanner.classList.remove("is-hidden");
  if (state.handBannerTimer) {
    window.clearTimeout(state.handBannerTimer);
  }
  state.handBannerTimer = window.setTimeout(() => {
    elements.handBanner.classList.add("is-hidden");
  }, 900);
}

function handleBoardAction() {
  if (state.isOpeningBoard) return;

  if (!state.currentFlip || state.revealedBoardCount === 5) {
    startFlip({ showBanner: true });
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
  return state.streetDelayMs;
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
  const playerOneName = state.mode === "solo" ? "Hero" : "Seat 1";
  const playerTwoName = state.mode === "solo" ? "Villain" : "Seat 2";
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
    clearWinnerUi();
    setLeaderUi(equity);
  }
  renderStreetMeter(state.revealedBoardCount);

  if (state.revealedBoardCount < 5) {
    elements.resultTitle.textContent = streetName;
    elements.resultDetail.textContent = "";
    elements.winnerSummary.textContent = "-";
    elements.winnerSubtext.textContent = "";
    elements.winnerPanel.classList.remove("is-final");
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
    player1: flip.player1,
    player2: flip.player2,
    board: flip.board,
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
    const title = document.createElement("strong");
    title.textContent = item.title;

    if (!item.player1 || !item.player2 || !item.board) {
      const detail = document.createElement("span");
      detail.textContent = item.detail || "";
      listItem.replaceChildren(title, detail);
      return listItem;
    }

    const hands = document.createElement("div");
    hands.className = "history-cards";
    hands.append(
      renderMiniCardGroup(item.player1),
      renderHistoryDivider("vs"),
      renderMiniCardGroup(item.player2),
      renderHistoryDivider("/"),
      renderMiniCardGroup(item.board),
    );
    listItem.replaceChildren(title, hands);
    return listItem;
  });
  elements.historyList.replaceChildren(...items);
}

function renderMiniCardGroup(cards) {
  const group = document.createElement("span");
  group.className = "mini-card-group";
  group.replaceChildren(...cards.map(renderMiniCard));
  return group;
}

function renderMiniCard(card) {
  const miniCard = document.createElement("span");
  miniCard.className = `mini-card suit-${card.suit}`;
  miniCard.textContent = `${rankLabels[card.rank] || card.rank}${suitSymbols[card.suit]}`;
  return miniCard;
}

function renderHistoryDivider(text) {
  const divider = document.createElement("span");
  divider.className = "history-divider";
  divider.textContent = text;
  return divider;
}

function renderCardPicker() {
  const specified = state.handMode === "specified";
  elements.handSettings.classList.toggle("is-specified", specified);
  elements.cardPicker.classList.toggle("is-hidden", !specified);

  if (!specified) {
    elements.selectedHands.replaceChildren();
    elements.cardPicker.replaceChildren();
    return;
  }

  renderSelectedHandSlots();
  const selectedKeys = new Set([...state.selectedHands.player1, ...state.selectedHands.player2].filter(Boolean).map(cardKey));
  const pickerCards = createDeck().map((card) => {
    const button = document.createElement("button");
    const key = cardKey(card);
    const currentCard = state.selectedHands[state.activeHandSlot.target][state.activeHandSlot.index];
    const isCurrentSlotCard = currentCard && cardKey(currentCard) === key;
    const unavailable = selectedKeys.has(key) && !isCurrentSlotCard;
    button.type = "button";
    button.className = `picker-card suit-${card.suit}`;
    button.textContent = `${rankLabels[card.rank] || card.rank}${suitSymbols[card.suit]}`;
    button.disabled = unavailable;
    button.classList.toggle("is-selected", isCurrentSlotCard);
    button.classList.toggle("is-unavailable", unavailable && !isCurrentSlotCard);
    button.addEventListener("click", () => toggleSpecifiedCard(card));
    return button;
  });
  elements.cardPicker.replaceChildren(...pickerCards);
}

function renderSelectedHandSlots() {
  const rows = [
    renderHandSlotRow("Hero", "player1"),
    renderHandSlotRow("Villain", "player2"),
  ];
  elements.selectedHands.replaceChildren(...rows);
}

function renderHandSlotRow(label, target) {
  const row = document.createElement("div");
  row.className = "hand-slot-row";
  const name = document.createElement("span");
  name.className = "hand-slot-label";
  name.textContent = label;
  row.append(name, renderHandSlot(target, 0), renderHandSlot(target, 1));
  return row;
}

function renderHandSlot(target, index) {
  const card = state.selectedHands[target][index];
  const slot = document.createElement("button");
  slot.type = "button";
  slot.className = `hand-slot ${card ? `suit-${card.suit}` : ""}`;
  slot.textContent = card ? `${rankLabels[card.rank] || card.rank}${suitSymbols[card.suit]}` : "-";
  slot.classList.toggle(
    "is-active",
    state.activeHandSlot.target === target && state.activeHandSlot.index === index,
  );
  slot.addEventListener("click", () => setHandSlot(target, index));
  return slot;
}

function toggleSpecifiedCard(card) {
  if (state.handMode !== "specified") return;

  const { target, index } = state.activeHandSlot;
  state.selectedHands[target][index] = card;
  advanceHandSlot(target, index);
  renderCardPicker();
  startFlip();
}

function advanceHandSlot(target, index) {
  if (target === "player1" && index === 0) {
    state.activeHandSlot = { target: "player1", index: 1 };
    return;
  }
  if (target === "player1" && index === 1) {
    state.activeHandSlot = { target: "player2", index: 0 };
    return;
  }
  if (target === "player2" && index === 0) {
    state.activeHandSlot = { target: "player2", index: 1 };
  }
}

function setHandSlot(target, index) {
  state.activeHandSlot = { target, index };
  renderCardPicker();
}

function resetSpecifiedHands() {
  state.selectedHands = {
    player1: [],
    player2: [],
  };
  state.activeHandSlot = {
    target: "player1",
    index: 0,
  };
  renderCardPicker();
}

function setMode(mode) {
  state.mode = mode;
  elements.soloModeButton.classList.toggle("is-active", mode === "solo");
  elements.duoModeButton.classList.toggle("is-active", mode === "duo");
  startFlip();
}

function requestModeChange(mode) {
  if (mode === state.mode || state.isOpeningBoard) return;

  const label = mode === "solo" ? "1人" : "2人";
  requestHistoryReset(`${label}モードに切り替えますか？`, () => {
    setMode(mode);
  });
}

function requestHandModeChange(mode) {
  if (mode === state.handMode || state.isOpeningBoard) {
    elements.handModeSelect.value = state.handMode;
    return;
  }

  elements.handModeSelect.value = state.handMode;
  requestHistoryReset(`${mode === "specified" ? "Specify" : "Random"}に切り替えますか？`, () => {
    state.handMode = mode;
    elements.handModeSelect.value = mode;
    if (mode === "specified") {
      resetSpecifiedHands();
    }
    renderCardPicker();
    startFlip();
  });
}

function requestHistoryReset(title, action) {
  state.pendingAction = action;
  elements.modeDialogTitle.textContent = title;
  elements.modeDialogText.textContent = "履歴がリセットされますがよろしいですか？";
  elements.modeDialog.classList.remove("is-hidden");
}

function closeModeDialog() {
  state.pendingAction = null;
  elements.modeDialog.classList.add("is-hidden");
}

function confirmModeChange() {
  const action = state.pendingAction;
  if (action) {
    resetSession({ startNewHand: false });
    action();
  }
  closeModeDialog();
}

function resetSession(options = {}) {
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
  if (options.startNewHand !== false) {
    startFlip();
  }
}

elements.dealButton.addEventListener("click", handleBoardAction);
elements.streetDelaySelect.addEventListener("change", () => {
  state.streetDelayMs = Number(elements.streetDelaySelect.value) || 2000;
});
elements.handModeSelect.addEventListener("change", () => requestHandModeChange(elements.handModeSelect.value));
elements.resetButton.addEventListener("click", () => {
  requestHistoryReset("履歴をリセットしますか？", () => startFlip());
});
elements.soloModeButton.addEventListener("click", () => requestModeChange("solo"));
elements.duoModeButton.addEventListener("click", () => requestModeChange("duo"));
elements.modeCancelButton.addEventListener("click", closeModeDialog);
elements.modeConfirmButton.addEventListener("click", confirmModeChange);

loadStoredSession();
renderCardPicker();
renderStats();
renderHistory();
startFlip();
