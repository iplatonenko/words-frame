(function () {
  // ---- DOM
  var elWord = document.getElementById("word");
  var elTranslation = document.getElementById("translation");
  var elCsvName = document.getElementById("csvName");
  var elMeta = document.getElementById("meta");
  var elStatus = document.getElementById("status");
  var displayView = document.getElementById("displayView");
  var trainView = document.getElementById("trainView");
  var trainProgress = document.getElementById("trainProgress");
  var trainPrompt = document.getElementById("trainPrompt");
  var trainOptions = document.getElementById("trainOptions");
  var trainSummary = document.getElementById("trainSummary");
  var trainMistakes = document.getElementById("trainMistakes");
  var trainActions = document.getElementById("trainActions");

  var fileInput = document.getElementById("fileInput");

  var btnStart = document.getElementById("btnStart");
  var btnPause = document.getElementById("btnPause");
  var btnPrev = document.getElementById("btnPrev");
  var btnNext = document.getElementById("btnNext");
  var btnShuffle = document.getElementById("btnShuffle");
  var btnList = document.getElementById("btnList");
  var btnTrain = document.getElementById("btnTrain");
  var btnSwap = document.getElementById("btnSwap");
  var btnTheme = document.getElementById("btnTheme");
  var btnReset = document.getElementById("btnReset");
  var btnBoard = document.getElementById("btnBoard");
  var btnListClose = document.getElementById("btnListClose");
  var btnTrainRestart = document.getElementById("btnTrainRestart");
  var btnTrainClose = document.getElementById("btnTrainClose");
  var card = document.getElementById("card");
  var listModal = document.getElementById("listModal");
  var listBody = document.getElementById("listBody");

  var intervalSelect = document.getElementById("intervalSelect");
  var knownSizeSelect = document.getElementById("knownSizeSelect");
  var learningSizeSelect = document.getElementById("learningSizeSelect");

  // ---- Storage keys
  var K_WORDS = "wf_words_v1";
  var K_INDEX = "wf_index_v1";
  var K_INTERVAL = "wf_interval_v1";
  var K_BOARD = "wf_board_v1";
  var K_SWAP = "wf_swap_v1";
  var K_THEME = "wf_theme_v1";
  var K_SIZE_KNOWN = "wf_size_known_v1";
  var K_SIZE_LEARNING = "wf_size_learning_v1";
  var K_CSV_NAME = "wf_csv_name_v1";
  var DEFAULT_KNOWN_SIZE = 120;
  var DEFAULT_LEARNING_SIZE = 24;

  // ---- State
  var words = []; // {el, ru}
  var index = 0;
  var timerId = null;
  var isRunning = false;
  var longTapTimer = null;
  var longTapTriggered = false;
  var isSwapped = false;
  var shuffledRecently = false;
  var shuffledTimer = null;
  var knownSize = DEFAULT_KNOWN_SIZE;
  var learningSize = DEFAULT_LEARNING_SIZE;
  var theme = "dark";
  var csvName = "";
  var isListOpen = false;
  var trainSession = null;

  var LONG_TAP_MS = 1000;

  // ---- Helpers
  function save() {
    localStorage.setItem(K_WORDS, JSON.stringify(words));
    localStorage.setItem(K_INDEX, String(index));
    localStorage.setItem(K_CSV_NAME, csvName || "");
  }

  function load() {
    try {
      var w = localStorage.getItem(K_WORDS);
      if (w) words = JSON.parse(w) || [];
    } catch (e) {
      words = [];
    }
    var i = parseInt(localStorage.getItem(K_INDEX) || "0", 10);
    index = isFinite(i) ? i : 0;

    var sec = localStorage.getItem(K_INTERVAL);
    if (sec) intervalSelect.value = sec;

    var board = localStorage.getItem(K_BOARD);
    if (board === "1") document.body.classList.add("board-mode");

    var swap = localStorage.getItem(K_SWAP);
    isSwapped = swap === "1";

    var storedTheme = localStorage.getItem(K_THEME);
    if (storedTheme === "light" || storedTheme === "dark") theme = storedTheme;
    applyTheme(theme);

    knownSize = normalizeSize(
      localStorage.getItem(K_SIZE_KNOWN) || String(DEFAULT_KNOWN_SIZE),
      DEFAULT_KNOWN_SIZE,
    );
    learningSize = normalizeSize(
      localStorage.getItem(K_SIZE_LEARNING) || String(DEFAULT_LEARNING_SIZE),
      DEFAULT_LEARNING_SIZE,
    );
    knownSizeSelect.value = String(knownSize);
    learningSizeSelect.value = String(learningSize);

    csvName = localStorage.getItem(K_CSV_NAME) || "";
  }

  function setCsvName() {
    if (!elCsvName) return;
    if (csvName) {
      elCsvName.textContent = "CSV: " + csvName;
      return;
    }
    if (words.length) {
      elCsvName.textContent = "CSV: Saved words";
      return;
    }
    elCsvName.textContent = "CSV: —";
  }

  function setMeta() {
    if (!words.length) {
      elMeta.textContent = "";
      return;
    }
    elMeta.textContent = index + 1 + " / " + words.length;
  }

  function setButtonActive(btn, on) {
    if (!btn) return;
    if (on) btn.classList.add("is-active");
    else btn.classList.remove("is-active");
  }

  function toDisplayText(value) {
    value = String(value || "");
    return value ? value : "—";
  }

  function getPromptText(item) {
    if (!item) return "";
    return isSwapped ? String(item.ru || "") : String(item.el || "");
  }

  function getAnswerText(item) {
    if (!item) return "";
    return isSwapped ? String(item.el || "") : String(item.ru || "");
  }

  function setCardMode(isTraining) {
    if (displayView) displayView.style.display = isTraining ? "none" : "block";
    if (!trainView) return;
    if (isTraining) trainView.className = "train-view is-open";
    else trainView.className = "train-view";
  }

  function applyTheme(nextTheme) {
    theme = nextTheme === "light" ? "light" : "dark";
    if (theme === "light") document.body.classList.add("light-theme");
    else document.body.classList.remove("light-theme");
    btnTheme.textContent = theme === "light" ? "Theme: Light" : "Theme: Dark";
  }

  function setShuffledRecently(on) {
    shuffledRecently = on;
    if (shuffledTimer) {
      clearTimeout(shuffledTimer);
      shuffledTimer = null;
    }
    if (on) {
      shuffledTimer = setTimeout(function () {
        shuffledRecently = false;
        updateUiState();
      }, 1200);
    }
  }

  function normalizeSize(value, fallback) {
    var n = parseInt(value, 10);
    if (!isFinite(n) || n < 8) return fallback;
    return n;
  }

  function applyKnownSizeInput() {
    knownSize = normalizeSize(
      knownSizeSelect.value || String(knownSize),
      DEFAULT_KNOWN_SIZE,
    );
    knownSizeSelect.value = String(knownSize);
    localStorage.setItem(K_SIZE_KNOWN, String(knownSize));
    render();
  }

  function applyLearningSizeInput() {
    learningSize = normalizeSize(
      learningSizeSelect.value || String(learningSize),
      DEFAULT_LEARNING_SIZE,
    );
    learningSizeSelect.value = String(learningSize);
    localStorage.setItem(K_SIZE_LEARNING, String(learningSize));
    render();
  }

  function updateUiState() {
    var hasWords = words.length > 0;
    var isBoard = document.body.classList.contains("board-mode");
    var isTraining = !!trainSession;
    var statusParts = [];

    btnStart.disabled = !hasWords || isRunning || isTraining;
    btnPause.disabled = !hasWords || !isRunning || isTraining;
    btnPrev.disabled = !hasWords || isTraining;
    btnNext.disabled = !hasWords || isTraining;
    btnShuffle.disabled = !hasWords || isTraining;
    if (btnList) btnList.disabled = !hasWords || isTraining;
    if (btnTrain) btnTrain.disabled = !hasWords && !isTraining;
    btnSwap.disabled = !hasWords || isTraining;
    btnReset.disabled = !hasWords;
    btnBoard.disabled = !hasWords || isTraining;
    intervalSelect.disabled = !hasWords || isTraining;
    knownSizeSelect.disabled = isTraining;
    learningSizeSelect.disabled = isTraining;

    setButtonActive(btnStart, hasWords && isRunning && !isTraining);
    setButtonActive(btnPause, hasWords && !isRunning && !isTraining);
    setButtonActive(btnBoard, isBoard && !isTraining);
    setButtonActive(btnShuffle, shuffledRecently);
    if (btnTrain) {
      btnTrain.textContent = isTraining ? "Exit Train" : "Train";
      setButtonActive(btnTrain, isTraining);
    }
    setButtonActive(btnSwap, hasWords && isSwapped);
    setButtonActive(btnTheme, theme === "light");

    if (!hasWords) {
      elStatus.textContent = "No data loaded";
      return;
    }

    if (isTraining) {
      if (trainSession.finished) {
        elStatus.textContent =
          "Training complete | " +
          trainSession.correctCount +
          " / " +
          trainSession.items.length;
      } else {
        elStatus.textContent =
          "Training | " +
          (trainSession.index + 1) +
          " / " +
          trainSession.items.length;
      }
      return;
    }

    statusParts.push(isRunning ? "Running" : "Paused");
    if (isBoard) statusParts.push("Board mode");
    if (isSwapped) statusParts.push("Swapped");
    if (shuffledRecently) statusParts.push("Shuffled");
    elStatus.textContent = statusParts.join(" | ");
  }

  function applyTextSizes() {
    var isBoard = document.body.classList.contains("board-mode");
    var knownPx = knownSize + (isBoard ? 16 : 0);
    var learningPx = learningSize + (isBoard ? 4 : 0);

    elWord.style.fontSize = knownPx + "px";
    elTranslation.style.fontSize = learningPx + "px";
  }

  function render() {
    applyTextSizes();

    if (trainSession) {
      setCardMode(true);
      renderTraining();
      setCsvName();
      if (trainSession.finished) {
        elMeta.textContent = "Result";
      } else {
        elMeta.textContent =
          "Train " +
          (trainSession.index + 1) +
          " / " +
          trainSession.items.length;
      }
      updateUiState();
      return;
    }

    setCardMode(false);

    if (!words.length) {
      elWord.textContent = "Upload CSV";
      elTranslation.textContent = "Known + Learning";
      setCsvName();
      setMeta();
      updateUiState();
      return;
    }

    if (index < 0) index = words.length - 1;
    if (index >= words.length) index = 0;

    var item = words[index];
    var top = getPromptText(item);
    var bottom = getAnswerText(item);

    elWord.textContent = top || "—";
    elTranslation.textContent = bottom ? bottom : " ";
    setCsvName();
    setMeta();
    save();
    updateUiState();
    if (isListOpen) renderWordsList();
  }

  function buildTrainingItems() {
    var items = [];
    for (var i = 0; i < words.length; i++) {
      items.push({
        prompt: toDisplayText(getPromptText(words[i])),
        correct: toDisplayText(getAnswerText(words[i])),
      });
    }
    return items;
  }

  function buildTrainingOptions(itemIndex) {
    var options = [];
    var wrongPool = [];
    var current = trainSession.items[itemIndex];

    options.push(current.correct);

    for (var i = 0; i < trainSession.items.length; i++) {
      if (i === itemIndex) continue;
      var candidate = trainSession.items[i].correct;
      if (!candidate || candidate === current.correct) continue;
      if (wrongPool.indexOf(candidate) === -1) wrongPool.push(candidate);
    }

    shuffleArray(wrongPool);
    for (var j = 0; j < wrongPool.length && options.length < 4; j++) {
      options.push(wrongPool[j]);
    }

    shuffleArray(options);
    return options;
  }

  function renderTrainingQuestion() {
    var current = trainSession.items[trainSession.index];
    var options = buildTrainingOptions(trainSession.index);

    trainProgress.textContent =
      "Word " + (trainSession.index + 1) + " / " + trainSession.items.length;
    trainPrompt.textContent = current.prompt;
    trainOptions.innerHTML = "";

    for (var i = 0; i < options.length; i++) {
      var optionText = options[i];
      var optionBtn = document.createElement("button");
      optionBtn.className = "train-option";
      optionBtn.textContent = String(i + 1) + ". " + optionText;
      (function (selected) {
        optionBtn.addEventListener("click", function () {
          answerTraining(selected);
        });
      })(optionText);
      trainOptions.appendChild(optionBtn);
    }

    trainSummary.className = "train-summary";
    trainSummary.innerHTML = "";
    trainMistakes.className = "train-mistakes";
    trainMistakes.innerHTML = "";
    trainActions.className = "train-actions";
  }

  function renderTrainingResults() {
    var total = trainSession.items.length;
    var mistakes = trainSession.mistakes;

    trainProgress.textContent = "Training complete";
    trainPrompt.textContent = "Results";
    trainOptions.innerHTML = "";

    trainSummary.className = "train-summary is-open";
    trainSummary.innerHTML = "";

    var scoreEl = document.createElement("div");
    scoreEl.className = "train-score";
    scoreEl.textContent = trainSession.correctCount + " / " + total + " correct";

    var subtitleEl = document.createElement("div");
    subtitleEl.className = "train-subtitle";
    subtitleEl.textContent = mistakes.length
      ? "Mistakes: " + mistakes.length
      : "No mistakes.";

    trainSummary.appendChild(scoreEl);
    trainSummary.appendChild(subtitleEl);

    trainMistakes.className = "train-mistakes is-open";
    trainMistakes.innerHTML = "";

    if (!mistakes.length) {
      var emptyEl = document.createElement("div");
      emptyEl.className = "train-empty";
      emptyEl.textContent = "All words answered correctly.";
      trainMistakes.appendChild(emptyEl);
    } else {
      for (var i = 0; i < mistakes.length; i++) {
        var row = document.createElement("div");
        row.className = "train-mistake-item";

        var promptEl = document.createElement("div");
        promptEl.className = "train-mistake-word";
        promptEl.textContent = mistakes[i].prompt;

        var answerEl = document.createElement("div");
        answerEl.className = "train-mistake-answer";
        answerEl.textContent = "Correct: " + mistakes[i].correct;

        row.appendChild(promptEl);
        row.appendChild(answerEl);
        trainMistakes.appendChild(row);
      }
    }

    trainActions.className = "train-actions is-open";
  }

  function renderTraining() {
    if (!trainSession) return;
    if (trainSession.finished) {
      renderTrainingResults();
      return;
    }
    renderTrainingQuestion();
  }

  function openTraining() {
    if (!words.length) return;
    stop();
    closeWordsList();
    if (document.body.classList.contains("board-mode")) setBoardMode(false);
    trainSession = {
      items: buildTrainingItems(),
      index: 0,
      correctCount: 0,
      mistakes: [],
      finished: false,
    };
    render();
  }

  function closeTraining() {
    if (!trainSession) return;
    trainSession = null;
    render();
  }

  function answerTraining(selected) {
    if (!trainSession || trainSession.finished) return;

    var current = trainSession.items[trainSession.index];
    if (selected === current.correct) {
      trainSession.correctCount += 1;
    } else {
      trainSession.mistakes.push({
        prompt: current.prompt,
        correct: current.correct,
      });
    }

    trainSession.index += 1;
    if (trainSession.index >= trainSession.items.length) {
      trainSession.finished = true;
    }
    render();
  }

  function renderWordsList() {
    if (!listBody) return;
    listBody.innerHTML = "";

    if (!words.length) {
      var emptyEl = document.createElement("div");
      emptyEl.className = "list-empty";
      emptyEl.textContent = "No words loaded";
      listBody.appendChild(emptyEl);
      return;
    }

    for (var i = 0; i < words.length; i++) {
      var row = document.createElement("div");
      row.className = "list-item" + (i === index ? " active" : "");

      var cellIndex = document.createElement("div");
      cellIndex.className = "list-item-index";
      cellIndex.textContent = String(i + 1) + ".";

      var cellKnown = document.createElement("div");
      cellKnown.className = "list-item-known";
      cellKnown.textContent = words[i].el || "—";

      var cellLearning = document.createElement("div");
      cellLearning.className = "list-item-learning";
      cellLearning.textContent = words[i].ru || "";

      row.appendChild(cellIndex);
      row.appendChild(cellKnown);
      row.appendChild(cellLearning);
      listBody.appendChild(row);
    }
  }

  function openWordsList() {
    if (!words.length || !listModal) return;
    isListOpen = true;
    renderWordsList();
    listModal.classList.add("is-open");
    listModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeWordsList() {
    if (!listModal) return;
    isListOpen = false;
    listModal.classList.remove("is-open");
    listModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function setBoardMode(on) {
    if (on) document.body.classList.add("board-mode");
    else document.body.classList.remove("board-mode");
    localStorage.setItem(K_BOARD, on ? "1" : "0");
    if (!on) {
      longTapTriggered = false;
    }
    applyTextSizes();
    updateUiState();
  }

  function startLongTapTimer() {
    if (!document.body.classList.contains("board-mode")) return;
    if (longTapTimer) clearTimeout(longTapTimer);
    longTapTriggered = false;
    longTapTimer = setTimeout(function () {
      longTapTriggered = true;
      setBoardMode(false);
    }, LONG_TAP_MS);
  }

  function clearLongTapTimer() {
    if (!longTapTimer) return;
    clearTimeout(longTapTimer);
    longTapTimer = null;
  }

  function stop() {
    isRunning = false;
    if (timerId) clearInterval(timerId);
    timerId = null;
    updateUiState();
  }

  function start() {
    if (!words.length || trainSession) return;
    stop();
    isRunning = true;

    var seconds = parseInt(intervalSelect.value, 10) || 300;
    timerId = setInterval(function () {
      index += 1;
      render();
    }, seconds * 1000);
    updateUiState();
  }

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
  }

  function stepBy(delta) {
    var wasRunning = isRunning;
    if (wasRunning) stop();
    index += delta;
    render();
    if (wasRunning) start();
  }

  // ---- CSV parsing (simple and reliable)
  // Supports:
  //  - 2 columns: KNOWN,LEARNING
  // Delimiter auto-detect: ; or ,
  function detectDelimiter(text) {
    var firstLine = text.split(/\r?\n/)[0] || "";
    var commas = (firstLine.match(/,/g) || []).length;
    var semis = (firstLine.match(/;/g) || []).length;
    return semis > commas ? ";" : ",";
  }

  function stripQuotes(s) {
    s = (s || "").trim();
    if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
      s = s.slice(1, -1);
      s = s.replace(/""/g, '"');
    }
    return s.trim();
  }

  function splitCsvLine(line, delim) {
    // Minimal parser with quoted values support
    var out = [];
    var cur = "";
    var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (ch === delim && !inQ) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map(stripQuotes);
  }

  function parseCsv(text) {
    var delim = detectDelimiter(text);
    var lines = text.split(/\r?\n/);
    var list = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      var cols = splitCsvLine(line, delim);

      if (cols.length === 2) {
        list.push({ el: cols[0], ru: cols[1] });
      }
    }
    return list;
  }

  // ---- Events
  fileInput.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (trainSession) closeTraining();

    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result || "");
      words = parseCsv(text);
      csvName = file.name || "Imported CSV";
      index = 0;
      setShuffledRecently(false);
      save();
      render();
      // Auto-start after loading
      start();
    };
    reader.readAsText(file, "utf-8");
  });

  btnStart.addEventListener("click", function () {
    start();
  });
  btnPause.addEventListener("click", function () {
    stop();
  });
  btnPrev.addEventListener("click", function () {
    stepBy(-1);
  });
  btnNext.addEventListener("click", function () {
    stepBy(1);
  });

  btnShuffle.addEventListener("click", function () {
    if (!words.length) return;
    stop();
    shuffleArray(words);
    index = 0;
    setShuffledRecently(true);
    save();
    render();
  });

  if (btnList) {
    btnList.addEventListener("click", function () {
      openWordsList();
    });
  }

  if (btnTrain) {
    btnTrain.addEventListener("click", function () {
      if (trainSession) {
        closeTraining();
        return;
      }
      openTraining();
    });
  }

  btnSwap.addEventListener("click", function () {
    if (!words.length) return;
    stop();
    isSwapped = !isSwapped;
    localStorage.setItem(K_SWAP, isSwapped ? "1" : "0");
    render();
  });

  btnTheme.addEventListener("click", function () {
    applyTheme(theme === "light" ? "dark" : "light");
    localStorage.setItem(K_THEME, theme);
    updateUiState();
  });

  btnReset.addEventListener("click", function () {
    stop();
    trainSession = null;
    words = [];
    csvName = "";
    index = 0;
    setShuffledRecently(false);
    localStorage.removeItem(K_WORDS);
    localStorage.removeItem(K_INDEX);
    localStorage.removeItem(K_CSV_NAME);
    fileInput.value = "";
    closeWordsList();
    render();
  });

  intervalSelect.addEventListener("change", function () {
    localStorage.setItem(K_INTERVAL, intervalSelect.value);
    if (isRunning) start(); // restart timer
  });

  knownSizeSelect.addEventListener("change", applyKnownSizeInput);
  knownSizeSelect.addEventListener("blur", applyKnownSizeInput);

  learningSizeSelect.addEventListener("change", applyLearningSizeInput);
  learningSizeSelect.addEventListener("blur", applyLearningSizeInput);

  btnBoard.addEventListener("click", function () {
    var on = !document.body.classList.contains("board-mode");
    setBoardMode(on);
  });

  if (btnListClose) {
    btnListClose.addEventListener("click", function () {
      closeWordsList();
    });
  }

  if (btnTrainRestart) {
    btnTrainRestart.addEventListener("click", function () {
      openTraining();
    });
  }

  if (btnTrainClose) {
    btnTrainClose.addEventListener("click", function () {
      closeTraining();
    });
  }

  if (listModal) {
    listModal.addEventListener("click", function (e) {
      if (e.target === listModal) closeWordsList();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.keyCode === 27) {
      if (isListOpen) {
        closeWordsList();
        return;
      }
      if (trainSession) closeTraining();
    }
  });

  // Tap in board mode:
  // left half = previous card, right half = next card
  card.addEventListener("click", function (e) {
    if (!document.body.classList.contains("board-mode")) return;
    if (longTapTriggered) {
      longTapTriggered = false;
      return;
    }

    var rect = card.getBoundingClientRect();
    var isLeft = e.clientX < rect.left + rect.width / 2;
    stepBy(isLeft ? -1 : 1);
  });

  card.addEventListener("touchstart", function () {
    startLongTapTimer();
  });
  card.addEventListener("touchend", function () {
    clearLongTapTimer();
  });
  card.addEventListener("touchcancel", function () {
    clearLongTapTimer();
  });
  card.addEventListener("mousedown", function () {
    startLongTapTimer();
  });
  card.addEventListener("mouseup", function () {
    clearLongTapTimer();
  });
  card.addEventListener("mouseleave", function () {
    clearLongTapTimer();
  });

  // ---- Service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
  }

  // ---- init
  load();
  render();
})();
