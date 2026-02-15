(function () {
  // ---- DOM
  var elWord = document.getElementById("word");
  var elTranslation = document.getElementById("translation");
  var elMeta = document.getElementById("meta");
  var elStatus = document.getElementById("status");

  var fileInput = document.getElementById("fileInput");

  var btnStart = document.getElementById("btnStart");
  var btnPause = document.getElementById("btnPause");
  var btnPrev = document.getElementById("btnPrev");
  var btnNext = document.getElementById("btnNext");
  var btnShuffle = document.getElementById("btnShuffle");
  var btnSwap = document.getElementById("btnSwap");
  var btnTheme = document.getElementById("btnTheme");
  var btnReset = document.getElementById("btnReset");
  var btnBoard = document.getElementById("btnBoard");
  var card = document.getElementById("card");

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

  // ---- State
  var words = []; // {el, ru}
  var index = 0;
  var timerId = null;
  var isRunning = false;
  var longTapTimer = null;
  var longTapTriggered = false;
  var lastTapAt = 0;
  var isSwapped = false;
  var shuffledRecently = false;
  var shuffledTimer = null;
  var knownSize = 56;
  var learningSize = 24;
  var theme = "dark";

  var LONG_TAP_MS = 900;
  var DOUBLE_TAP_MS = 320;

  // ---- Helpers
  function save() {
    localStorage.setItem(K_WORDS, JSON.stringify(words));
    localStorage.setItem(K_INDEX, String(index));
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

    knownSize = normalizeSize(localStorage.getItem(K_SIZE_KNOWN) || "56", 56);
    learningSize = normalizeSize(
      localStorage.getItem(K_SIZE_LEARNING) || "24",
      24,
    );
    knownSizeSelect.value = String(knownSize);
    learningSizeSelect.value = String(learningSize);
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
    knownSize = normalizeSize(knownSizeSelect.value || String(knownSize), 56);
    knownSizeSelect.value = String(knownSize);
    localStorage.setItem(K_SIZE_KNOWN, String(knownSize));
    render();
  }

  function applyLearningSizeInput() {
    learningSize = normalizeSize(
      learningSizeSelect.value || String(learningSize),
      24,
    );
    learningSizeSelect.value = String(learningSize);
    localStorage.setItem(K_SIZE_LEARNING, String(learningSize));
    render();
  }

  function updateUiState() {
    var hasWords = words.length > 0;
    var isBoard = document.body.classList.contains("board-mode");
    var statusParts = [];

    btnStart.disabled = !hasWords || isRunning;
    btnPause.disabled = !hasWords || !isRunning;
    btnPrev.disabled = !hasWords;
    btnNext.disabled = !hasWords;
    btnShuffle.disabled = !hasWords;
    btnSwap.disabled = !hasWords;
    btnReset.disabled = !hasWords;

    setButtonActive(btnStart, hasWords && isRunning);
    setButtonActive(btnPause, hasWords && !isRunning);
    setButtonActive(btnBoard, isBoard);
    setButtonActive(btnShuffle, shuffledRecently);
    setButtonActive(btnSwap, hasWords && isSwapped);
    setButtonActive(btnTheme, theme === "light");

    if (!hasWords) {
      elStatus.textContent = "No data loaded";
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

    if (!words.length) {
      elWord.textContent = "Upload CSV";
      elTranslation.textContent = "Known + Learning";
      setMeta();
      updateUiState();
      return;
    }

    if (index < 0) index = words.length - 1;
    if (index >= words.length) index = 0;

    var item = words[index];

    // Show known language on top and learning language below.
    var source = item.el || "";
    var target = item.ru || "";
    var top = source;
    var bottom = target;

    if (isSwapped) {
      top = target;
      bottom = source;
    } else {
      top = source;
      bottom = target;
    }

    elWord.textContent = top || "—";
    elTranslation.textContent = bottom ? bottom : " ";
    setMeta();
    save();
    updateUiState();
  }

  function setBoardMode(on) {
    if (on) document.body.classList.add("board-mode");
    else document.body.classList.remove("board-mode");
    localStorage.setItem(K_BOARD, on ? "1" : "0");
    if (!on) {
      lastTapAt = 0;
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
    if (!words.length) return;
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

    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result || "");
      words = parseCsv(text);
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
    words = [];
    index = 0;
    setShuffledRecently(false);
    localStorage.removeItem(K_WORDS);
    localStorage.removeItem(K_INDEX);
    fileInput.value = "";
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

  // Tap in board mode:
  // left half = previous card, right half = next card
  card.addEventListener("click", function (e) {
    if (!document.body.classList.contains("board-mode")) return;
    if (longTapTriggered) {
      longTapTriggered = false;
      return;
    }

    var now = Date.now();
    if (now - lastTapAt <= DOUBLE_TAP_MS) {
      setBoardMode(false);
      return;
    }
    lastTapAt = now;

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
