import type { MarketPhase } from "./types";

export type LearningMode =
  | "AUCTION_TRAINING"
  | "T_PLUS_ONE_TRAINING"
  | "LIMIT_BOARD_TRAINING"
  | "SECTOR_ROTATION_TRAINING"
  | "POPULARITY_DRAGON_TRAINING"
  | "QUANT_CROWDING_TRAINING"
  | "REGULATION_INQUIRY_TRAINING"
  | "ROI_RANKING_TRAINING";

export interface LearningScenario {
  id: string;
  mode: LearningMode;
  title: string;
  description: string;
  learningGoal: string;
  riskTip: string;
  steps: LearningStep[];
  summary: string;
}

export interface LearningStep {
  id: string;
  phase: MarketPhase;
  title: string;
  instruction: string;
  expectedAction?: string;
  explanationAfterAction: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  inGameMeaning: string;
  riskTip: string;
  example: string;
}

export const LEARNING_MODE_LABELS: Record<LearningMode, string> = {
  AUCTION_TRAINING: "集合竞价训练",
  T_PLUS_ONE_TRAINING: "T+1锁仓训练",
  LIMIT_BOARD_TRAINING: "涨跌停训练",
  SECTOR_ROTATION_TRAINING: "板块轮动训练",
  POPULARITY_DRAGON_TRAINING: "人气龙/领涨龙训练",
  QUANT_CROWDING_TRAINING: "量化拥挤训练",
  REGULATION_INQUIRY_TRAINING: "监管小黑屋训练",
  ROI_RANKING_TRAINING: "收益率排名训练"
};

export const LEARNING_SCENARIOS: LearningScenario[] = [
  {
    id: "auction-fake-order",
    mode: "AUCTION_TRAINING",
    title: "集合竞价骗炮",
    description: "体验 9:20 前可撤单、9:20 后锁单的虚构竞价流程。",
    learningGoal: "理解 9:20 后不可撤单，以及主力假封单撤单带来的风险。",
    riskTip: "集合竞价早期看到的强势盘口，不一定是真实买盘。",
    steps: [
      step("auction-fake-1", "AUCTION_FREE", "9:18 假封板", "观察虚构主力把封单挂到高位。", "watch", "早期盘口仍可撤单，强势外观不等于最终成交。"),
      step("auction-fake-2", "AUCTION_FREE", "9:19 跟单", "选择是否跟随盘口提交买入单。", "FOLLOW_BUY", "跟单会提升拥挤度，也会让你暴露在锁单前的撤单变化里。"),
      step("auction-fake-3", "AUCTION_FREE", "9:19:58 撤单", "观察虚构主力撤掉假封单。", "watch", "撤单发生在锁单前，因此虚构主力的假封单没有留下。"),
      step("auction-fake-4", "AUCTION_LOCKED", "9:20 锁单", "尝试撤回自己的跟单。", "CANCEL_AUCTION_ORDER", "进入锁单后，你的跟单无法撤回。"),
      step("auction-fake-5", "OPEN_PRICE", "高开低走", "查看开盘后的回落。", "watch", "封单消失后，人气和承接不足，开盘表现会被重新定价。")
    ],
    summary: "你看到的封单在 9:20 前被撤走了，但你的跟单在锁单后无法撤回。这就是集合竞价骗炮风险。"
  },
  {
    id: "t-plus-one-lock",
    mode: "T_PLUS_ONE_TRAINING",
    title: "T+1 锁仓",
    description: "体验当日买入后，当日不能卖出的虚构持仓规则。",
    learningGoal: "理解当日买入当日不能卖出。",
    riskTip: "买入后不是想跑就能跑，T+1 会放大追高风险。",
    steps: [
      step("t1-1", "MORNING_TRADING", "第1日追入后排", "买入一只后排高弹性纳音股票。", "BUY_BACK_ROW", "后排弹性高，但承接弱，容易被板块情绪反噬。"),
      step("t1-2", "AFTERNOON_TRADING", "冲高回落", "观察当日涨幅收窄。", "watch", "追高后回落会立刻影响浮动收益率。"),
      step("t1-3", "CLOSING_RUSH", "想跑路", "尝试卖出今日买入的持仓。", "SELL", "系统提示今日仓不可卖出，因为 T+1 尚未解锁。"),
      step("t1-4", "OPEN_PRICE", "第2日低开", "进入下一交易日观察开盘。", "watch", "风险会被带到次日，收益率可能继续回撤。")
    ],
    summary: "你不是判断错一次，而是买入后被 T+1 锁住，无法在当日风险扩大前离场。"
  },
  {
    id: "limit-board-break",
    mode: "LIMIT_BOARD_TRAINING",
    title: "涨停、炸板与跌停排队",
    description: "体验涨停买不到、炸板杀伤和跌停卖出受限的虚构盘面。",
    learningGoal: "理解涨停买不到、炸板杀伤、跌停卖不出的盘面体验。",
    riskTip: "涨停不是安全，跌停不是想卖就能卖。",
    steps: [
      step("limit-1", "OPEN_PRICE", "龙头一字板", "尝试买入虚构龙头。", "BUY_LEADER", "一字涨停会让买入排队，未必能成交。"),
      step("limit-2", "MORNING_TRADING", "后排补涨", "选择是否转向后排。", "BUY_BACK_ROW", "后排补涨来自情绪扩散，也更依赖龙头稳定。"),
      step("limit-3", "AFTERNOON_TRADING", "龙头炸板", "观察龙头从涨停打开。", "watch", "龙头炸板会削弱板块情绪和后排流动性。"),
      step("limit-4", "CLOSING_RUSH", "后排跳水", "尝试处理后排持仓。", "SELL", "若持仓仍被 T+1 锁定，无法在当日处理。")
    ],
    summary: "龙头强势会带动后排，但龙头一旦炸板，后排往往更脆弱。"
  },
  {
    id: "role-structure",
    mode: "SECTOR_ROTATION_TRAINING",
    title: "龙头、中军、后排",
    description: "对比板块内部不同纳音股票角色的盘面含义。",
    learningGoal: "理解板块内部不同股票的盘面角色。",
    riskTip: "龙头代表情绪，中军代表承接，后排代表弹性和风险。",
    steps: [
      step("role-1", "PRE_NEWS", "识别龙头", "查看人气高、带动强的虚构龙头。", "watch", "龙头带动强，但监管和炸板风险更高。"),
      step("role-2", "MORNING_TRADING", "观察中军", "查看走势更稳的中军。", "watch", "中军代表板块承接，能帮助判断板块是否还稳。"),
      step("role-3", "AFTERNOON_TRADING", "识别后排", "查看弹性更高的后排。", "watch", "后排收益率弹性高，但最容易在退潮时被埋。")
    ],
    summary: "龙头看情绪，中军看承接，后排看弹性和风险。"
  },
  {
    id: "popularity-vs-leader",
    mode: "POPULARITY_DRAGON_TRAINING",
    title: "人气龙不等于领涨龙",
    description: "区分弹幕热度、关注度和真实带动能力。",
    learningGoal: "理解人气、弹幕热度和真实带动能力不是同一件事。",
    riskTip: "弹幕最热的票，不一定是最强的票。",
    steps: [
      step("pop-1", "MORNING_TRADING", "A 成为人气龙", "观察弹幕最多的 A 股票。", "watch", "人气龙代表关注度，不自动代表带动能力。"),
      step("pop-2", "MORNING_TRADING", "B 成为领涨龙", "观察涨幅和带动性更强的 B 股票。", "watch", "领涨龙代表板块内实际带动力。"),
      step("pop-3", "AFTERNOON_TRADING", "水军吹 A", "识别弹幕带节奏。", "watch", "弹幕热度可能被虚构主力放大。"),
      step("pop-4", "CLOSING_RUSH", "A 回落 B 延续", "复盘两个标签的差异。", "watch", "关注度和带动性分离时，追热闹容易失真。")
    ],
    summary: "人气龙代表关注度，领涨龙代表真正带动板块上涨的力量。"
  },
  {
    id: "sector-rotation",
    mode: "SECTOR_ROTATION_TRAINING",
    title: "板块轮动与高低切",
    description: "体验主线过热后，资金切向轮动、防守或暗线方向。",
    learningGoal: "理解主线、轮动、防守、退潮之间的关系。",
    riskTip: "主线过热时，资金可能切向轮动或防守方向。",
    steps: [
      step("rotation-1", "PRE_NEWS", "火系主升", "观察火系板块连续升温。", "watch", "主线升温会吸引关注，也会积累风险。"),
      step("rotation-2", "MORNING_TRADING", "后排过热", "查看后排拥挤度。", "watch", "后排过热会提高量化和退潮风险。"),
      step("rotation-3", "AFTERNOON_TRADING", "火系退潮", "观察主线热度回落。", "watch", "主线不是一直涨，过热后可能降温。"),
      step("rotation-4", "CLOSING_RUSH", "防守与暗线启动", "观察土系防守和水系暗线。", "watch", "资金可能切向低位轮动或防守方向。")
    ],
    summary: "板块不是一直涨，主线过热后，资金可能切到低位轮动或防守方向。"
  },
  {
    id: "quant-crowding",
    mode: "QUANT_CROWDING_TRAINING",
    title: "量化拥挤收割",
    description: "体验多人同向交易导致 T+1 拥挤和量化警报抬升。",
    learningGoal: "理解人太多的交易方向更容易被量化盯上。",
    riskTip: "买得太整齐，不一定安全，可能变成量化目标。",
    steps: [
      step("quant-1", "MORNING_TRADING", "同日同向买入", "多个玩家买入同一只后排票。", "BUY_CROWDED", "同向交易会抬升拥挤度。"),
      step("quant-2", "AFTERNOON_TRADING", "T+1 拥挤上升", "查看 T+1 拥挤标签。", "watch", "大量当日仓不能卖，会形成明显脆弱点。"),
      step("quant-3", "CLOSING_RUSH", "量化锁定", "观察量化警报。", "watch", "量化更偏向拥挤、低流动性、T+1 锁仓严重的股票。"),
      step("quant-4", "CLOSING_RUSH", "尾盘抽流动性", "查看后排跳水。", "watch", "流动性下降时，后排更容易快速回落。")
    ],
    summary: "量化不是随机攻击，它更倾向于拥挤、低流动性、T+1 锁仓严重的股票。"
  },
  {
    id: "regulation-black-room",
    mode: "REGULATION_INQUIRY_TRAINING",
    title: "监管小黑屋",
    description: "体验异常波动与过热弹幕触发监管问询的虚构流程。",
    learningGoal: "理解异常波动、连续涨停、虚假封单、炸板等行为可能触发监管关注。",
    riskTip: "盘面越抽象，监管热度越高。",
    steps: [
      step("reg-1", "OPEN_PRICE", "连续涨停", "观察龙头连续高热。", "watch", "连续强势会提高监管热度。"),
      step("reg-2", "AUCTION_FREE", "虚假封单撤单", "观察假封单撤走。", "watch", "虚假封单撤单会增加异常波动叙事。"),
      step("reg-3", "AFTERNOON_TRADING", "龙头炸板", "观察炸板和弹幕过热。", "watch", "炸板叠加弹幕过热，会继续推高监管热度。"),
      step("reg-4", "REGULATION_INQUIRY", "进入问询", "查看小黑屋问询。", "RESPOND_INQUIRY", "问询会影响后续节奏和资源。")
    ],
    summary: "过热盘面不只是机会，也可能触发监管问询，影响后续交易节奏。"
  },
  {
    id: "roi-ranking",
    mode: "ROI_RANKING_TRAINING",
    title: "为什么收益率比绝对收益更重要",
    description: "用主力和韭菜不同本金体量，理解 ROI 排名公平性。",
    learningGoal: "理解主力资金更大，韭菜资金更小，因此用 ROI 排名更公平。",
    riskTip: "赚得多不一定排名高，资金效率才是关键。",
    steps: [
      step("roi-1", "DAY_RECAP", "主力 +10%", "查看主力从 1000 到 1100。", "watch", "主力绝对增加 100，本局 ROI 为 +10%。"),
      step("roi-2", "DAY_RECAP", "韭菜 +35%", "查看韭菜从 100 到 135。", "watch", "韭菜绝对增加 35，但 ROI 为 +35%。"),
      step("roi-3", "DAY_RESULT", "排名对比", "查看最终 ROI 榜。", "watch", "本局按收益率排名，而不是按绝对资金排名。")
    ],
    summary: "本游戏不是比谁资金大，而是比谁在自己的资金体量下做出了更高收益率。"
  }
];

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  glossary("auction", "集合竞价", "开盘前的虚构集中报价阶段，玩家可以提交竞价动作。", "早期强势盘口可能在锁单前变化。", "你看到高位封单后跟单，但封单在锁单前撤走。"),
  glossary("auction-lock", "9:20 锁单", "集合竞价进入不可撤阶段，已提交的有效订单被锁定。", "锁单后无法用撤单修正追随动作。", "你 9:19 跟单，9:20 后尝试撤回失败。"),
  glossary("t-plus-one", "T+1", "今日买入的持仓，当日不能卖出，次日才可处理。", "追高后遇到跳水时，不能当日跑路。", "你第2日买入后排票，第2日尾盘跳水，但只能第3日再处理。"),
  glossary("limit-up", "涨停", "虚构股票达到当日上限后，买入可能排队。", "涨停强势不代表一定买得到。", "龙头一字板时，你的买入只能排在队列里。"),
  glossary("limit-down", "跌停", "虚构股票达到当日下限后，卖出可能排队。", "跌停时不是想卖就能卖。", "后排跳水触及跌停，你的卖出动作没有立刻成交。"),
  glossary("board-break", "炸板", "涨停状态被打开，强势封板被破坏。", "炸板会快速削弱情绪和后排流动性。", "龙头炸板后，后排补涨票同步跳水。"),
  glossary("re-seal", "回封", "炸板后重新封回涨停的虚构盘面。", "回封失败会让情绪更脆。", "龙头打开后短暂回封，尾盘又被打开。"),
  glossary("leader", "龙头", "板块内人气高、带动强的虚构股票角色。", "带动强，也更容易触发炸板和监管关注。", "火系龙头冲高会带动火系后排。"),
  glossary("center-force", "中军", "板块内承接更稳、流动性更好的虚构股票角色。", "中军跳水常意味着板块承接变差。", "中军回落时，后排更容易失去支撑。"),
  glossary("back-row", "后排", "板块内弹性高但承接较弱的虚构股票角色。", "后排最容易在退潮或炸板时被埋。", "龙头炸板后，后排先跳水。"),
  glossary("popularity-dragon", "人气龙", "关注度、弹幕热度最高的虚构股票。", "热度高不等于带动性强。", "A 弹幕最多，但 B 才真正带动板块。"),
  glossary("leading-dragon", "领涨龙", "涨幅和带动性更强的虚构股票。", "领涨变化时，原人气焦点可能失真。", "B 涨幅更强并带动同板块，成为领涨龙。"),
  glossary("danmaku-dragon", "弹幕龙", "弹幕讨论最集中的虚构股票。", "弹幕可能被情绪或虚构主力放大。", "弹幕一直刷 A，但 A 午后回落。"),
  glossary("quant-watch", "量化盯上", "系统量化机构对拥挤、低流动性目标提高关注。", "买得太整齐会暴露脆弱点。", "多人同日买入后排，量化警报升高。"),
  glossary("t1-crowding", "T+1拥挤", "大量当日买入仓位被 T+1 锁住形成拥挤。", "拥挤仓位无法当日撤离，会放大跳水风险。", "尾盘跳水时，多数持有人都卖不了。"),
  glossary("reg-watch", "监管关注", "虚构监管热度升高，可能触发问询。", "过热盘面会改变后续节奏。", "连续涨停、假封单、炸板叠加后进入问询。"),
  glossary("roi", "ROI收益率", "最终资金相对初始资金的比例变化。", "绝对资金多不代表排名更高。", "主力 +100 是 +10%，韭菜 +35 是 +35%。")
];

export function getLearningScenario(id: string): LearningScenario | undefined {
  return LEARNING_SCENARIOS.find((scenario) => scenario.id === id);
}

export function getGlossaryTerm(id: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((term) => term.id === id);
}

function step(
  id: string,
  phase: MarketPhase,
  title: string,
  instruction: string,
  expectedAction: string,
  explanationAfterAction: string
): LearningStep {
  return {
    id,
    phase,
    title,
    instruction,
    expectedAction,
    explanationAfterAction
  };
}

function glossary(id: string, term: string, inGameMeaning: string, riskTip: string, example: string): GlossaryTerm {
  return {
    id,
    term,
    inGameMeaning,
    riskTip,
    example
  };
}
