<script setup lang="ts">
import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  CalendarCheck,
  ChevronLeft,
  CircleHelp,
  ClipboardList,
  DoorOpen,
  Gavel,
  Home,
  MessageCircle,
  Play,
  Plus,
  Send,
  Shield,
  Store,
  Trophy,
  UserRound,
  Users,
  Vote,
  Wifi
} from "@lucide/vue";
import { computed, onBeforeUnmount, ref } from "vue";
import type {
  DanmakuSentiment,
  GameRoomType,
  MarketPhase,
  MarketStock,
  PositionAmountLevel,
  RetailToolType,
  RetailWarningDanmakuType,
  RoomPlayer,
  RoomSnapshot,
  SubmitActionClientPayload
} from "./types";
import { GameSocket, type ClientEvent } from "./ws";

type ActionButton = {
  actionType: string;
  action: string;
  label: string;
  tone?: "buy" | "sell" | "warn" | "main";
};

type BottomTab = "home" | "market" | "holding" | "community" | "mine";

const defaultSocketUrl = import.meta.env.VITE_WS_URL ?? "ws://localhost:8787";

const socketUrl = ref(defaultSocketUrl);
const nickname = ref(`被套显眼包${Math.floor(Math.random() * 900 + 100)}`);
const joinRoomId = ref("");
const roomType = ref<GameRoomType>("STANDARD_20");
const connected = ref(false);
const errorText = ref("");
const room = ref<RoomSnapshot>();
const danmakuText = ref("我宣布这根线在表演抽象行为艺术。");
const danmakuSentiment = ref<DanmakuSentiment>("neutral");
const selectedVoteTarget = ref("");
const activeTab = ref<BottomTab>("home");
const now = ref(Date.now());

let socket = createSocket(socketUrl.value);
const ticker = window.setInterval(() => {
  now.value = Date.now();
}, 500);

onBeforeUnmount(() => {
  window.clearInterval(ticker);
  socket.disconnect();
});

const roomTypes: Array<{ value: GameRoomType; label: string; caption: string }> = [
  { value: "QUICK_10", label: "三分钟嘴硬房", caption: "输赢全靠嘴硬" },
  { value: "STANDARD_20", label: "五日装懂房", caption: "标准抽象局" },
  { value: "LONG_30", label: "全市场发癫房", caption: "适合精神稳定型玩家" }
];

const phaseLabels: Record<MarketPhase, string> = {
  PRE_NEWS: "盘前玄学播报",
  MUTATION: "突然开始抽象",
  INSTITUTION_PRIVATE_ROOM: "主力关门憋坏水",
  AUCTION_FREE: "集合竞价可撤，嘴也可硬",
  AUCTION_LOCKED: "锁单了，别装没点",
  OPEN_PRICE: "开盘揭锅",
  MORNING_TRADING: "早盘心电图",
  MIDDAY_ROTATION: "午间甩锅轮动",
  AFTERNOON_TRADING: "午后继续嘴硬",
  CLOSING_RUSH: "尾盘灵魂出窍",
  CLOSE: "收盘验尸",
  FOCUS_VOTE: "龙虎榜抓显眼包",
  DAY_RECAP: "今日尴尬复盘",
  CONTINUOUS_TRADING: "连续嘴硬竞价",
  LIMIT_BOARD: "涨跌停蹦迪",
  VOTE: "全场投锅",
  REGULATION_INQUIRY: "小黑屋写检讨",
  DAY_RESULT: "交易日离谱结果"
};

const regulationLabels: Record<string, string> = {
  normal: "表面正常",
  risk_warning: "开始冒烟",
  key_monitoring: "被盯上了",
  suspension_warning: "门口有动静",
  black_room: "进屋写检讨"
};

const fallbackStocks: MarketStock[] = [
  {
    id: "stock-scallion",
    name: "葱花假动作",
    element: "木",
    currentPrice: 10.05,
    changePercent: 5.26,
    tags: ["人气很吵", "T+1卡门"],
    isLimitUp: false,
    isLimitDown: false,
    boardStrength: 68,
    boardBreakRisk: 31,
    tPlusOneCrowdedness: 62,
    quantAttention: 38,
    regulationAttention: 24
  },
  {
    id: "stock-noodle",
    name: "泡面补仓王",
    element: "火",
    currentPrice: 8.88,
    changePercent: -1.23,
    tags: ["后排举手", "量化偷看"],
    isLimitUp: false,
    isLimitDown: false,
    boardStrength: 25,
    boardBreakRisk: 54,
    tPlusOneCrowdedness: 40,
    quantAttention: 61,
    regulationAttention: 18
  },
  {
    id: "stock-platform",
    name: "月台等车股",
    element: "土",
    currentPrice: 12.3,
    changePercent: 2.35,
    tags: ["中军嘴硬", "轮动迷路"],
    isLimitUp: false,
    isLimitDown: false,
    boardStrength: 52,
    boardBreakRisk: 22,
    tPlusOneCrowdedness: 34,
    quantAttention: 28,
    regulationAttention: 15
  }
];
const fallbackLeadStock = fallbackStocks[0] as MarketStock;
const selectedStockId = ref(fallbackLeadStock.id);
const selectedAmountLevel = ref<PositionAmountLevel>("normal");
const selectedToolType = ref<RetailToolType>("LEEK_RADAR");
const selectedWarningType = ref<RetailWarningDanmakuType>("WARN_RISK");

const amountOptions: Array<{ value: PositionAmountLevel; label: string }> = [
  { value: "light", label: "轻仓试探" },
  { value: "normal", label: "正常嘴硬" },
  { value: "heavy", label: "重仓上头" }
];

const retailToolButtons: Array<{ toolType: RetailToolType; label: string }> = [
  { toolType: "LEEK_RADAR", label: "韭菜雷达" },
  { toolType: "QUANT_SNIFFER", label: "量化闻味器" },
  { toolType: "FAKE_ORDER_MIRROR", label: "假单照妖镜" },
  { toolType: "CORE_THERMOMETER", label: "中军体温计" }
];

const warningDanmakuButtons: Array<{ warningType: RetailWarningDanmakuType; label: string }> = [
  { warningType: "WARN_T_PLUS_ONE", label: "T+1预警" },
  { warningType: "WARN_QUANT", label: "量化预警" },
  { warningType: "CALLOUT_FAKE_ORDER", label: "假单点名" },
  { warningType: "WARN_CORE_DIVE", label: "中军跳水" }
];

const actionGroups = computed<ActionButton[]>(() => {
  const phase = room.value?.phase;
  const role = selfPlayer.value?.role;

  if (phase === "AUCTION_FREE" || phase === "AUCTION_LOCKED") {
    const retailActions: ActionButton[] = [
      { actionType: "auction", action: "TOP_LIMIT_BUY", label: "头铁梭一嘴", tone: "buy" },
      { actionType: "auction", action: "HIGH_OPEN_BUY", label: "追高不眨眼", tone: "buy" },
      { actionType: "auction", action: "FLAT", label: "假装很冷静" },
      { actionType: "auction", action: "LIMIT_SELL", label: "先跑为敬", tone: "sell" }
    ];
    const institutionActions: ActionButton[] =
      role === "institution"
        ? [
            { actionType: "auction", action: "FAKE_LIMIT_BUY", label: "假装很有钱", tone: "main" },
            { actionType: "auction", action: "FAKE_LIMIT_SELL", label: "假装很凶", tone: "main" },
            { actionType: "auction", action: "REAL_LIMIT_BUY", label: "真掏兜", tone: "main" },
            { actionType: "auction", action: "REAL_LIMIT_SELL", label: "真掀桌", tone: "main" }
          ]
        : [];
    const cancel: ActionButton[] =
      phase === "AUCTION_FREE"
        ? [{ actionType: "auction", action: "CANCEL_AUCTION_ORDER", label: "撤，刚才手滑", tone: "warn" }]
        : [];
    return [...retailActions, ...institutionActions, ...cancel];
  }

  if (
    phase === "INSTITUTION_PRIVATE_ROOM" ||
    phase === "MORNING_TRADING" ||
    phase === "AFTERNOON_TRADING" ||
    phase === "CLOSING_RUSH" ||
    phase === "CONTINUOUS_TRADING"
  ) {
    if (role === "institution") {
      return [
        { actionType: "intraday", action: "DRAW_PIE", label: "画超级大饼", tone: "main" },
        { actionType: "intraday", action: "SCARE", label: "吓到弹幕闭嘴", tone: "main" },
        { actionType: "intraday", action: "IGNITE", label: "点火冒烟", tone: "main" },
        { actionType: "intraday", action: "SMASH", label: "掀桌文学", tone: "main" },
        { actionType: "intraday", action: "SHAKE_OUT", label: "甩掉嘴硬王", tone: "main" },
        { actionType: "intraday", action: "SHIP", label: "收网装无辜", tone: "main" },
        { actionType: "intraday", action: "PRY_FLOOR", label: "撬地板蹦迪", tone: "main" }
      ];
    }

    return [
      { actionType: "intraday", action: "TAKE_OFF", label: "冲！脑子先下班", tone: "buy" },
      { actionType: "intraday", action: "BURY", label: "反向埋自己", tone: "sell" },
      { actionType: "intraday", action: "PLAY_DEAD", label: "装死保平安" },
      { actionType: "intraday", action: "RUN_AWAY", label: "光速跑路", tone: "warn" },
      { actionType: "intraday", action: "HOLD", label: "嘴硬格局" }
    ];
  }

  return [];
});

const primaryActions = computed(() => actionGroups.value.slice(0, 3));
const secondaryActions = computed(() => actionGroups.value.slice(3));

const canVote = computed(
  () =>
    room.value?.phase === "FOCUS_VOTE" ||
    room.value?.phase === "VOTE" ||
    room.value?.phase === "REGULATION_INQUIRY"
);

const canSendDanmaku = computed(() => room.value?.status === "playing");

const selfPlayer = computed(() => {
  const currentRoom = room.value;
  if (currentRoom === undefined) return undefined;
  return (
    currentRoom.players.find((player) => player.nickname === nickname.value && !player.isBot) ??
    currentRoom.players.find((player) => player.role !== undefined && !player.isBot) ??
    currentRoom.players.find((player) => !player.isBot)
  );
});

const isHost = computed(() => selfPlayer.value?.id === room.value?.hostPlayerId);

const isInstitutionView = computed(() => selfPlayer.value?.role === "institution");

const phasePercent = computed(() => {
  const currentRoom = room.value;
  if (currentRoom?.phaseStartedAt === undefined || currentRoom.phaseEndsAt === undefined) return 0;
  const duration = currentRoom.phaseEndsAt - currentRoom.phaseStartedAt;
  if (duration <= 0) return 100;
  return Math.min(100, Math.max(0, ((now.value - currentRoom.phaseStartedAt) / duration) * 100));
});

const phaseRemaining = computed(() => {
  const endsAt = room.value?.phaseEndsAt;
  if (endsAt === undefined) return "--";
  return `${Math.max(0, Math.ceil((endsAt - now.value) / 1000))}s`;
});

const phaseName = computed(() => {
  const phase = room.value?.phase;
  return phase === undefined ? "未开局" : phaseLabels[phase] ?? phase;
});

const visibleStocks = computed(() => {
  const sectors = room.value?.market?.sectors ?? [];
  const stocks = sectors.flatMap((sector) => sector.stocks);
  return stocks.length > 0 ? stocks : fallbackStocks;
});

const leadStock = computed<MarketStock>(
  () => visibleStocks.value.find((stock) => stock.id === selectedStockId.value) ?? visibleStocks.value[0] ?? fallbackLeadStock
);

const topStocks = computed(() =>
  [...visibleStocks.value].sort((left, right) => right.changePercent - left.changePercent).slice(0, 5)
);

const latestLogs = computed(() => [...(room.value?.logs ?? [])].slice(-4).reverse());
const latestDanmaku = computed(() => [...(room.value?.danmaku ?? [])].slice(-5).reverse());
const chaosSubtitle = computed(() =>
  isInstitutionView.value ? "信息全面，良心暂时下线" : "信息有限，嘴硬无限"
);
const panicLine = computed(() =>
  isInstitutionView.value ? "市场不是提款机，是大型表情管理考试。" : "别急，分时图只是把心率画出来了。"
);
const friendlyErrorText = computed(() => {
  if (errorText.value.includes("INVALID_PHASE")) {
    return "手速太快了，当前阶段不收这个抽象动作。";
  }
  return errorText.value;
});
const chartSpeechLine = computed(() =>
  isInstitutionView.value ? "我只是轻轻拨了一下锅。" : "我抗得住，我装的。"
);

const chartPath = computed(() => {
  const base = [
    86, 80, 75, 54, 58, 36, 48, 44, 61, 56, 50, 54, 38, 42, 47, 43, 34, 30, 24, 20
  ];
  const boost = Math.max(-16, Math.min(16, leadStock.value.changePercent * 2));
  const points = base.map((y, index) => {
    const x = 10 + index * 15;
    const wave = Math.sin(index * 1.25) * 5;
    return `${x},${Math.max(12, Math.min(92, y - boost + wave))}`;
  });
  return points.join(" ");
});

const playerCountText = computed(() => `${room.value?.players.length ?? 0}/8`);

function reconnect(): void {
  socket.disconnect();
  socket = createSocket(socketUrl.value);
  socket.connect();
}

function createRoom(): void {
  errorText.value = "";
  socket.send("room:create", {
    nickname: nickname.value.trim() || "韭菜观察员",
    roomType: roomType.value
  });
}

function joinRoom(): void {
  errorText.value = "";
  socket.send("room:join", {
    roomId: joinRoomId.value.trim(),
    nickname: nickname.value.trim() || "韭菜观察员"
  });
}

function addBot(): void {
  socket.send("room:addBot", room.value === undefined ? {} : { roomId: room.value.id });
}

function ready(): void {
  socket.send("room:ready", { ready: true });
}

function startGame(): void {
  socket.send("game:start", {
    ...(room.value === undefined ? {} : { roomId: room.value.id }),
    roomType: roomType.value
  });
}

function submitAction(actionType: string, action: string): void {
  socket.send("game:submitAction", buildSubmitActionPayload(actionType, action));
}

function submitRetailToolAction(toolType: RetailToolType, warningType?: RetailWarningDanmakuType): void {
  selectedToolType.value = toolType;
  if (warningType !== undefined) {
    selectedWarningType.value = warningType;
  }
  socket.send("game:submitAction", {
    actionType: "retailTool",
    action: toolType,
    stockId: selectedStockId.value,
    toolType,
    ...(warningType === undefined ? {} : { warningType })
  } satisfies SubmitActionClientPayload);
}

function buildSubmitActionPayload(actionType: string, action: string): SubmitActionClientPayload {
  return {
    actionType,
    action,
    stockId: selectedStockId.value,
    amountLevel: selectedAmountLevel.value
  };
}

function selectStock(stockId: string): void {
  selectedStockId.value = stockId;
}

function submitVote(): void {
  if (selectedVoteTarget.value.length === 0 || room.value === undefined) return;
  socket.send("game:submitAction", {
    actionType: room.value.phase === "REGULATION_INQUIRY" ? "regulationVote" : "vote",
    action: "vote",
    targetPlayerId: selectedVoteTarget.value
  });
}

function sendDanmaku(): void {
  const text = danmakuText.value.trim();
  if (text.length === 0) return;
  socket.send("danmaku:send", {
    text,
    sentiment: danmakuSentiment.value
  });
  danmakuText.value = "";
}

function createSocket(url: string): GameSocket {
  return new GameSocket(url, handleSocketEvent);
}

function handleSocketEvent(event: ClientEvent): void {
  if (event.type === "open") {
    connected.value = true;
    return;
  }

  if (event.type === "close") {
    connected.value = false;
    return;
  }

  if (event.type === "room") {
    room.value = event.room;
    selectedVoteTarget.value =
      event.room.players.find((player) => player.id !== selfPlayer.value?.id)?.id ?? "";
    const firstStock = event.room.market?.sectors?.flatMap((sector) => sector.stocks)[0];
    if (firstStock !== undefined && !visibleStocks.value.some((stock) => stock.id === selectedStockId.value)) {
      selectedStockId.value = firstStock.id;
    }
    return;
  }

  if (event.type === "phase" && room.value !== undefined) {
    room.value = {
      ...room.value,
      day: event.day || room.value.day,
      phase: event.phase as MarketPhase,
      ...(event.virtualTime === undefined ? {} : { virtualTime: event.virtualTime }),
      ...(event.durationMs === undefined
        ? {}
        : {
            phaseStartedAt: Date.now(),
            phaseEndsAt: Date.now() + event.durationMs
          })
    };
    return;
  }

  if (event.type === "error") {
    errorText.value = `${event.code}: ${event.message}`;
  }
}

function playerRoleLabel(player: RoomPlayer): string {
  if (room.value?.status === "finished" || player.role === "institution") return "主力";
  if (player.role === "retail") return "韭菜";
  return "身份隐藏";
}

function percent(value: number | undefined): string {
  const fixed = Math.round((value ?? 0) * 100) / 100;
  return `${fixed > 0 ? "+" : ""}${fixed}%`;
}

function signedNumber(value: number | undefined): string {
  const fixed = Math.round((value ?? 0) * 100) / 100;
  return `${fixed > 0 ? "+" : ""}${fixed}`;
}
</script>

<template>
  <main class="page">
    <section class="phone-frame" :class="{ institution: isInstitutionView }">
      <section v-if="room === undefined" class="screen landing-screen">
        <div class="side-buttons left">
          <button type="button" title="公告">
            <Shield :size="18" />
            <span>公告</span>
          </button>
          <button type="button" title="排行榜">
            <Trophy :size="18" />
            <span>排行</span>
          </button>
        </div>
        <div class="side-buttons right">
          <button type="button" title="签到">
            <CalendarCheck :size="18" />
            <span>签到</span>
          </button>
        </div>

        <div class="cloud cloud-one"></div>
        <div class="cloud cloud-two"></div>
        <div class="landing-title">
          <span>虚构娱乐模拟，不要拿去当人生建议</span>
          <h1>韭菜保卫战</h1>
          <strong>大A抽象局</strong>
          <p>8 人同局，嘴硬入场，体面离场</p>
        </div>

        <div class="market-creature">
          <div class="creature-scream">我又上头了</div>
          <div class="candle-body"></div>
          <div class="candle-eye left"></div>
          <div class="candle-eye right"></div>
          <div class="candle-mouth"></div>
          <span class="candle-line one"></span>
          <span class="candle-line two"></span>
          <span class="candle-line three"></span>
        </div>

        <section class="entry-card">
          <label>
            昵称
            <input v-model="nickname" maxlength="12" />
          </label>
          <label>
            房间类型
            <select v-model="roomType">
              <option v-for="item in roomTypes" :key="item.value" :value="item.value">
                {{ item.label }} · {{ item.caption }}
              </option>
            </select>
          </label>
          <button class="hero-button quick" type="button" @click="createRoom">
            <Play :size="22" />
            立刻发癫开局
          </button>
          <button class="hero-button create" type="button" @click="createRoom">
            <Plus :size="22" />
            创建嘴硬房
          </button>
          <button class="hero-button help" type="button">
            <CircleHelp :size="22" />
            玩法说明
          </button>
          <div class="join-line">
            <input v-model="joinRoomId" placeholder="room_xxx" aria-label="房间号" />
            <button type="button" @click="joinRoom">
              <DoorOpen :size="18" />
            </button>
          </div>
        </section>

        <footer class="compliance-ribbon">虚构娱乐模拟：盘面很抽象，现实别模仿</footer>
      </section>

      <section v-else-if="room.status === 'lobby'" class="screen room-screen">
        <header class="mobile-top">
          <button type="button" title="返回">
            <ChevronLeft :size="20" />
          </button>
          <div>
            <span>房间号 {{ room.id }}</span>
            <strong>保卫小队正在装懂</strong>
          </div>
          <button type="button" title="连接" @click="reconnect">
            <Wifi :size="18" />
          </button>
        </header>

        <section class="room-stage">
          <p>服务端偷偷发牌，大家假装没慌</p>
          <h2>{{ playerCountText }} 个嘴硬单位</h2>
          <div class="seat-wheel">
            <article
              v-for="(player, index) in room.players"
              :key="player.id"
              class="seat"
              :style="{ '--seat-index': index }"
            >
              <span>{{ player.isBot ? "B" : player.nickname.slice(0, 1) }}</span>
              <small>{{ player.isHost ? "房主" : player.ready ? "已备" : "等待" }}</small>
            </article>
          </div>
        </section>

        <section class="room-list panel">
          <h3>谁在装懂名单</h3>
          <div v-for="player in room.players" :key="player.id" class="room-player">
            <span>{{ player.nickname }}</span>
            <b>{{ player.isBot ? "Bot" : player.isHost ? "房主" : "玩家" }}</b>
          </div>
        </section>

        <section class="room-actions">
          <button type="button" @click="ready">
            <Shield :size="18" />
            我准备好嘴硬了
          </button>
          <button type="button" @click="addBot">
            <Bot :size="18" />
            拉个自动背锅侠
          </button>
          <button class="start" type="button" :disabled="!isHost" @click="startGame">
            <Play :size="18" />
            开始集体抽象
          </button>
        </section>
      </section>

      <section v-else class="screen game-screen">
        <header class="game-top">
          <button type="button" title="返回">
            <ChevronLeft :size="20" />
          </button>
          <div>
            <span>第 {{ room.day }}/{{ room.maxDays }} 交易日</span>
            <strong>{{ phaseName }}</strong>
          </div>
          <time>{{ room.virtualTime || "--:--" }}</time>
        </header>

        <section class="phase-strip">
          <div>
            <span>{{ phaseRemaining }}</span>
            <b>{{ connected ? "已连接" : "未连接" }}</b>
          </div>
          <div class="phase-track">
            <span :style="{ width: `${phasePercent}%` }"></span>
          </div>
        </section>

        <section class="identity-card" :class="{ main: isInstitutionView }">
          <div class="sprout-avatar">
            <span>{{ isInstitutionView ? "主" : "韭" }}</span>
          </div>
          <div>
            <p>{{ chaosSubtitle }}</p>
            <h2>{{ selfPlayer?.nickname ?? nickname }}</h2>
            <small>{{ playerRoleLabel(selfPlayer ?? room.players[0]!) }}</small>
          </div>
          <dl>
            <dt>本金值</dt>
            <dd>{{ Math.round(selfPlayer?.capital ?? 0) }}</dd>
            <dt>信心值</dt>
            <dd>{{ selfPlayer?.confidence ?? 0 }}</dd>
          </dl>
        </section>

        <section class="stock-board panel">
          <div class="stock-head">
            <div>
              <h2>{{ leadStock.name }}</h2>
              <span>{{ phaseName }}</span>
            </div>
            <strong :class="{ red: leadStock.changePercent >= 0, green: leadStock.changePercent < 0 }">
              {{ leadStock.currentPrice.toFixed(2) }}
            </strong>
            <b :class="{ red: leadStock.changePercent >= 0, green: leadStock.changePercent < 0 }">
              {{ percent(leadStock.changePercent) }}
            </b>
          </div>

          <div class="chart-wrap">
            <div class="chaos-stamp">心电图式分时</div>
            <svg viewBox="0 0 300 120" aria-label="虚构分时图">
              <line x1="8" y1="20" x2="292" y2="20" />
              <line x1="8" y1="60" x2="292" y2="60" />
              <line x1="8" y1="100" x2="292" y2="100" />
              <polyline :points="chartPath" />
            </svg>
            <div class="chart-speech">{{ chartSpeechLine }}</div>
            <div class="chart-mascot">
              <span>韭</span>
              <b>嘴硬中</b>
            </div>
            <div class="chart-times">
              <span>09:15</span>
              <span>11:30/13:00</span>
              <span>15:00</span>
            </div>
          </div>

          <div class="price-tags">
            <span class="up">天花板 {{ room.market?.limitUpPrice?.toFixed?.(2) ?? "11.00" }}</span>
            <span class="down">地板砖 {{ room.market?.limitDownPrice?.toFixed?.(2) ?? "9.00" }}</span>
          </div>
        </section>

        <section v-if="activeTab === 'home'" class="trade-console panel">
          <div class="console-top">
            <div>
              <span>还能嘴硬的本金值</span>
              <strong>{{ Math.round(selfPlayer?.capital ?? 0) }}</strong>
            </div>
            <div>
              <span>小黑屋门铃</span>
              <strong>{{ room.market?.regulationHeat ?? 0 }}/100</strong>
            </div>
          </div>

          <div class="trade-pickers">
            <div>
              <span>目标票</span>
              <strong>{{ leadStock.name }}</strong>
            </div>
            <div class="amount-switch">
              <button
                v-for="item in amountOptions"
                :key="item.value"
                type="button"
                :class="{ active: selectedAmountLevel === item.value }"
                @click="selectedAmountLevel = item.value"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <div class="primary-actions">
            <button
              v-for="item in primaryActions"
              :key="item.action"
              type="button"
              :class="item.tone"
              @click="submitAction(item.actionType, item.action)"
            >
              {{ item.label }}
            </button>
          </div>
          <div class="secondary-actions">
            <button
              v-for="item in secondaryActions"
              :key="item.action"
              type="button"
              :class="item.tone"
              @click="submitAction(item.actionType, item.action)"
            >
              {{ item.label }}
            </button>
          </div>
          <p v-if="actionGroups.length === 0">{{ panicLine }}</p>

          <div v-if="!isInstitutionView" class="retail-toolbox">
            <div class="tool-grid">
              <button
                v-for="item in retailToolButtons"
                :key="item.toolType"
                type="button"
                :class="{ active: selectedToolType === item.toolType }"
                @click="submitRetailToolAction(item.toolType)"
              >
                {{ item.label }}
              </button>
            </div>
            <div class="warning-grid">
              <button
                v-for="item in warningDanmakuButtons"
                :key="item.warningType"
                type="button"
                :class="{ active: selectedWarningType === item.warningType }"
                @click="submitRetailToolAction('WARNING_DANMAKU', item.warningType)"
              >
                预警弹幕 · {{ item.label }}
              </button>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'market'" class="panel info-panel">
          <h3>抽象榜单</h3>
          <article
            v-for="stock in topStocks"
            :key="stock.id"
            class="stock-row selectable"
            :class="{ selected: selectedStockId === stock.id }"
            role="button"
            tabindex="0"
            @click="selectStock(stock.id)"
            @keydown.enter="selectStock(stock.id)"
          >
            <span>{{ stock.name }}</span>
            <b :class="{ red: stock.changePercent >= 0, green: stock.changePercent < 0 }">
              {{ percent(stock.changePercent) }}
            </b>
            <small>{{ stock.tags.slice(0, 2).join(" / ") || "虚构观察" }}</small>
          </article>
        </section>

        <section v-if="activeTab === 'holding'" class="panel info-panel">
          <h3>谁还在嘴硬</h3>
          <article v-for="player in room.players" :key="player.id" class="stock-row">
            <span>{{ player.nickname }}</span>
            <b>{{ Math.round(player.capital) }}</b>
            <small>{{ playerRoleLabel(player) }} · {{ player.alive ? "在场" : "离场" }}</small>
          </article>
        </section>

        <section v-if="activeTab === 'community'" class="panel danmaku-panel">
          <div class="panel-title">
            <h3>弹幕发癫区</h3>
            <MessageCircle :size="18" />
          </div>
          <div class="danmaku-list">
            <p v-for="item in latestDanmaku" :key="item.id" :class="item.sentiment">
              {{ item.text }}
            </p>
          </div>
          <div class="danmaku-input">
            <select v-model="danmakuSentiment">
              <option value="neutral">装冷静</option>
              <option value="bullish">上头</option>
              <option value="bearish">嘴硬看空</option>
              <option value="suspicious">甩锅</option>
              <option value="panic">破防</option>
            </select>
            <textarea v-model="danmakuText" maxlength="60"></textarea>
            <button type="button" :disabled="!canSendDanmaku" @click="sendDanmaku">
              <Send :size="18" />
              发送
            </button>
          </div>
        </section>

        <section v-if="activeTab === 'mine'" class="panel info-panel">
          <h3>我的嘴硬报告</h3>
          <p>{{ room.market?.mutation || room.market?.news || "等待服务端推送虚构盘面播报。" }}</p>
          <p>监管状态：{{ regulationLabels[room.market?.regulationState ?? "normal"] }}</p>
          <p>ROI：{{ percent(selfPlayer?.roi) }}</p>
          <p>今日面子变化：{{ signedNumber((selfPlayer?.capital ?? 0) - (selfPlayer?.initialCapital ?? 0)) }}</p>
        </section>

        <section v-if="canVote" class="vote-card panel">
          <div class="panel-title">
            <h3>{{ room.phase === "REGULATION_INQUIRY" ? "小黑屋写检讨" : "投出今日显眼包" }}</h3>
            <Vote :size="18" />
          </div>
          <select v-model="selectedVoteTarget">
            <option v-for="player in room.players" :key="player.id" :value="player.id">
              {{ player.nickname }}
            </option>
          </select>
          <button type="button" @click="submitVote">把锅递过去</button>
        </section>

        <section v-if="isInstitutionView" class="main-toolbox panel">
          <h3>主力坏水工具箱</h3>
          <div>
            <button type="button" @click="submitAction('intraday', 'DRAW_PIE')">
              <Building2 :size="17" />
              维护表情
            </button>
            <button type="button" @click="submitAction('intraday', 'IGNITE')">
              <Activity :size="17" />
              点火冒烟
            </button>
            <button type="button" @click="submitAction('intraday', 'SHIP')">
              <ClipboardList :size="17" />
              放点风声
            </button>
          </div>
        </section>

        <section v-if="room.status === 'finished'" class="result-card panel">
          <h2>局后尴尬复盘</h2>
          <p>{{ room.finalSettlement?.reason }}</p>
          <ol>
            <li v-for="rank in room.finalSettlement?.roiRankings ?? []" :key="rank.playerId">
              {{ rank.nickname }} · ROI {{ percent(rank.roi) }}
            </li>
          </ol>
        </section>

        <footer class="bottom-nav">
          <button type="button" :class="{ active: activeTab === 'home' }" @click="activeTab = 'home'">
            <Home :size="20" />
            <span>发癫</span>
          </button>
          <button type="button" :class="{ active: activeTab === 'market' }" @click="activeTab = 'market'">
            <BarChart3 :size="20" />
            <span>心电图</span>
          </button>
          <button type="button" :class="{ active: activeTab === 'holding' }" @click="activeTab = 'holding'">
            <Store :size="20" />
            <span>嘴硬</span>
          </button>
          <button type="button" :class="{ active: activeTab === 'community' }" @click="activeTab = 'community'">
            <MessageCircle :size="20" />
            <span>弹幕</span>
          </button>
          <button type="button" :class="{ active: activeTab === 'mine' }" @click="activeTab = 'mine'">
            <UserRound :size="20" />
            <span>面子</span>
          </button>
        </footer>
      </section>

      <section v-if="errorText" class="error-toast">{{ friendlyErrorText }}</section>
    </section>
  </main>
</template>

<style scoped>
.trade-pickers,
.retail-toolbox {
  display: grid;
  gap: 10px;
  margin: 12px 0;
}

.trade-pickers > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.amount-switch,
.tool-grid,
.warning-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.tool-grid,
.warning-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.amount-switch button,
.tool-grid button,
.warning-grid button {
  min-height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  font-size: 12px;
}

.amount-switch button.active,
.tool-grid button.active,
.warning-grid button.active,
.stock-row.selected {
  border-color: rgba(255, 216, 92, 0.9);
  background: rgba(255, 216, 92, 0.16);
}

.stock-row.selectable {
  cursor: pointer;
}

.stock-row.selectable:focus-visible {
  outline: 2px solid rgba(255, 216, 92, 0.9);
  outline-offset: 2px;
}
</style>
