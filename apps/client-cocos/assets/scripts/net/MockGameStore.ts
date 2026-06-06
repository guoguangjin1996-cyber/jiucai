import type { MockGameState, MockPhase, MockPlayer, MockRole } from "../store/ViewModels";

type Listener = (state: MockGameState) => void;

const basePlayers: MockPlayer[] = [
  { id: "p1", nickname: "韭菜王（你）", isBot: false, roleVisible: "retail", capital: 12345.67, confidence: 68, score: 88, alive: true, suspicion: 12, avatarType: "leek" },
  { id: "p2", nickname: "原来是韭", isBot: false, capital: 10680, confidence: 54, score: 72, alive: true, suspicion: 20, avatarType: "leek" },
  { id: "p3", nickname: "割肉小能手", isBot: false, capital: 9800, confidence: 42, score: 65, alive: true, suspicion: 31, avatarType: "leek" },
  { id: "p4", nickname: "绿油油", isBot: false, capital: 9120, confidence: 39, score: 60, alive: true, suspicion: 45, avatarType: "leek" },
  { id: "p5", nickname: "格局打开", isBot: false, capital: 13210, confidence: 73, score: 79, alive: true, suspicion: 18, avatarType: "leek" },
  { id: "p6", nickname: "Bot-04", isBot: true, capital: 8700, confidence: 48, score: 52, alive: true, suspicion: 34, avatarType: "bot" },
  { id: "p7", nickname: "Bot-06", isBot: true, capital: 8200, confidence: 44, score: 49, alive: true, suspicion: 27, avatarType: "bot" },
  { id: "p8", nickname: "涨停幻想家", isBot: false, capital: 11040, confidence: 61, score: 70, alive: true, suspicion: 38, avatarType: "leek" }
];

const defaultPlayer = basePlayers[0] as MockPlayer;

const createState = (role: MockRole): MockGameState => {
  const players = basePlayers.map((player) => ({ ...player }));
  const first = players[0];
  if (first && role === "institution") {
    players[0] = {
      ...first,
      nickname: "割肉小能手（你）",
      roleVisible: "institution",
      capital: 9876543,
      confidence: 99,
      avatarType: "boss"
    };
  }
  return {
    roomId: "666666",
    day: 2,
    maxDays: 5,
    phase: "AUCTION_FREE",
    countdown: 68,
    role,
    me: players[0] ?? defaultPlayer,
    players,
    market: {
      name: "泡泡叶股份",
      code: "JC-001",
      price: 10.05,
      change: 0.5,
      changePercent: 5.26,
      openStatus: "集合竞价中",
      isLimitUp: false,
      isLimitDown: false,
      boardStrength: 82,
      boardBreakRisk: 41,
      regulationHeat: 76,
      positionLockedReason: "T+1"
    },
    news: {
      title: "盘面公告",
      desc: "异动波动剧烈，成交量突然放大。系统提示：看起来像机会，也可能是饭局。"
    },
    mutation: {
      name: "集合竞价骗炮",
      desc: "开盘前的虚构情绪陷阱正在冒泡，别让局内小心脏乱跳。"
    },
    danmaku: [
      { id: "d1", text: "大佬带带我！冲冲冲！", sentiment: "bullish" },
      { id: "d2", text: "利好像棉花糖，甜但会粘手", sentiment: "bullish" },
      { id: "d3", text: "主力进场了？还是进厨房了？", sentiment: "suspicious" },
      { id: "d4", text: "完了完了，心电图开始摇摆", sentiment: "panic" },
      { id: "d5", text: "我是来学习虚构娱乐模拟的", sentiment: "neutral" }
    ],
    logs: ["09:19 诱多瀑布出现", "09:31 虚构主力露出墨镜", "10:42 小韭菜挠头三连"]
  };
};

let state = createState("retail");
const listeners = new Set<Listener>();

export class MockGameStore {
  static getState(): MockGameState {
    return state;
  }

  static setRole(role: MockRole): void {
    state = createState(role);
    MockGameStore.emit();
  }

  static setPhase(phase: MockPhase): void {
    state = { ...state, phase };
    MockGameStore.emit();
  }

  static subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
  }

  private static emit(): void {
    for (const listener of listeners) listener(state);
  }
}
